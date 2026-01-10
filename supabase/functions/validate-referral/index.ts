// =============================================
// VALIDATE REFERRAL CODE
// Validates a referral code before checkout
// =============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-REFERRAL] ${step}${detailsStr}`);
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

    const { referralCode } = await req.json();
    if (!referralCode || typeof referralCode !== "string") {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Referral code is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const normalizedCode = referralCode.trim().toUpperCase();
    logStep("Validating code", { code: normalizedCode });

    // Rule 1: Check if user has ever used a referral code
    const { data: existingReferral } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existingReferral) {
      logStep("User has already used a referral code", { userId: user.id });
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "You have already used a referral code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Rule 2: Find the referral code owner
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from("profiles")
      .select("id, referral_code, referral_code_active")
      .ilike("referral_code", normalizedCode)
      .maybeSingle();

    if (referrerError) {
      logStep("Error finding referrer", { error: referrerError });
      throw new Error("Database error");
    }

    if (!referrer) {
      logStep("Referral code not found", { code: normalizedCode });
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Referral code not found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Rule 3: Prevent self-referral
    if (referrer.id === user.id) {
      logStep("Self-referral attempted", { userId: user.id });
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "You cannot use your own referral code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Rule 4: Check if code is active
    if (!referrer.referral_code_active) {
      logStep("Referral code is inactive", { referrerId: referrer.id });
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Referral code not found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Referral code is valid", { referrerId: referrer.id });
    return new Response(JSON.stringify({ 
      valid: true,
      referrerId: referrer.id,
      code: referrer.referral_code
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
