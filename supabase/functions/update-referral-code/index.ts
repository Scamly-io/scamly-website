// =============================================
// UPDATE REFERRAL CODE
// Allows premium users to customize their referral code
// Enforces 24-hour cooldown between changes
// =============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "update-referral-code";

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

// 24 hours in milliseconds
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_status, referral_code_active, referral_code_updated_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      const error = new Error("Profile not found");
      captureError(error, { step: "get_profile", userId: user.id });
      throw error;
    }

    // Only premium users can update referral codes
    if (!["active", "cancelled"].includes(profile.subscription_status || "")) {
      logStep("User is not premium", { status: profile.subscription_status });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Only premium users can customize referral codes" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Only allow changes if referral code is active
    if (!profile.referral_code_active) {
      logStep("Referral code is not active");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Your referral code is not active" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check cooldown
    if (profile.referral_code_updated_at) {
      const lastUpdate = new Date(profile.referral_code_updated_at).getTime();
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdate;
      
      if (timeSinceLastUpdate < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - timeSinceLastUpdate;
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        logStep("Cooldown active", { remainingHours });
        return new Response(JSON.stringify({ 
          success: false, 
          error: `You can only change your referral code once every 24 hours. Try again in ${remainingHours} hour(s).`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const { newCode } = await req.json();
    if (!newCode || typeof newCode !== "string") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "New referral code is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Validate format: alphanumeric + hyphens, 3-20 chars
    const normalizedCode = newCode.trim().toUpperCase();
    const validFormat = /^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/.test(normalizedCode) || 
                        /^[A-Z0-9]{3,20}$/.test(normalizedCode);
    
    if (!validFormat) {
      logStep("Invalid code format", { code: normalizedCode });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Referral code must be 3-20 characters, alphanumeric with optional hyphens (not at start/end)"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check uniqueness (case-insensitive)
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("referral_code", normalizedCode)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      logStep("Code already in use", { code: normalizedCode });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "This referral code is already taken" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update the referral code
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        referral_code: normalizedCode,
        referral_code_updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      const error = new Error("Failed to update referral code");
      captureError(error, { step: "update_code", userId: user.id, errorMessage: updateError.message });
      throw error;
    }

    logStep("Referral code updated successfully", { userId: user.id, newCode: normalizedCode });
    return new Response(JSON.stringify({ 
      success: true,
      referralCode: normalizedCode
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
