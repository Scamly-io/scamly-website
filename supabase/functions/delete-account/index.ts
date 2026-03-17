import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { Resend } from "https://esm.sh/resend";
import { Redis } from "https://esm.sh/@upstash/redis";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@latest";

function getCorsHeaders(req: Request) {
  const requestHeaders = req.headers.get("Access-Control-Request-Headers") || "";
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": requestHeaders || "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[DELETE-ACCOUNT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    // Rate limiting: 2 per minute
    const redis = new Redis({
      url: Deno.env.get("REDIS_URL")!,
      token: Deno.env.get("REDIS_TOKEN")!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "60 s"),
      analytics: false,
    });

    const { success: rateLimitOk } = await ratelimit.limit(`delete-account:${userId}`);
    if (!rateLimitOk) {
      logStep("Rate limited", { userId });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile to check for Stripe subscription
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, subscription_id, subscription_status")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
      throw new Error("Failed to fetch profile");
    }

    logStep("Profile fetched", {
      hasStripeCustomer: !!profile.stripe_customer_id,
      subscriptionStatus: profile.subscription_status,
      hasSubscriptionId: !!profile.subscription_id,
    });

    // Cancel Stripe subscription immediately if active
    if (profile.subscription_id && profile.subscription_status && !["free", "cancelled"].includes(profile.subscription_status)) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      try {
        logStep("Cancelling Stripe subscription immediately", { subscriptionId: profile.subscription_id });
        await stripe.subscriptions.cancel(profile.subscription_id, {
          prorate: true,
          invoice_now: false,
        });
        logStep("Stripe subscription cancelled");
      } catch (stripeErr) {
        // Log but don't block deletion if subscription is already cancelled/invalid
        logStep("Stripe cancellation error (proceeding with deletion)", {
          error: stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
        });
      }
    }

    // Delete the user from auth (cascades to profiles and other FK tables)
    logStep("Deleting user from auth", { userId });
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logStep("Delete user error", { error: deleteError.message });
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    logStep("User deleted successfully", { userId });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
