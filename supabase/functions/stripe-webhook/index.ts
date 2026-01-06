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
       * 2. Generate a referral code for the new premium user
       * 3. Update the users profile with the subscription info and referral code.
       * 4. Create a referral intent record (if the user was referred)
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
            currentPeriodEnd: subscription.items.data?.[0]?.current_period_end,
          });

          const priceId = subscription.items.data[0]?.price.id;

          // Determine the plan based on price ID
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

          const updateData: Record<string, unknown> = {
            stripe_customer_id: session.customer as string,
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_plan: subscriptionPlan,
            subscription_current_period_end: currentPeriodEndDate,
            access_expires_at: null,
            referral_code_active: true,
          };

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
              referralCode: updateData.referral_code ?? existingProfile?.referral_code,
            });
          }

          // Create referral record if this was a referred subscription
          // Note: We do NOT mark as converted yet - that happens on first invoice.paid
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
       * This event is triggered when a subscription is updated (e.g. cancelled, downgraded, etc.).
       *
       * Functions (in order of execution):
       * 1. Get the subscription information from the webhook data
       * 2. Update the users profile with the subscription info
       */
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

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
          .select("id, referral_code")
          .eq("stripe_customer_id", subscription.customer as string)
          .limit(1);

        if (findError || !profiles?.length) {
          logStep("Could not find user for subscription", { customerId: subscription.customer });
          break;
        }

        const userId = profiles[0].id;
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

        // Determine access expiry for cancelled subscriptions
        let accessExpiresAt: string | null = null;
        let referralCodeActive = true;

        if (subscription.cancel_at_period_end || subscription.status === "canceled" || subscription.cancel_at) {
          if (subscription.cancel_at) {
            accessExpiresAt = new Date(subscription.cancel_at * 1000).toISOString();
          } else {
            accessExpiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          }
          // Deactivate referral code when subscription is cancelled/downgraded
          referralCodeActive = false;
          logStep("Subscription cancelled/downgraded, deactivating referral code", { userId });
        }

        // If subscription becomes active again, reactivate referral code
        if (subscription.status === "active" && !subscription.cancel_at_period_end && profiles[0].referral_code) {
          referralCodeActive = true;
          logStep("Subscription reactivated, reactivating referral code", { userId });
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
          logStep("Profile updated successfully", { userId, status: subscription.status });
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
          .select("id")
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

        // Reset the profile to free plan, deactivate referral code
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
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id, billingReason: invoice.billing_reason });

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

            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "active",
                subscription_plan: subscriptionPlan,
                subscription_current_period_end: currentPeriodEndDate,
                access_expires_at: null,
                referral_code_active: true, // Ensure active on successful payment
                has_paid_first_invoice: true,
              })
              .eq("id", userId);

            logStep("Profile updated after payment", { userId });

            // =============================================
            // REFERRAL CONVERSION LOGIC (SIMPLIFIED MODEL)
            // One referral = flat 10% discount for referrer
            // Only on FIRST successful invoice (subscription_create)
            // =============================================
            if (invoice.billing_reason === "subscription_create" && !profiles[0].has_paid_first_invoice) {
              logStep("First invoice paid, checking for referral conversion", { userId });

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
            .select("id")
            .eq("stripe_customer_id", invoice.customer as string)
            .limit(1);

          if (profiles?.length) {
            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "past_due",
              })
              .eq("id", profiles[0].id);

            logStep("Profile updated to past_due", { userId: profiles[0].id });
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

    // Check if the subscription has any discounts attached
    const hasDiscount = subscription.discounts;
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
