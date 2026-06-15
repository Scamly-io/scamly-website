/**
 * Sunset endpoint for Android image scanning.
 *
 * The API can be called from https://rdrumcjwntyfnjhownbd.supabase.co/functions/v1/scan-image
 * It expects a POST request with a bearer token in the Authorization header.
 *
 * Returns a success response with scan_successful=false so the Android app can display
 * the shutdown message (the UI only shows scan_failure_reason on successful responses).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_NAME = "scan-image";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANDROID_SHUTDOWN_MESSAGE =
  "Scamly Android has been shut down due to low uptake of our services on this platform. Any AI tools will no longer function, however you are welcome to continue to read our library articles on staying safe from scams. We apologise for any inconvenience this has caused";

const SUNSET_SCAN_RESULT = {
  is_scam: false,
  risk_level: "",
  confidence: 0,
  detections: [
    {
      description: "unavailable",
      details: "unavailable",
      severity: "low",
    },
  ],
  scan_successful: false,
  scan_failure_reason: ANDROID_SHUTDOWN_MESSAGE,
};

function errorResponse(
  message: string,
  stage: "auth" | "processing",
  code: string,
  details: Record<string, unknown> = {},
  status: number = 500
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, stage, code, details },
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function successResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: true, data }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        "Server configuration error",
        "processing",
        "MISSING_SUPABASE_CONFIG",
        {},
        500
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "Authentication required",
        "auth",
        "AUTH_REQUIRED",
        {},
        401
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(
        "Authentication failed",
        "auth",
        "AUTH_FAILED",
        {},
        401
      );
    }

    logStep("Returning sunset response", { userId: user.id });

    return successResponse(SUNSET_SCAN_RESULT);
  } catch (error) {
    console.error(`[${FUNCTION_NAME.toUpperCase()}] Unexpected error:`, error);
    return errorResponse(
      "An unexpected error occurred",
      "processing",
      "UNEXPECTED_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
