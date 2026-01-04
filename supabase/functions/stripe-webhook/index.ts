import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper logging function for debugging
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Stripe coupon IDs for referrals
const REFERRAL_COUPONS = {
  REFERRER_5_PERCENT: "QEAuNLJJ", // 5% off for referrer
};

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
      { auth: { persistSession: false } }
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

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });
        
        // Get the user ID from metadata or client_reference_id
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) {
          logStep("No user ID found in session", { session });
          break;
        }

        // Check for referral info in session metadata
        const referrerUserId = session.metadata?.referrer_user_id;
        const referralCodeUsed = session.metadata?.referral_code_used;

        // Get the subscription details
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          logStep("Subscription retrieved", { 
            subscriptionId: subscription.id, 
            currentPeriodEnd: subscription.current_period_end 
          });
          
          const priceId = subscription.items.data[0]?.price.id;
          
          // Determine the plan based on price ID
          let subscriptionPlan = "premium-monthly";
          if (priceId === "price_1RaBqI3J81eQle64GF6WYMfm") {
            subscriptionPlan = "premium-yearly";
          }

          // Safely parse the current period end date
          let currentPeriodEndDate: string | null = null;
          const periodEnd = subscription.current_period_end;
          logStep("Parsing period end", { periodEnd, type: typeof periodEnd });
          
          if (periodEnd && typeof periodEnd === 'number' && periodEnd > 0) {
            currentPeriodEndDate = new Date(periodEnd * 1000).toISOString();
            logStep("Parsed period end date", { currentPeriodEndDate });
          } else {
            logStep("Invalid period end value, setting to null");
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

          // Update the user's profile
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              stripe_customer_id: session.customer as string,
              subscription_id: subscription.id,
              subscription_status: subscription.status,
              subscription_plan: subscriptionPlan,
              subscription_current_period_end: currentPeriodEndDate,
              access_expires_at: null,
              // Referral fields - only set if user doesn't already have a code
              referral_code: referralCode,
              referral_code_active: true,
              referral_code_updated_at: new Date().toISOString(),
            })
            .eq("id", userId)
            .is("referral_code", null); // Only update if no existing code

          // Also update for users who already have a code (just activate it)
          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_customer_id: session.customer as string,
              subscription_id: subscription.id,
              subscription_status: subscription.status,
              subscription_plan: subscriptionPlan,
              subscription_current_period_end: currentPeriodEndDate,
              access_expires_at: null,
              referral_code_active: true,
            })
            .eq("id", userId)
            .not("referral_code", "is", null);

          if (updateError) {
            logStep("Error updating profile", { error: updateError });
          } else {
            logStep("Profile updated successfully", { userId, subscriptionPlan, referralCode });
          }

          // Create referral record if this was a referred subscription
          // Note: We do NOT mark as converted yet - that happens on first invoice.paid
          if (referrerUserId && referralCodeUsed) {
            logStep("Creating referral record", { referrerUserId, userId, referralCodeUsed });
            
            // Check if referral already exists (idempotency)
            const { data: existingReferral } = await supabaseAdmin
              .from("referrals")
              .select("id")
              .eq("referred_user_id", userId)
              .maybeSingle();

            if (!existingReferral) {
              const { error: referralError } = await supabaseAdmin
                .from("referrals")
                .insert({
                  referrer_user_id: referrerUserId,
                  referred_user_id: userId,
                  referral_code_used: referralCodeUsed,
                  converted: false,
                });

              if (referralError) {
                logStep("Error creating referral record", { error: referralError });
              } else {
                logStep("Referral record created successfully");
              }
            } else {
              logStep("Referral record already exists, skipping");
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

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
        if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
          currentPeriodEndDate = new Date(subscription.current_period_end * 1000).toISOString();
        }

        // Determine access expiry for cancelled subscriptions
        let accessExpiresAt: string | null = null;
        let referralCodeActive = true;

        if (subscription.cancel_at_period_end || subscription.status === "canceled") {
          accessExpiresAt = currentPeriodEndDate;
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
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        // Find the user by stripe_customer_id
        const { data: profiles, error: findError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", subscription.customer as string)
          .limit(1);

        if (findError || !profiles?.length) {
          logStep("Could not find user for subscription", { customerId: subscription.customer });
          break;
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
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id, billingReason: invoice.billing_reason });

        if (invoice.subscription) {
          // Refresh the subscription data
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          // Find the user by stripe_customer_id
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id")
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
            if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
              currentPeriodEndDate = new Date(subscription.current_period_end * 1000).toISOString();
            }

            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "active",
                subscription_plan: subscriptionPlan,
                subscription_current_period_end: currentPeriodEndDate,
                access_expires_at: null,
                referral_code_active: true, // Ensure active on successful payment
              })
              .eq("id", userId);

            logStep("Profile updated after payment", { userId });

            // =============================================
            // REFERRAL CONVERSION LOGIC
            // Only on FIRST successful invoice (subscription_create or subscription_cycle for first payment)
            // =============================================
            if (invoice.billing_reason === "subscription_create") {
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
                  referrerId: referral.referrer_user_id 
                });

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

                  // Grant 5% reward to referrer
                  // Use source_referral_id for idempotency
                  const { error: rewardError } = await supabaseAdmin
                    .from("referral_rewards")
                    .insert({
                      user_id: referral.referrer_user_id,
                      percent: 5,
                      applied: false,
                      stripe_coupon_id: REFERRAL_COUPONS.REFERRER_5_PERCENT,
                      source_referral_id: referral.id,
                    });

                  if (rewardError) {
                    // Could be duplicate, which is fine (idempotency)
                    logStep("Error or duplicate creating referral reward", { error: rewardError });
                  } else {
                    logStep("Referral reward created for referrer", { 
                      referrerId: referral.referrer_user_id,
                      percent: 5 
                    });
                  }

                  // Apply 5% coupon to referrer's subscription
                  await applyReferrerDiscount(
                    stripe, 
                    supabaseAdmin, 
                    referral.referrer_user_id,
                    REFERRAL_COUPONS.REFERRER_5_PERCENT
                  );
                }
              } else {
                logStep("No unconverted referral found for user", { userId });
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id });

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Applies the 5% referrer discount to the referrer's active subscription
 * Stacks with existing discounts by adding a new coupon
 */
async function applyReferrerDiscount(
  stripe: Stripe,
  supabaseAdmin: any,
  referrerUserId: string,
  couponId: string
): Promise<void> {
  try {
    logStep("Applying referrer discount", { referrerUserId, couponId });

    // Get referrer's subscription ID
    const { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_id, stripe_customer_id")
      .eq("id", referrerUserId)
      .single();

    if (!referrerProfile?.subscription_id) {
      logStep("Referrer has no active subscription, cannot apply discount", { referrerUserId });
      return;
    }

    // Apply coupon to subscription
    // Note: This applies the discount to the next invoice
    await stripe.subscriptions.update(referrerProfile.subscription_id, {
      coupon: couponId,
    });

    logStep("Referrer discount applied successfully", { 
      referrerUserId, 
      subscriptionId: referrerProfile.subscription_id 
    });

    // Mark the reward as applied
    await supabaseAdmin
      .from("referral_rewards")
      .update({ 
        applied: true,
        applied_at: new Date().toISOString()
      })
      .eq("user_id", referrerUserId)
      .eq("applied", false)
      .eq("stripe_coupon_id", couponId);

  } catch (error) {
    logStep("Error applying referrer discount", { 
      referrerUserId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    // Don't throw - discount application is best-effort
  }
}
