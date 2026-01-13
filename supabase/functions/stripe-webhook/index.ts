import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper logging function for debugging
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Stripe coupon ID for referrals - flat 10% for both referrer and referred
const REFERRAL_COUPON_10_PERCENT = "qLrjIGkn";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    logStep("Environment variables verified");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    // Get the raw body
    const body = await req.text();

    // Verify and construct the event
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      /**
       * This event is triggered when a checkout session is completed.
       *
       * Functions (in order of execution):
       * 1. Get the subscription information from the webhook data
       * 2. CHECK TRIAL ABUSE: Verify payment fingerprint hasn't been used before
       * 3. If abuse detected: Cancel subscription, reset to free, mark has_consumed_trial
       * 4. If no abuse: Store fingerprint, mark has_consumed_trial, generate referral code
       * 5. Update the users profile with the subscription info and referral code.
       * 6. Create a referral intent record (if the user was referred)
       * 
       * NOTE: Trial users get a referral code but it's NOT active until trial ends.
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          logStep("Event already processed, skipping", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Get the user ID from metadata or client_reference_id
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) {
          logStep("No user ID found in session", { session });
          break;
        }

        // Check if this was a trial checkout
        const isTrial = session.metadata?.is_trial === "true";
        logStep("Checkout metadata", { userId, isTrial });

        // Check for referral info in session metadata
        const referrerUserId = session.metadata?.referrer_user_id;
        const referralCodeUsed = session.metadata?.referral_code_used;

        // Update the customers metadata to show they were referred
        try {
          await stripe.customers.update(session.customer as string, {
            metadata: {
              referred_by: referrerUserId,
              referral_code_used: referralCodeUsed,
            },
          });
        } catch (error) {
          logStep("Error updating customer metadata", { error: error });
        }

        // Get the subscription details
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          logStep("Subscription retrieved", {
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.items.data?.[0]?.current_period_end,
          });

          // =============================================
          // TRIAL ABUSE DETECTION
          // Only check if this is a trial subscription
          // =============================================
          let trialAbuseDetected = false;
          let abuseReason = "";

          if (isTrial && subscription.status === "trialing") {
            logStep("Trial subscription detected, checking for abuse");

            // Get the payment method used for this subscription
            const paymentMethodId = subscription.default_payment_method as string;
            
            if (paymentMethodId) {
              try {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
                logStep("Payment method retrieved", { 
                  type: paymentMethod.type,
                  id: paymentMethod.id,
                });

                let fingerprint: string | null = null;
                let fingerprintType: "card" | "link" | null = null;

                // Extract fingerprint based on payment method type
                if (paymentMethod.type === "card" && paymentMethod.card?.fingerprint) {
                  fingerprint = paymentMethod.card.fingerprint;
                  fingerprintType = "card";
                  logStep("Card fingerprint extracted", { fingerprint });
                } else if (paymentMethod.type === "link" && paymentMethod.link?.email) {
                  // For Link payments, use the email as the fingerprint
                  fingerprint = paymentMethod.link.email;
                  fingerprintType = "link";
                  logStep("Link email fingerprint extracted", { fingerprint });
                }

                if (fingerprint && fingerprintType) {
                  // Check if this fingerprint has been used before (by any user)
                  const { data: existingFingerprint } = await supabaseAdmin
                    .from("payment_fingerprints")
                    .select("id, user_id, first_used_at")
                    .eq("fingerprint", fingerprint)
                    .maybeSingle();

                  if (existingFingerprint) {
                    // Fingerprint exists - this is trial abuse!
                    trialAbuseDetected = true;
                    abuseReason = `Payment method was previously used for a trial by user ${existingFingerprint.user_id} on ${existingFingerprint.first_used_at}`;
                    logStep("TRIAL ABUSE DETECTED - Fingerprint already used", {
                      fingerprint,
                      previousUserId: existingFingerprint.user_id,
                      firstUsedAt: existingFingerprint.first_used_at,
                    });
                  } else {
                    // Also check if user has already consumed a trial (belt and suspenders)
                    const { data: userProfile } = await supabaseAdmin
                      .from("profiles")
                      .select("has_consumed_trial")
                      .eq("id", userId)
                      .single();

                    if (userProfile?.has_consumed_trial) {
                      trialAbuseDetected = true;
                      abuseReason = "User has already consumed their free trial";
                      logStep("TRIAL ABUSE DETECTED - User already consumed trial", { userId });
                    } else {
                      // No abuse - store the fingerprint for future checks
                      const { error: fingerprintError } = await supabaseAdmin
                        .from("payment_fingerprints")
                        .insert({
                          fingerprint,
                          fingerprint_type: fingerprintType,
                          user_id: userId,
                        });

                      if (fingerprintError) {
                        // Could be a race condition - another request inserted first
                        if (fingerprintError.code === "23505") { // Unique constraint violation
                          trialAbuseDetected = true;
                          abuseReason = "Payment fingerprint was just registered by another request";
                          logStep("TRIAL ABUSE DETECTED - Race condition on fingerprint insert", {
                            fingerprint,
                            error: fingerprintError,
                          });
                        } else {
                          logStep("Error inserting fingerprint, allowing trial anyway", { 
                            error: fingerprintError 
                          });
                        }
                      } else {
                        logStep("Fingerprint stored successfully", { fingerprint, fingerprintType });
                      }
                    }
                  }
                } else {
                  // Could not extract fingerprint - deny trial to be safe
                  // This handles edge cases where payment method data is incomplete
                  trialAbuseDetected = true;
                  abuseReason = "Could not extract payment fingerprint - trial denied for safety";
                  logStep("TRIAL DENIED - No fingerprint available", { 
                    paymentMethodType: paymentMethod.type 
                  });
                }
              } catch (pmError) {
                // Payment method retrieval failed - deny trial to be safe
                trialAbuseDetected = true;
                abuseReason = "Failed to retrieve payment method - trial denied for safety";
                logStep("TRIAL DENIED - Payment method retrieval failed", { error: pmError });
              }
            } else {
              // No default payment method on subscription - this shouldn't happen for trials
              // but handle it anyway by denying trial
              logStep("No payment method on trial subscription - checking setup intent");
              
              // For some checkout configurations, payment method might be on the setup intent
              // Default to denying trial if we can't verify the payment method
              trialAbuseDetected = true;
              abuseReason = "No payment method found on subscription - trial denied for safety";
            }

            // =============================================
            // HANDLE TRIAL ABUSE
            // Cancel subscription immediately and reset user to free
            // =============================================
            if (trialAbuseDetected) {
              logStep("Handling trial abuse - cancelling subscription", { 
                subscriptionId: subscription.id,
                reason: abuseReason,
              });

              try {
                // Cancel the subscription immediately
                await stripe.subscriptions.cancel(subscription.id, {
                  prorate: true,
                });
                logStep("Trial subscription cancelled due to abuse");

                // Update user profile to free and mark trial as consumed
                await supabaseAdmin
                  .from("profiles")
                  .update({
                    subscription_status: "free",
                    subscription_plan: "free",
                    subscription_id: null,
                    subscription_current_period_end: null,
                    access_expires_at: null,
                    has_consumed_trial: true, // Mark so they can still subscribe (without trial)
                    referral_code_active: false,
                  })
                  .eq("id", userId);

                logStep("User reset to free due to trial abuse", { userId, reason: abuseReason });

                // We're done - don't continue with normal checkout processing
                await insertProcessedEvent(supabaseAdmin, event.id, event.type);
                return new Response(JSON.stringify({ 
                  received: true, 
                  trialAbuse: true,
                  reason: abuseReason,
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                });
              } catch (cancelError) {
                logStep("Error cancelling abusive trial subscription", { error: cancelError });
                // Continue anyway - better to have the profile updated than leave in bad state
              }
            }
          }

          // =============================================
          // NORMAL CHECKOUT PROCESSING (no abuse detected)
          // =============================================
          const priceId = subscription.items.data[0]?.price.id;

          // Determine the plan based on price ID
          let subscriptionPlan = "premium-monthly";
          if (priceId === "price_1RaBqI3J81eQle64GF6WYMfm") {
            subscriptionPlan = "premium-yearly";
          }

          // Check if this is a trial subscription
          const isTrialing = subscription.status === "trialing";
          logStep("Subscription status check", { isTrialing, status: subscription.status });

          // Safely parse the current period end date
          let currentPeriodEndDate: string | null = null;
          const periodEnd = subscription.items.data?.[0]?.current_period_end;

          if (periodEnd && typeof periodEnd === "number" && periodEnd > 0) {
            currentPeriodEndDate = new Date(periodEnd * 1000).toISOString();
          } else {
            logStep("Invalid period end value (checkout.session.completed), setting to null");
          }

          // Generate a referral code for new premium user
          let referralCode: string | null = null;
          let attempts = 0;
          const maxAttempts = 5;

          while (!referralCode && attempts < maxAttempts) {
            const candidate = generateReferralCode();
            const { data: existing } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .ilike("referral_code", candidate)
              .maybeSingle();

            if (!existing) {
              referralCode = candidate;
            }
            attempts++;
          }
          logStep("Generated referral code", { referralCode, attempts });

          // Update profile records
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("referral_code")
            .eq("id", userId)
            .single();

          // Trial users get a referral code but it's NOT active until trial ends
          // This prevents trial users from referring others
          // IMPORTANT: Mark has_consumed_trial = true if this was a trial checkout
          // Do NOT set has_consumed_trial to false for non-trial checkouts (it may already be true from abuse detection)
          const updateData: Record<string, unknown> = {
            stripe_customer_id: session.customer as string,
            subscription_id: subscription.id,
            subscription_status: subscription.status, // Will be "trialing" for trials
            subscription_plan: subscriptionPlan,
            subscription_current_period_end: currentPeriodEndDate,
            access_expires_at: null,
            referral_code_active: !isTrialing, // Inactive during trial
          };

          // Only set has_consumed_trial to true if this was a trial
          // Never set it to false - it should only be marked true, never unmarked
          if (isTrialing) {
            updateData.has_consumed_trial = true;
          }

          if (!existingProfile?.referral_code) {
            updateData.referral_code = referralCode;
            updateData.referral_code_updated_at = new Date().toISOString();
          }

          const { error: updateError } = await supabaseAdmin.from("profiles").update(updateData).eq("id", userId);

          if (updateError) {
            logStep("Error updating profile", { error: updateError });
          } else {
            logStep("Profile updated successfully", {
              userId,
              isTrialing,
              referralCodeActive: !isTrialing,
              referralCode: updateData.referral_code ?? existingProfile?.referral_code,
              hasConsumedTrial: updateData.has_consumed_trial,
            });
          }

          // Create referral record if this was a referred subscription
          // Note: We do NOT mark as converted yet - that happens on first PAID invoice (not trial $0 invoice)
          if (referrerUserId && referralCodeUsed) {
            logStep("Creating referral record", { referrerUserId, userId, referralCodeUsed });

            const { error: referralError } = await supabaseAdmin.from("referrals").upsert(
              {
                referrer_user_id: referrerUserId,
                referred_user_id: userId,
                referral_code_used: referralCodeUsed,
                converted: false,
              },
              {
                onConflict: "referred_user_id",
                ignoreDuplicates: true,
              },
            );

            if (referralError) {
              logStep("Error creating referral record", { error: referralError });
            } else {
              logStep("Referral record created successfully");
            }
          }

          // Send trial confirmation email if this is a trial subscription
          // This is required by Visa's 2020 free trial subscription requirements
          if (isTrialing) {
            try {
              const trialEndDate = currentPeriodEndDate;
              const firstBillingDate = currentPeriodEndDate; // Same as trial end date

              logStep("Sending trial confirmation email", { userId, trialEndDate });

              const emailResponse = await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({
                    type: "trial_confirmation",
                    userId,
                    plan: subscriptionPlan === "premium-yearly" ? "yearly" : "monthly",
                    trialEndDate,
                    firstBillingDate,
                  }),
                },
              );

              const emailResult = await emailResponse.json();
              if (emailResponse.ok && emailResult.success) {
                logStep("Trial confirmation email sent successfully", { emailId: emailResult.emailId });
              } else {
                logStep("Failed to send trial confirmation email", { error: emailResult.error });
              }
            } catch (emailError) {
              logStep("Error sending trial confirmation email", { error: emailError });
              // Don't fail the webhook if email fails - subscription is already created
            }
          }
        }
        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * This event is triggered when a checkout session is expired.
       *
       * Functions (in order of execution):
       * 1. Get the user by stripe_customer_id
       * 2. Update the users profile to show the user was not referred
       */
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session expired", { sessionId: session.id });

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          logStep("Event already processed, skipping", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Find the user by stripe_customer_id
        const { data: profiles, error: findError } = await supabaseAdmin
          .from("profiles")
          .select("id, has_paid_first_invoice")
          .eq("stripe_customer_id", session.customer as string)
          .limit(1);

        if (findError || !profiles?.length) {
          logStep("Could not find user for expired session", { customerId: session.customer });
          break;
        }

        const userId = profiles[0].id;

        // Update the profile to show the user was not referred
        if (!profiles[0].has_paid_first_invoice) {
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              referred_user: false,
            })
            .eq("id", userId);

          if (updateError) {
            logStep("Error updating profile", { error: updateError });
          } else {
            logStep("Profile updated successfully", { userId });
          }
        }
        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * This event is triggered when a subscription is updated (e.g. cancelled, trial ends, downgraded, etc.).
       *
       * Functions (in order of execution):
       * 1. Get the subscription information from the webhook data
       * 2. Update the users profile with the subscription info
       * 
       * IMPORTANT: This handles trial-to-active transitions when trial ends successfully.
       * When status changes from "trialing" to "active", we activate the referral code.
       */
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          logStep("Event already processed, skipping", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Check if this is a new manual cancellation (cancel_at_period_end just became true)
        // We need to check the previous_attributes to see if this is a new cancellation
        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        const wasNotCancellingBefore = previousAttributes?.cancel_at_period_end === false;
        const isNowCancelling = subscription.cancel_at_period_end === true;
        const isManualCancellation = wasNotCancellingBefore && isNowCancelling;
        
        logStep("Manual cancellation check", { 
          wasNotCancellingBefore, 
          isNowCancelling, 
          isManualCancellation,
          previousCancelAtPeriodEnd: previousAttributes?.cancel_at_period_end,
        });

        // Find the user by stripe_customer_id
        const { data: profiles, error: findError } = await supabaseAdmin
          .from("profiles")
          .select("id, referral_code, subscription_status")
          .eq("stripe_customer_id", subscription.customer as string)
          .limit(1);

        if (findError || !profiles?.length) {
          logStep("Could not find user for subscription", { customerId: subscription.customer });
          break;
        }

        const userId = profiles[0].id;
        const previousStatus = profiles[0].subscription_status;
        const priceId = subscription.items.data[0]?.price.id;

        // Determine the plan
        let subscriptionPlan = "premium-monthly";
        if (priceId === "price_1RaBqI3J81eQle64GF6WYMfm") {
          subscriptionPlan = "premium-yearly";
        }

        // Safely parse dates
        let currentPeriodEndDate: string | null = null;
        const periodEnd = subscription.items.data?.[0]?.current_period_end;

        if (periodEnd && typeof periodEnd === "number" && periodEnd > 0) {
          currentPeriodEndDate = new Date(periodEnd * 1000).toISOString();
        } else {
          logStep("Invalid period end value (customer.subscription.updated), setting to null");
        }

        // Determine referral code active status and access expiry
        let accessExpiresAt: string | null = null;
        let referralCodeActive: boolean;

        // Check if this is a trialing subscription
        const isTrialing = subscription.status === "trialing";
        
        // Check if subscription is being cancelled
        const isCancelling = subscription.cancel_at_period_end || 
                             subscription.status === "canceled" || 
                             subscription.cancel_at;

        if (isCancelling) {
          // Subscription is being cancelled
          if (subscription.cancel_at) {
            accessExpiresAt = new Date(subscription.cancel_at * 1000).toISOString();
          } else {
            accessExpiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          }
          referralCodeActive = false;
          logStep("Subscription cancelled/downgraded, deactivating referral code", { userId });
        } else if (isTrialing) {
          // Still trialing - keep referral code inactive
          referralCodeActive = false;
          logStep("Subscription is trialing, keeping referral code inactive", { userId });
        } else if (subscription.status === "active" && profiles[0].referral_code) {
          // Subscription is active (not trialing, not cancelled)
          // This handles trial-to-active transition
          referralCodeActive = true;
          if (previousStatus === "trialing") {
            logStep("Trial ended, subscription now active - activating referral code", { userId });
          } else {
            logStep("Subscription active, ensuring referral code is active", { userId });
          }
        } else {
          // Default: inactive
          referralCodeActive = false;
        }

        // Update the profile
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: subscription.cancel_at_period_end ? "cancelled" : subscription.status,
            subscription_plan: subscriptionPlan,
            subscription_current_period_end: currentPeriodEndDate,
            access_expires_at: accessExpiresAt,
            referral_code_active: referralCodeActive,
          })
          .eq("id", userId);

        if (updateError) {
          logStep("Error updating profile", { error: updateError });
        } else {
          logStep("Profile updated successfully", { 
            userId, 
            status: subscription.status,
            referralCodeActive,
          });
        }

        // Send manual cancellation email if this is a new manual cancellation
        if (isManualCancellation) {
          try {
            logStep("Sending manual cancellation email", { userId, accessExpiresAt });

            const emailResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ type: "manual_cancellation", userId, accessExpiresAt }),
              },
            );

            const emailResult = await emailResponse.json();
            if (emailResponse.ok && emailResult.success) {
              logStep("Manual cancellation email sent successfully", { emailId: emailResult.emailId });
            } else {
              logStep("Failed to send manual cancellation email", { error: emailResult.error });
            }
          } catch (emailError) {
            logStep("Error sending manual cancellation email", { error: emailError });
            // Don't fail the webhook if email fails
          }
        }

        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * This event is triggered when a subscription is deleted (e.g. cancelled and not reactivated).
       *
       * Functions (in order of execution):
       * 1. Get the subscription information from the webhook data
       * 2. Update the users profile to show the user is no longer a premium user
       */
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          logStep("Event already processed, skipping", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        const { data: profiles, error: findError } = await supabaseAdmin
          .from("profiles")
          .select("id, subscription_status")
          .eq("stripe_customer_id", subscription.customer as string)
          .limit(1);

        if (findError || !profiles?.length) {
          logStep("Could not find user for subscription", { customerId: subscription.customer });
          return new Response(JSON.stringify({ error: "Could not find user for subscription" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }

        const userId = profiles[0].id;
        const previousStatus = profiles[0].subscription_status;
        
        // Determine if this was a forced cancellation (from past_due due to failed payments)
        // vs a manual cancellation that reached end of period
        const wasForcedCancellation = previousStatus === "past_due";
        logStep("Cancellation type check", { previousStatus, wasForcedCancellation });

        // Reset the profile to free plan, deactivate referral code
        // Note: has_consumed_trial stays true - they used their trial
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "free",
            subscription_plan: "free",
            subscription_id: null,
            subscription_current_period_end: null,
            access_expires_at: null,
            referral_code_active: false, // Deactivate but keep the code
          })
          .eq("id", userId);

        if (updateError) {
          logStep("Error updating profile", { error: updateError });
        } else {
          logStep("Profile reset to free, referral code deactivated", { userId });
        }

        // Send forced cancellation email if this was due to failed payments
        if (wasForcedCancellation) {
          try {
            logStep("Sending forced cancellation email", { userId });

            const emailResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ type: "forced_cancellation", userId }),
              },
            );

            const emailResult = await emailResponse.json();
            if (emailResponse.ok && emailResult.success) {
              logStep("Forced cancellation email sent successfully", { emailId: emailResult.emailId });
            } else {
              logStep("Failed to send forced cancellation email", { error: emailResult.error });
            }
          } catch (emailError) {
            logStep("Error sending forced cancellation email", { error: emailError });
            // Don't fail the webhook if email fails
          }
        }

        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * This event is triggered when a payment is successful.
       *
       * Functions (in order of execution):
       * 1. Get the subscription information from the webhook data
       * 2. Update the users profile with the subscription info
       * 3. Convert the inactive referral intent to an active referral
       * 4. Grant the 10% discount to the referring user (simple model: one referral = one 10% discount)
       * 
       * IMPORTANT: Trial invoices have amount_paid = 0. We must:
       * - NOT update has_paid_first_invoice for $0 trial invoices
       * - NOT convert referrals for $0 trial invoices
       * - Referral conversion only happens when a REAL payment is made
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const amountPaid = invoice.amount_paid ?? 0;
        
        logStep("Invoice payment succeeded", { 
          invoiceId: invoice.id, 
          billingReason: invoice.billing_reason,
          amountPaid,
          isTrialInvoice: amountPaid === 0,
        });

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          logStep("Event already processed, skipping", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        const lineItem = invoice.lines.data?.[0];
        const invoiceSubscriptionItem =
          lineItem?.parent?.subscription_item_details?.subscription ?? invoice.subscription;

        if (invoiceSubscriptionItem) {
          // Refresh the subscription data
          const subscription = await stripe.subscriptions.retrieve(invoiceSubscriptionItem as string);
          const isTrialing = subscription.status === "trialing";

          // Find the user by stripe_customer_id
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, referred_user, has_paid_first_invoice")
            .eq("stripe_customer_id", invoice.customer as string)
            .limit(1);

          if (profiles?.length) {
            const userId = profiles[0].id;
            const priceId = subscription.items.data[0]?.price.id;
            let subscriptionPlan = "premium-monthly";
            if (priceId === "price_1RaBqI3J81eQle64GF6WYMfm") {
              subscriptionPlan = "premium-yearly";
            }

            // Safely parse the current period end date
            let currentPeriodEndDate: string | null = null;
            const periodEnd = subscription.items.data?.[0]?.current_period_end;

            if (periodEnd && typeof periodEnd === "number" && periodEnd > 0) {
              currentPeriodEndDate = new Date(periodEnd * 1000).toISOString();
            } else {
              logStep("Invalid period end value (invoice.payment_succeeded), setting to null");
            }

            // =============================================
            // TRIAL INVOICE HANDLING
            // For $0 trial invoices, we:
            // - Update subscription status to "trialing"
            // - Do NOT update has_paid_first_invoice
            // - Do NOT activate referral code (trial users can't refer)
            // =============================================
            if (amountPaid === 0 && isTrialing) {
              logStep("Trial invoice ($0), updating status but NOT marking as paid", { userId });
              
              await supabaseAdmin
                .from("profiles")
                .update({
                  subscription_status: "trialing",
                  subscription_plan: subscriptionPlan,
                  subscription_current_period_end: currentPeriodEndDate,
                  access_expires_at: null,
                  referral_code_active: false, // Trial users cannot refer others
                  // Note: has_paid_first_invoice remains unchanged (should stay false)
                })
                .eq("id", userId);

              logStep("Profile updated for trial subscription", { userId, isTrialing: true });
            } else {
              // =============================================
              // REAL PAYMENT (non-$0 invoice)
              // - Update to active status
              // - Mark has_paid_first_invoice = true
              // - Activate referral code
              // - Process referral conversion if applicable
              // =============================================
              logStep("Real payment received, updating profile fully", { userId, amountPaid });

              await supabaseAdmin
                .from("profiles")
                .update({
                  subscription_status: "active",
                  subscription_plan: subscriptionPlan,
                  subscription_current_period_end: currentPeriodEndDate,
                  access_expires_at: null,
                  referral_code_active: true, // Now they can refer others
                  has_paid_first_invoice: true,
                })
                .eq("id", userId);

              logStep("Profile updated after real payment", { userId });

              // =============================================
              // REFERRAL CONVERSION LOGIC (SIMPLIFIED MODEL)
              // One referral = flat 10% discount for referrer
              // Only on FIRST successful PAID invoice (not trial $0 invoices)
              // billing_reason can be "subscription_create" (first after trial ends) 
              // or "subscription_cycle" (renewal)
              // We check has_paid_first_invoice to determine if this is truly the first payment
              // =============================================
              if (!profiles[0].has_paid_first_invoice) {
                logStep("First PAID invoice, checking for referral conversion", { userId });

                // Find unconverted referral for this user
                const { data: referral } = await supabaseAdmin
                  .from("referrals")
                  .select("id, referrer_user_id, converted")
                  .eq("referred_user_id", userId)
                  .eq("converted", false)
                  .maybeSingle();

                if (referral) {
                  logStep("Found unconverted referral, processing conversion", {
                    referralId: referral.id,
                    referrerId: referral.referrer_user_id,
                  });

                  // Check if referrer can receive a reward
                  // Simple model: if subscription has no discount, they can receive one
                  const canReceiveReward = await checkReferrerCanReceiveReward(
                    stripe,
                    supabaseAdmin,
                    referral.referrer_user_id,
                  );

                  // Mark referral as converted (idempotency via unique constraint)
                  const { error: convertError } = await supabaseAdmin
                    .from("referrals")
                    .update({
                      converted: true,
                      converted_at: new Date().toISOString(),
                    })
                    .eq("id", referral.id)
                    .eq("converted", false); // Only update if not already converted

                  if (convertError) {
                    logStep("Error marking referral as converted", { error: convertError });
                  } else {
                    logStep("Referral marked as converted");

                    // Only apply discount if referrer hasn't already received one this period
                    if (canReceiveReward) {
                      // Create referral reward record (10% flat discount)
                      const { error: rewardError } = await supabaseAdmin.from("referral_rewards").insert({
                        user_id: referral.referrer_user_id,
                        percent: 10,
                        applied: false,
                        stripe_coupon_id: REFERRAL_COUPON_10_PERCENT,
                        source_referral_id: referral.id,
                      });

                      if (rewardError) {
                        // Could be duplicate, which is fine (idempotency)
                        logStep("Error or duplicate creating referral reward", { error: rewardError });
                      } else {
                        logStep("Referral reward created for referrer", {
                          referrerId: referral.referrer_user_id,
                          percent: 10,
                        });
                      }

                      // Apply 10% coupon to referrer's subscription
                      await applyReferrerDiscount(
                        stripe,
                        supabaseAdmin,
                        referral.referrer_user_id,
                        REFERRAL_COUPON_10_PERCENT,
                      );
                    } else {
                      logStep("Referrer already received a reward this billing period, skipping discount", {
                        referrerId: referral.referrer_user_id,
                      });
                    }
                  }
                } else {
                  // No unconverted referral found - check if user was supposed to be referred
                  // This is a RACE CONDITION SAFEGUARD: if referred_user is true but no referral row exists,
                  // it means checkout.session.completed hasn't created the referral row yet.
                  // Return 500 to force Stripe to retry.
                  if (profiles[0].referred_user) {
                    logStep("ERROR: No unconverted referral found but user is marked as referred - forcing retry", {
                      userId,
                    });
                    return new Response(JSON.stringify({ error: "Referral row not yet created, retry required" }), {
                      status: 500,
                      headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                  } else {
                    logStep("User was not referred, skipping referral conversion", { userId });
                  }
                }
              }
            }
          } else {
            logStep("No profile found for referred user, possibly race condition - forcing retry");
            return new Response(
              JSON.stringify({ error: "No profile found for referred user, possibly race condition" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }
        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * This event is triggered when a payment fails.
       *
       * Functions (in order of execution):
       * 1. Get the subscription information from the webhook data
       * 2. Update the users profile to show the user is past due
       *
       * A separate lambda function is scheduled on a cron job to revoke access to expired users.
       */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id });

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          logStep("Event already processed, skipping", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        if (invoice.subscription) {
          // Find the user by stripe_customer_id
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, subscription_status")
            .eq("stripe_customer_id", invoice.customer as string)
            .limit(1);

          if (profiles?.length) {
            const userId = profiles[0].id;
            const previousStatus = profiles[0].subscription_status;

            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "past_due",
              })
              .eq("id", userId);

            logStep("Profile updated to past_due", { userId });

            // Send payment failed email if transitioning to past_due for the first time
            if (previousStatus !== "past_due") {
              try {
                logStep("Sending payment failed email", { userId });

                const emailResponse = await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    },
                    body: JSON.stringify({ type: "payment_failed", userId }),
                  },
                );

                const emailResult = await emailResponse.json();
                if (emailResponse.ok && emailResult.success) {
                  logStep("Payment failed email sent successfully", { emailId: emailResult.emailId });
                } else {
                  logStep("Failed to send payment failed email", { error: emailResult.error });
                }
              } catch (emailError) {
                logStep("Error sending payment failed email", { error: emailError });
                // Don't fail the webhook if email fails
              }
            }
          }
        }
        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Generates a random referral code (8 alphanumeric characters)
 */
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Checks if the referrer can receive a reward
 * Simple model: if the referrer's subscription has no discount attached, they can receive a reward.
 * Stripe automatically removes one-time use coupons when a billing cycle renews.
 */
async function checkReferrerCanReceiveReward(
  stripe: Stripe,
  supabaseAdmin: any,
  referrerUserId: string,
): Promise<boolean> {
  try {
    // Get referrer's subscription ID from database
    const { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_id")
      .eq("id", referrerUserId)
      .single();

    if (!referrerProfile?.subscription_id) {
      logStep("Referrer has no active subscription", { referrerUserId });
      return false; // Cannot receive reward without active subscription
    }

    const subscription = await stripe.subscriptions.retrieve(referrerProfile.subscription_id);

    logStep("Referrer's discounts", { discounts: subscription.discounts });

    // Check if the subscription has any discounts attached (may return null or [])
    const hasDiscount = subscription.discounts && subscription.discounts.length > 0;
    const canReceive = !hasDiscount;

    logStep("Checked if referrer can receive reward", {
      referrerUserId,
      subscriptionId: referrerProfile.subscription_id,
      canReceive,
    });

    return canReceive;
  } catch (error) {
    logStep("Error in checkReferrerCanReceiveReward", { error });
    return true; // Allow on error to not block the flow
  }
}

/**
 * Applies the 10% referrer discount to the referrer's active subscription
 */
async function applyReferrerDiscount(
  stripe: Stripe,
  supabaseAdmin: any,
  referrerUserId: string,
  couponId: string,
): Promise<void> {
  try {
    logStep("Applying referrer discount", { referrerUserId, couponId });

    // Get referrer's subscription ID
    const { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_id")
      .eq("id", referrerUserId)
      .single();

    if (!referrerProfile?.subscription_id) {
      logStep("Referrer has no active subscription", { referrerUserId });
      return;
    }

    // Retrieve subscription to get existing discounts
    const subscription = await stripe.subscriptions.retrieve(referrerProfile.subscription_id, {
      expand: ["discounts"],
    });

    // Check if this coupon is already applied (idempotency)
    const existingDiscounts = subscription.discounts ?? [];
    const alreadyApplied = existingDiscounts.some((d: any) => {
      const coupon = d.source.coupon; // String value of the coupon ID
      return coupon === couponId;
    });

    if (alreadyApplied) {
      logStep("Coupon already applied, skipping", { couponId });
      return;
    }

    await stripe.subscriptions.update(referrerProfile.subscription_id, {
      discounts: [{ coupon: couponId }],
    });

    logStep("Referrer discount applied", {
      referrerUserId,
      subscriptionId: referrerProfile.subscription_id,
    });

    // Mark reward as applied
    await supabaseAdmin
      .from("referral_rewards")
      .update({
        applied: true,
        applied_at: new Date().toISOString(),
      })
      .eq("user_id", referrerUserId)
      .eq("applied", false)
      .eq("stripe_coupon_id", couponId);
  } catch (error) {
    logStep("Error applying referrer discount", {
      referrerUserId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkDuplicateEvent(supabaseAdmin: any, eventId: string): Promise<boolean> {
  const { data: existingEvent } = await supabaseAdmin
    .from("processed_stripe_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  return !!existingEvent;
}

async function insertProcessedEvent(supabaseAdmin: any, eventId: string, eventType: string): Promise<void> {
  const { error: insertError } = await supabaseAdmin
    .from("processed_stripe_events")
    .insert({ id: eventId, event_type: eventType });

  if (insertError) {
    logStep("Error inserting processed event", { error: insertError });
  } else {
    logStep("Processed event inserted successfully", { eventId: eventId });
  }
}
