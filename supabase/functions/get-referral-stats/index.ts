// =============================================
// GET REFERRAL STATS
// Returns referral statistics for a user
// =============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-REFERRAL-STATS] ${step}${detailsStr}`);
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get profile with referral info
    let { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referral_code, referral_code_active, subscription_status")
      .eq("id", user.id)
      .single();

    // Check if user is premium but doesn't have a referral code yet (legacy users)
    const isPremium = profile?.subscription_status === "active" || 
                      profile?.subscription_status === "trialing";
    
    if (isPremium && !profile?.referral_code) {
      logStep("Premium user without referral code, generating one");
      
      // Generate a unique referral code
      let referralCode: string | null = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!referralCode && attempts < maxAttempts) {
        // Generate 8-char alphanumeric code
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
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            referral_code: referralCode,
            referral_code_active: true,
            referral_code_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        
        if (!updateError) {
          logStep("Generated referral code for legacy premium user", { referralCode });
          // Update local profile data
          profile = {
            referral_code: referralCode,
            referral_code_active: true,
            subscription_status: profile?.subscription_status,
          };
        } else {
          logStep("Error updating profile with referral code", { error: updateError });
        }
      }
    }

    // Get referral counts
    const { data: referrals } = await supabaseAdmin
      .from("referrals")
      .select("id, converted")
      .eq("referrer_user_id", user.id);

    const totalReferrals = referrals?.length || 0;
    const convertedReferrals = referrals?.filter(r => r.converted).length || 0;
    const pendingReferrals = totalReferrals - convertedReferrals;

    // Get pending rewards (discounts stacked for next invoice)
    const { data: pendingRewards } = await supabaseAdmin
      .from("referral_rewards")
      .select("percent")
      .eq("user_id", user.id)
      .eq("applied", false);

    const pendingDiscountPercent = pendingRewards?.reduce((sum, r) => sum + r.percent, 0) || 0;

    // Check if user was referred
    const { data: wasReferred } = await supabaseAdmin
      .from("referrals")
      .select("id, referral_code_used, converted")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    logStep("Stats retrieved", { 
      totalReferrals, 
      convertedReferrals, 
      pendingReferrals,
      pendingDiscountPercent 
    });

    return new Response(JSON.stringify({
      referralCode: profile?.referral_code || null,
      referralCodeActive: profile?.referral_code_active || false,
      subscriptionStatus: profile?.subscription_status || "free",
      totalReferrals,
      convertedReferrals,
      pendingReferrals,
      pendingDiscountPercent,
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
