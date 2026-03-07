import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "stripe-webhook";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, baggage, sentry-trace",
};

const sentryDsn = Deno.env.get("SENTRY_DSN");
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["stripe-signature"];
      }
      return event;
    },
  });
}

/**
 * Log a generic console message
 * @param step
 * @param details
 */
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

/**
 * Log a console warning
 * @param message
 * @param details
 */
const logWarn = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.warn(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

/**
 * Log a console error
 * @param message
 * @param details
 */
const logError = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.error(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

/**
 * Capture an error and send it to Sentry
 * @param error
 * @param context - Error context information (varible depending on what context is required)
 */
const captureError = (error: unknown, context: Record<string, unknown>) => {
  if (!sentryDsn) return;
  Sentry.withScope((scope) => {
    scope.setTag("function", FUNCTION_NAME);
    scope.setTag("source", "edge-function");
    scope.setContext("details", context);
    Sentry.captureException(error);
  });
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Stripe coupon ID for referrals - flat 10% for both referrer and referred
const REFERRAL_COUPON_10_PERCENT = "qLrjIGkn";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logError("Webhook signature verification failed", { error: err });
      captureError(err, { step: "webhook-signature-verification-failed" });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      /**
       * EVENT: checkout.session.completed
       *
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

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) {
          logError("No user ID found in session", { session });
          captureError(new Error("No user ID found in session"), { step: "checkout-session-completed", session });
          break;
        }

        // Used to detemine if the checkout is for a free trial.
        const isTrial = session.metadata?.is_trial === "true";

        // Referral information used to apply the referrer discount.
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
          logError("Error updating customer metadata", { error: error });
          captureError(error, { step: "error-updating-customer-metadata" });
        }

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          /**
           * TRIAL ABUSE DETECTION
           * Only check if this is a trial subscription
           * Trial abuse markers are checked in order of most likely to least likely to occur.
           * This prevents multiple redundant calls to the database.
           *
           * Order:
           * 1. Check if the payment method has been used before (payment_fingerprints)
           * 2. Check if the user has already consumed a trial (has_consumed_trial)
           * 3. If no abuse is detected, store the payment fingerprint for future checks
           *
           * Handles errors in a "fail-off" manner. If an error occurs, the trial is denied and the user is reset to free.
           *
           * If abuse is detected, cancel the subscription and reset the user to free.
           */
          let trialAbuseDetected = false;
          let abuseReason = "";

          if (isTrial && subscription.status === "trialing") {
            const paymentMethodId = subscription.default_payment_method as string;

            if (paymentMethodId) {
              try {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

                let fingerprint: string | null = null;
                let fingerprintType: "card" | "link" | null = null;

                if (paymentMethod.type === "card" && paymentMethod.card?.fingerprint) {
                  fingerprint = paymentMethod.card.fingerprint;
                  fingerprintType = "card";
                } else if (paymentMethod.type === "link" && paymentMethod.link?.email) {
                  // For Link payments, use the email as the fingerprint
                  fingerprint = paymentMethod.link.email;
                  fingerprintType = "link";
                }

                if (fingerprint && fingerprintType) {
                  const { data: existingFingerprint } = await supabaseAdmin
                    .from("payment_fingerprints")
                    .select("id, user_id, first_used_at")
                    .eq("fingerprint", fingerprint)
                    .maybeSingle();

                  if (existingFingerprint) {
                    trialAbuseDetected = true;
                    abuseReason = `Payment method was previously used for a trial by user ${existingFingerprint.user_id} on ${existingFingerprint.first_used_at}`;
                  } else {
                    // If there is no existing fingerprint, check if the user has already consumed a trial.
                    const { data: userProfile } = await supabaseAdmin
                      .from("profiles")
                      .select("has_consumed_trial")
                      .eq("id", userId)
                      .single();

                    if (userProfile?.has_consumed_trial) {
                      trialAbuseDetected = true;
                      abuseReason = "User has already consumed their free trial";
                    } else {
                      // No abuse - store the fingerprint for future checks
                      const { error: fingerprintError } = await supabaseAdmin.from("payment_fingerprints").insert({
                        fingerprint,
                        fingerprint_type: fingerprintType,
                        user_id: userId,
                      });

                      if (fingerprintError) {
                        // Could be a race condition - another request inserted first
                        if (fingerprintError.code === "23505") {
                          // Unique constraint violation
                          trialAbuseDetected = true;
                          abuseReason = "Payment fingerprint was just registered by another request";
                        }
                      }
                    }
                  }
                } else {
                  // Could not extract fingerprint - deny trial to be safe
                  // This handles edge cases where payment method data is incomplete
                  trialAbuseDetected = true;
                  abuseReason = "Could not extract payment fingerprint - trial denied for safety";
                  captureError(new Error("Trial Denied - No fingerprint available"), {
                    "payment method type": paymentMethod.type,
                  });
                }
              } catch (pmError) {
                // Payment method retrieval failed - deny trial to be safe
                trialAbuseDetected = true;
                abuseReason = "Failed to retrieve payment method - trial denied for safety";
                captureError(pmError, { step: "trial-denied-payment-method-retrieval-failed" });
              }
            } else {
              // No default payment method on subscription - this shouldn't happen for trials
              // but handle it anyway by denying trial
              // For some checkout configurations, payment method might be on the setup intent
              // Default to denying trial if we can't verify the payment method
              trialAbuseDetected = true;
              abuseReason = "No payment method found on subscription - trial denied for safety";
            }

            /**
             * HANDLE TRIAL ABUSE
             * If trial abuse is detected, cancel the subscription immediately and reset the user to free.
             * This is to prevent abuse of the free trial.
             */
            if (trialAbuseDetected) {
              try {
                await stripe.subscriptions.cancel(subscription.id, {
                  prorate: true,
                });

                await supabaseAdmin
                  .from("profiles")
                  .update({
                    subscription_status: "free",
                    subscription_plan: "free",
                    subscription_id: null,
                    subscription_current_period_end: null,
                    access_expires_at: null,
                    has_consumed_trial: true,
                    referral_code_active: false,
                  })
                  .eq("id", userId);

                // Analytics
                const posthogApiKey = Deno.env.get("POSTHOG_API_KEY");
                if (posthogApiKey) {
                  try {
                    await fetch("https://us.i.posthog.com/i/v0/e", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        api_key: posthogApiKey,
                        event: "trial_abuse_detected",
                        distinct_id: userId,
                        properties: {
                          reason: abuseReason,
                          subscription_id: subscription.id,
                          $current_url: "stripe-webhook",
                        },
                      }),
                    });
                  } catch (posthogError) {
                    logWarn("Failed to send PostHog event", { error: posthogError });
                    captureError(posthogError, { step: "failed-to-send-posthog-event" });
                  }
                }

                await insertProcessedEvent(supabaseAdmin, event.id, event.type);
                return new Response(
                  JSON.stringify({
                    received: true,
                    trialAbuse: true,
                    reason: abuseReason,
                  }),
                  {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                  },
                );
              } catch (cancelError) {
                logError("Error cancelling abusive trial subscription", { error: cancelError });
                captureError(cancelError, { step: "error-cancelling-abusive-trial-subscription" });
                // Continue anyway - better to have the profile updated than leave in bad state
              }
            }
          }

          /**
           * NORMAL CHECKOUT PROCESSING (no abuse detected)
           * If no abuse is detected, process the checkout as normal.
           */
          const priceId = subscription.items.data[0]?.price.id;

          let subscriptionPlan = "premium-monthly";
          if (priceId === "price_1RaBqI3J81eQle64GF6WYMfm") {
            subscriptionPlan = "premium-yearly";
          }

          // TODO: Can this be removed? - Inferred from the isTrial variable.
          const isTrialing = subscription.status === "trialing";

          let currentPeriodEndDate: string | null = null;
          const periodEnd = subscription.items.data?.[0]?.current_period_end;

          if (periodEnd && typeof periodEnd === "number" && periodEnd > 0) {
            currentPeriodEndDate = new Date(periodEnd * 1000).toISOString();
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

          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("referral_code")
            .eq("id", userId)
            .single();

          // Trial users get a referral code but it's NOT active until trial ends
          // This prevents trial users from referring others
          // IMPORTANT: Mark has_consumed_trial = true if this was a trial checkout
          // Do NOT set has_consumed_trial to false for non-trial checkouts (it may already be true from abuse detection)
          const profileUpdateData: Record<string, unknown> = {
            stripe_customer_id: session.customer as string,
            subscription_id: subscription.id,
            subscription_status: subscription.status, // Will be "trialing" for trials
            subscription_plan: subscriptionPlan,
            subscription_current_period_end: currentPeriodEndDate,
            access_expires_at: null,
            referral_code_active: !isTrialing, // Inactive during trial
          };

          if (isTrialing) {
            profileUpdateData.has_consumed_trial = true;
          }

          if (!existingProfile?.referral_code) {
            profileUpdateData.referral_code = referralCode;
            profileUpdateData.referral_code_updated_at = new Date().toISOString();
          }

          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update(profileUpdateData)
            .eq("id", userId);

          if (updateError) {
            captureError(updateError, { step: "error-updating-profile" });
          }

          // Create referral record if this was a referred subscription
          // Note: We do NOT mark as converted yet - that happens on first PAID invoice (not trial $0 invoice)
          if (referrerUserId && referralCodeUsed) {
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
              captureError(referralError, { step: "error-creating-referral-record" });
            }
          }

          // Send appropriate email based on whether this is a trial or paid subscription
          try {
            const isYearly = subscriptionPlan === "premium-yearly";
            const emailPrice = isYearly ? "99" : "10";
            const emailBillingPeriod = isYearly ? "year" : "month";
            const emailNextPayment = currentPeriodEndDate
              ? formatDate(new Date(currentPeriodEndDate).toISOString())
              : "N/A";

            if (isTrialing) {
              // Send free trial created email
              const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  type: "free_trial_created",
                  userId,
                  price: emailPrice,
                  billingPeriod: emailBillingPeriod,
                  nextPayment: emailNextPayment,
                }),
              });

              const emailResult = await emailResponse.json();
              if (!emailResponse.ok && !emailResult.success) {
                throw new Error(emailResult.error ?? "Failed to send free trial created email");
              }
            } else {
              // Send subscription created email (direct paid subscription, no trial)
              const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  type: "subscription_created",
                  userId,
                  price: emailPrice,
                  billingPeriod: emailBillingPeriod,
                  nextPayment: emailNextPayment,
                }),
              });

              const emailResult = await emailResponse.json();
              if (!emailResponse.ok && !emailResult.success) {
                throw new Error(emailResult.error ?? "Failed to send subscription created email");
              }
            }
          } catch (emailError) {
            captureError(emailError, { step: "error-sending-checkout-email" });
            // Don't fail the webhook if email fails - subscription is already created
          }
        }
        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * EVENT: checkout.session.expired
       *
       * This event is triggered when a checkout session is expired (user closes the page without completing the checkout).
       */
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        const { data: profiles, error: findError } = await supabaseAdmin
          .from("profiles")
          .select("id, has_paid_first_invoice")
          .eq("stripe_customer_id", session.customer as string)
          .limit(1);

        if (findError || !profiles?.length) {
          captureError(findError, { step: "error-finding-user-for-expired-session" });
          break;
        }

        const userId = profiles[0].id;

        // Update the profile to show the user was not referred
        // This is done in case the user WAS referred but did not complete the checkout.
        // Allows a user to use a referral code again.
        if (!profiles[0].has_paid_first_invoice) {
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              referred_user: false,
            })
            .eq("id", userId);

          if (updateError) {
            captureError(updateError, { step: "error-updating-profile-not-referred" });
          }
        }
        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * EVENT: customer.subscription.updated
       *
       * This event is triggered when a subscription is updated (e.g. cancelled, trial ends, downgraded, etc.).
       *
       * Handles the following subscription status changes:
       * - cancelled
       * - downgraded
       * - trial to active transition
       *
       * When status changes from "trialing" to "active", activate the referral code.
       */
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Check if this is a new manual cancellation (cancel_at_period_end just became true)
        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        const wasNotCancellingBefore = previousAttributes?.cancel_at_period_end === false;
        const isNowCancelling = subscription.cancel_at_period_end === true;
        const isManualCancellation = wasNotCancellingBefore && isNowCancelling;

        const { data: profiles, error: findError } = await supabaseAdmin
          .from("profiles")
          .select("id, referral_code, subscription_status")
          .eq("stripe_customer_id", subscription.customer as string)
          .limit(1);

        if (findError || !profiles?.length) {
          captureError(findError, { step: "error-finding-user-for-subscription" });
          break;
        }

        const userId = profiles[0].id;
        const priceId = subscription.items.data[0]?.price.id;

        let subscriptionPlan = "premium-monthly";
        if (priceId === "price_1RaBqI3J81eQle64GF6WYMfm") {
          subscriptionPlan = "premium-yearly";
        }

        let currentPeriodEndDate: string | null = null;
        const periodEnd = subscription.items.data?.[0]?.current_period_end;

        if (periodEnd && typeof periodEnd === "number" && periodEnd > 0) {
          currentPeriodEndDate = new Date(periodEnd * 1000).toISOString();
        }

        let accessExpiresAt: string | null = null;
        let referralCodeActive: boolean;

        const isTrialing = subscription.status === "trialing";

        // Check if subscription is being cancelled
        const isCancelling =
          subscription.cancel_at_period_end || subscription.status === "canceled" || subscription.cancel_at;

        if (isCancelling) {
          if (subscription.cancel_at) {
            accessExpiresAt = new Date(subscription.cancel_at * 1000).toISOString();
          } else {
            accessExpiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          }
          referralCodeActive = false;
        } else if (isTrialing) {
          // Keep referral code inactive
          referralCodeActive = false;
        } else if (subscription.status === "active" && profiles[0].referral_code) {
          // Trial to active transition
          referralCodeActive = true;
        } else {
          // Default: inactive
          referralCodeActive = false;
        }

        // Update the profile with the new subscription information
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: subscription.status,
            subscription_plan: subscriptionPlan,
            subscription_current_period_end: currentPeriodEndDate,
            access_expires_at: accessExpiresAt,
            referral_code_active: referralCodeActive,
          })
          .eq("id", userId);

        if (updateError) {
          captureError(updateError, { step: "error-updating-profile-subscription-updated" });
        }

        // Send manual cancellation email if this is a new manual cancellation (user initiated it)
        if (isManualCancellation) {
          try {
            const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ type: "manual_cancellation", userId, accessExpiresAt }),
            });

            const emailResult = await emailResponse.json();
            if (!emailResponse.ok && !emailResult.success) {
              throw new Error(emailResult.error ?? "Failed to send manual cancellation email");
            }
          } catch (emailError) {
            captureError(emailError, { step: "error-sending-manual-cancellation-email" });
            // Don't fail the webhook if email fails
          }
        }

        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * EVENT: customer.subscription.deleted
       *
       * This event is triggered when a subscription is deleted (e.g. cancelled and not reactivated).
       */
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
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

        // Reset the profile to free plan, deactivate referral code
        // Note: has_consumed_trial stays true
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
          captureError(updateError, { step: "error-updating-profile-subscription-deleted" });
        }

        // Send forced cancellation email if this was due to failed payments
        if (wasForcedCancellation) {
          try {
            const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-customer-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ type: "forced_cancellation", userId }),
            });

            const emailResult = await emailResponse.json();
            if (!emailResponse.ok && !emailResult.success) {
              throw new Error(emailResult.error ?? "Failed to send forced cancellation email");
            }
          } catch (emailError) {
            captureError(emailError, { step: "error-sending-forced-cancellation-email" });
            // Don't fail the webhook if email fails
          }
        }

        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      /**
       * EVENT: invoice.payment_succeeded
       *
       * This event is triggered when a payment is successful.
       *
       * IMPORTANT: Trial invoices have amount_paid = 0. DO NOT:
       * - Update has_paid_first_invoice for $0 trial invoices
       * - Convert referrals for $0 trial invoices
       *
       * Referral conversion only happens when a REAL payment is made
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const amountPaid = invoice.amount_paid ?? 0;

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
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

            let currentPeriodEndDate: string | null = null;
            const periodEnd = subscription.items.data?.[0]?.current_period_end;

            if (periodEnd && typeof periodEnd === "number" && periodEnd > 0) {
              currentPeriodEndDate = new Date(periodEnd * 1000).toISOString();
            }

            /**
             * TRIAL INVOICE HANDLING
             * For $0 trial invoices:
             * - Update subscription status to "trialing"
             * - Do NOT update has_paid_first_invoice
             * - Do NOT activate referral code (trial users can't refer)
             */
            if (amountPaid === 0 && isTrialing) {
              const { error: updateError } = await supabaseAdmin
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

              if (updateError) {
                captureError(updateError, { step: "error-updating-profile-invoice-payment-succeeded-trial" });
              }
            } else {
              /**
               * REAL PAYMENT (non-$0 invoice)
               * - Update to active status
               * - Mark has_paid_first_invoice = true
               * - Activate referral code
               * - Process referral conversion if applicable
               */

              const { error: updateError } = await supabaseAdmin
                .from("profiles")
                .update({
                  subscription_status: "active",
                  subscription_plan: subscriptionPlan,
                  subscription_current_period_end: currentPeriodEndDate,
                  access_expires_at: null,
                  referral_code_active: true,
                  has_paid_first_invoice: true,
                })
                .eq("id", userId);

              if (updateError) {
                captureError(updateError, { step: "error-updating-profile-invoice-payment-succeeded-real" });
              }

              /**
               * REFERRAL CONVERSION LOGIC
               * One referral = flat 10% discount for referrer
               * Only on FIRST successful PAID invoice (not trial $0 invoices)
               * billing_reason can be "subscription_create" (first after trial ends) or "subscription_cycle" (renewal)
               * We check has_paid_first_invoice to determine if this is truly the first payment
               */
              if (!profiles[0].has_paid_first_invoice) {
                // Find unconverted referral for this user
                const { data: referral } = await supabaseAdmin
                  .from("referrals")
                  .select("id, referrer_user_id, converted")
                  .eq("referred_user_id", userId)
                  .eq("converted", false)
                  .maybeSingle();

                if (referral) {
                  // Check if a referrer can receive the referral reward
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
                    captureError(convertError, { step: "error-marking-referral-as-converted" });
                  } else {
                    if (canReceiveReward) {
                      const { error: rewardError } = await supabaseAdmin.from("referral_rewards").insert({
                        user_id: referral.referrer_user_id,
                        percent: 10,
                        applied: false,
                        stripe_coupon_id: REFERRAL_COUPON_10_PERCENT,
                        source_referral_id: referral.id,
                      });

                      if (rewardError) {
                        // Could be duplicate, which is fine (idempotency)
                        captureError(rewardError, { step: "error-creating-referral-reward" });
                      }

                      await applyReferrerDiscount(
                        stripe,
                        supabaseAdmin,
                        referral.referrer_user_id,
                        REFERRAL_COUPON_10_PERCENT,
                      );
                    }
                  }
                } else {
                  // No unconverted referral found - check if user was supposed to be referred
                  // This is a RACE CONDITION SAFEGUARD: if referred_user is true but no referral row exists,
                  // it means checkout.session.completed hasn't created the referral row yet.
                  // Return 500 to force Stripe to retry.
                  if (profiles[0].referred_user) {
                    return new Response(JSON.stringify({ error: "Referral row not yet created, retry required" }), {
                      status: 500,
                      headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                  }
                }
              }
            }
          } else {
            // No profile found for referred user, possibly race condition - forcing retry
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
       * EVENT: invoice.payment_failed
       *
       * This event is triggered when a payment fails. Sets users to past_due status.
       *
       * A separate function is scheduled on a cron job to revoke access to expired users.
       */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const isDuplicate = await checkDuplicateEvent(supabaseAdmin, event.id);
        if (isDuplicate) {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        if (invoice.subscription) {
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
          }
        }
        await insertProcessedEvent(supabaseAdmin, event.id, event.type);
        break;
      }

      default:
        logWarn("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError("ERROR in stripe-webhook", { message: errorMessage });
    captureError(error, { step: "error-in-stripe-webhook" });
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
 * Checks if the referrer can receive a reward.
 * If the referrer's subscription has no discount attached, they can receive a reward.
 * Stripe automatically removes one-time use coupons when a billing cycle renews.
 */
async function checkReferrerCanReceiveReward(
  stripe: Stripe,
  supabaseAdmin: any,
  referrerUserId: string,
): Promise<boolean> {
  try {
    const { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_id")
      .eq("id", referrerUserId)
      .single();

    if (!referrerProfile?.subscription_id) {
      // Referrer has no active subscription
      return false;
    }

    const subscription = await stripe.subscriptions.retrieve(referrerProfile.subscription_id);

    // Check if the subscription has any discounts attached (may return null or [])
    const hasDiscount = subscription.discounts && subscription.discounts.length > 0;
    const canReceive = !hasDiscount;

    return canReceive;
  } catch (error) {
    captureError(error, { step: "error-in-checkReferrerCanReceiveReward" });
    return false;
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
    const { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_id")
      .eq("id", referrerUserId)
      .single();

    if (!referrerProfile?.subscription_id) {
      // Referrer has no active subscription
      return;
    }

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
      // Coupon already applied, skipping
      return;
    }

    await stripe.subscriptions.update(referrerProfile.subscription_id, {
      discounts: [{ coupon: couponId }],
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
    captureError(error, { step: "error-applying-referrer-discount", referrerUserId, couponId });
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
    captureError(insertError, { step: "error-inserting-processed-event" });
  }
}
