/**
 * Sunset endpoint for Android AI chat.
 *
 * Returns a generic ai_response error so the Android app shows a user-safe message
 * without exposing shutdown details in the error payload.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_NAME = "ai-chat";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Conversation-Id",
};

function errorResponse(
  message: string,
  stage: "auth" | "ai_response" | "processing",
  code: string,
  details: Record<string, unknown> = {},
  status = 500
) {
  console.error(`[${code}] ${message}`, details);
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message,
        stage,
        code,
        details,
      },
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        "Server configuration error",
        "processing",
        "CONFIG_ERROR",
        {},
        500
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "Missing authorization header",
        "auth",
        "MISSING_AUTH",
        {},
        401
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "Authentication failed",
        "auth",
        "AUTH_FAILED",
        {},
        401
      );
    }

    console.log(`[${FUNCTION_NAME}] Returning sunset response for user ${user.id}`);

    return errorResponse(
      "Error generating AI response.",
      "ai_response",
      "APP_SUNSET",
      {},
      502
    );
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Unexpected error:`, error);
    return errorResponse(
      "An unexpected error occurred",
      "processing",
      "UNEXPECTED_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
