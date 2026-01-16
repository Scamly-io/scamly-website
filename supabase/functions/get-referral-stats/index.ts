// =============================================
// GET REFERRAL STATS
// Returns referral statistics for a user
// Simplified model: 1 referral per billing period, flat 10% discount
// Trial users CANNOT refer others until trial ends
// Uses Stripe as source of truth for trial status
// =============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "get-referral-stats";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Sentry for edge function monitoring
const sentryDsn = Deno.env.get("SENTRY_DSN");
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
      }
      return event;
    },
  });
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

const captureError = (error: Error, context: Record<string, unknown>) => {
  if (!sentryDsn) return;
  
  Sentry.withScope((scope) => {
    scope.setTag("function", FUNCTION_NAME);
    scope.setTag("source", "edge-function");
    scope.setContext("details", context);
    Sentry.captureException(error);
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      const error = new Error("STRIPE_SECRET_KEY is not set");
      captureError(error, { step: "env_check" });
      throw error;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const error = new Error("No authorization header provided");
      captureError(error, { step: "authentication" });
      throw error;
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) {
      const error = new Error(`Authentication error: ${userError.message}`);
      captureError(error, { step: "authentication", errorCode: userError.code });
      throw error;
    }
    
    const user = userData.user;
    if (!user) {
      const error = new Error("User not authenticated");
      captureError(error, { step: "authentication" });
      throw error;
    }
    logStep("User authenticated", { userId: user.id });

    // Get profile with referral info
    let { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referral_code, referral_code_active, subscription_status, subscription_plan, subscription_id")
      .eq("id", user.id)
      .single();

    // =============================================
    // CHECK STRIPE FOR TRIAL STATUS (Source of truth)
    // =============================================
    let isTrialing = false;
    let trialEnd: string | null = null;

    if (profile?.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.subscription_id);
        isTrialing = subscription.status === "trialing";
        
        if (isTrialing && subscription.trial_end) {
          trialEnd = new Date(subscription.trial_end * 1000).toISOString();
        }
        
        logStep("Stripe subscription status", { 
          subscriptionId: profile.subscription_id,
          status: subscription.status,
          isTrialing,
          trialEnd,
        });
      } catch (stripeError) {
        // Log but don't fail - fall back to database status
        logStep("Error fetching Stripe subscription, falling back to DB", { error: stripeError });
        captureError(
          stripeError instanceof Error ? stripeError : new Error(String(stripeError)),
          { step: "stripe_subscription_fetch", subscriptionId: profile.subscription_id }
        );
        isTrialing = profile.subscription_status === "trialing";
      }
    } else {
      // No subscription ID, check database status
      isTrialing = profile?.subscription_status === "trialing";
    }

    // Check if user is premium (including trialing)
    const isPremium = profile?.subscription_status === "active" || 
                      profile?.subscription_status === "trialing";
    
    // Generate referral code for premium users without one (legacy users)
    if (isPremium && !profile?.referral_code) {
      logStep("Premium user without referral code, generating one");
      
      let referralCode: string | null = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!referralCode && attempts < maxAttempts) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let candidate = "";
        for (let i = 0; i < 8; i++) {
          candidate += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
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
      
      if (referralCode) {
        // Trial users get a code but it's NOT active
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            referral_code: referralCode,
            referral_code_active: !isTrialing,
            referral_code_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        
        if (!updateError) {
          logStep("Generated referral code for legacy premium user", { referralCode, isActive: !isTrialing });
          profile = {
            referral_code: referralCode,
            referral_code_active: !isTrialing,
            subscription_status: profile?.subscription_status,
            subscription_plan: profile?.subscription_plan,
            subscription_id: profile?.subscription_id,
          };
        } else {
          captureError(new Error("Error updating profile with referral code"), { 
            step: "generate_referral_code", 
            userId: user.id,
            errorMessage: updateError.message 
          });
          logStep("Error updating profile with referral code", { error: updateError });
        }
      }
    }

    // Get total referral counts (all time)
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from("referrals")
      .select("id, converted, converted_at")
      .eq("referrer_user_id", user.id);

    if (referralsError) {
      captureError(new Error("Error fetching referrals"), { 
        step: "fetch_referrals", 
        userId: user.id,
        errorMessage: referralsError.message 
      });
    }

    const totalReferrals = referrals?.length || 0;
    const convertedReferrals = referrals?.filter(r => r.converted).length || 0;

    // Check if user can refer someone this billing period
    // Trial users CANNOT refer anyone
    let canReferThisPeriod = false;
    let hasRewardThisPeriod = false;
    let currentRewardApplied = false;

    if (!isTrialing && isPremium) {
      // Only non-trial premium users can potentially refer
      const now = new Date();
      let periodStart: Date;

      if (profile?.subscription_plan === "premium-yearly") {
        periodStart = new Date(now);
        periodStart.setFullYear(periodStart.getFullYear() - 1);
      } else {
        periodStart = new Date(now);
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      // Check for any rewards created in this billing period
      const { data: recentRewards } = await supabaseAdmin
        .from("referral_rewards")
        .select("id, created_at, applied")
        .eq("user_id", user.id)
        .gte("created_at", periodStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      hasRewardThisPeriod = !!(recentRewards && recentRewards.length > 0);
      canReferThisPeriod = !hasRewardThisPeriod;
      currentRewardApplied = hasRewardThisPeriod && recentRewards ? recentRewards[0].applied : false;
    }

    // Check if user was referred
    const { data: wasReferred } = await supabaseAdmin
      .from("referrals")
      .select("id, referral_code_used, converted")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    logStep("Stats retrieved", { 
      totalReferrals, 
      convertedReferrals,
      isTrialing,
      canReferThisPeriod,
      hasRewardThisPeriod,
      currentRewardApplied,
    });

    return new Response(JSON.stringify({
      referralCode: profile?.referral_code || null,
      // Trial users have a code but it's NOT active
      referralCodeActive: isTrialing ? false : (profile?.referral_code_active || false),
      subscriptionStatus: profile?.subscription_status || "free",
      subscriptionPlan: profile?.subscription_plan || "free",
      totalReferrals,
      convertedReferrals,
      // Trial-specific fields
      isTrialing,
      trialEnd,
      // Simplified model fields
      canReferThisPeriod: isTrialing ? false : canReferThisPeriod,
      hasRewardThisPeriod,
      currentRewardApplied,
      // Legacy fields
      pendingReferrals: 0,
      pendingDiscountPercent: hasRewardThisPeriod && !currentRewardApplied ? 10 : 0,
      wasReferred: wasReferred ? {
        codeUsed: wasReferred.referral_code_used,
        converted: wasReferred.converted
      } : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    if (error instanceof Error && sentryDsn) {
      captureError(error, { step: "unhandled", message: errorMessage });
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
