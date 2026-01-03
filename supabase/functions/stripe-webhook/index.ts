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

          // Update the user's profile
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              stripe_customer_id: session.customer as string,
              subscription_id: subscription.id,
              subscription_status: subscription.status,
              subscription_plan: subscriptionPlan,
              subscription_current_period_end: currentPeriodEndDate,
              access_expires_at: null, // Clear any previous expiration
            })
            .eq("id", userId);

          if (updateError) {
            logStep("Error updating profile", { error: updateError });
          } else {
            logStep("Profile updated successfully", { userId, subscriptionPlan });
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
          .select("id")
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
        if ((subscription.cancel_at_period_end || subscription.status === "canceled") && currentPeriodEndDate) {
          accessExpiresAt = currentPeriodEndDate;
        }

        // Update the profile
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: subscription.cancel_at_period_end ? "cancelled" : subscription.status,
            subscription_plan: subscriptionPlan,
            subscription_current_period_end: currentPeriodEndDate,
            access_expires_at: accessExpiresAt,
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

        // Reset the profile to free plan
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "free",
            subscription_plan: "free",
            subscription_id: null,
            subscription_current_period_end: null,
            access_expires_at: null,
          })
          .eq("id", userId);

        if (updateError) {
          logStep("Error updating profile", { error: updateError });
        } else {
          logStep("Profile reset to free", { userId });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });

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
              })
              .eq("id", profiles[0].id);

            logStep("Profile updated after payment", { userId: profiles[0].id });
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
