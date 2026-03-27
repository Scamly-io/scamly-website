import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Redis } from "https://esm.sh/@upstash/redis";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@latest";
import { Resend } from "https://esm.sh/resend";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "resend-contact-sync";

function getCorsHeaders(req: Request) {
  const requestHeaders = req.headers.get("Access-Control-Request-Headers") || "";
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": requestHeaders || "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[${FUNCTION_NAME}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const logError = (error: unknown, details?: unknown) => {
  console.error(`[${FUNCTION_NAME}] ERROR - ${JSON.stringify(error)}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const audienceId = Deno.env.get("RESEND_AUDIENCE_ID")!;


const sentryDsn = Deno.env.get("SENTRY_DSN");
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    tracesSampleRate: 0.1,
    beforeSend(event: any) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
      }
      return event;
    },
  });
}

/**
 * Captures an error in Sentry
 * @param error 
 * @param context - Additional error details
 */
const captureError = (error: unknown, context: Record<string, unknown>) => {
  if (!sentryDsn) return;
  Sentry.withScope((scope: any) => {
    scope.setTag("function", FUNCTION_NAME);
    scope.setTag("source", "edge-function");
    scope.setContext("details", context);
    Sentry.captureException(error);
  });
};

/**
 * Authenticate a user via their JWT token.
 * Returns the user ID or null.
 */
async function authenticateUser(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error } = await supabaseAdmin.auth.getClaims(token);
  if (error || !claimsData?.claims) return null;

  return claimsData.claims.sub as string;
}

/**
 * Apply rate limiting using Upstash Redis.
 */
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const redis = new Redis({
    url: Deno.env.get("REDIS_URL")!,
    token: Deno.env.get("REDIS_TOKEN")!,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    analytics: false,
  });

  const { success } = await ratelimit.limit(key);
  return success;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const action = body.action || "create";

    logStep("Request received", { action });

    switch (action) {
      case "create":
        return await handleCreateContact(body);
      case "update":
        return await handleUpdateContact(body);
      case "delete":
        return await handleDeleteContact(body);
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(error);
    captureError(error, { message });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /**
   * Handles the creation of a Resend contact
   * @param body 
   * @returns 
   */
  async function handleCreateContact(body: { email: string }) {
    const { email } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET");
    if (!INTERNAL_SECRET) {
      captureError(new Error("INTERNAL_SECRET not configured"), { action: "create-contact" });
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const internalSecretHeader = req.headers.get("x-internal-secret");
    if (internalSecretHeader !== INTERNAL_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await resend.contacts.create({
      email: email,
      unsubscribed: false,
      segments: [{ id: audienceId }],
    });

    if (error) {
      captureError(error, { email });
      return new Response(JSON.stringify({ error: "Failed to create contact" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /**
   * Handles updating a Resend contact. Works by deleting the old contact and creating a new one.
   * @param body
   * @returns 
   */
  async function handleUpdateContact(body: { old_email: string, new_email: string }) {
    const { old_email, new_email } = body;
    if (!old_email || !new_email) {
      return new Response(JSON.stringify({ error: "old_email and new_email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await authenticateUser(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimitOk = await checkRateLimit(`resend-update:${userId}`, 5, 86400);
    if (!rateLimitOk) {
      logStep("Rate limited (update)", { userId });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { removeError } = await resend.contacts.remove({
      email: old_email,
    })

    if (removeError) {
      captureError(removeError, { userId, old_email });
      return new Response(JSON.stringify({ error: "Failed to delete contact" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createError } = await resend.contacts.create({
      email: new_email,
      unsubscribed: false,
      segments: [{ id: audienceId }],
    });

    if (createError) {
      captureError(createError, { userId, new_email });
      return new Response(JSON.stringify({ error: "Failed to create contact" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /**
   * Handles the deletion of a Resend contact
   * @param body 
   * @returns 
   */
  async function handleDeleteContact(body: { email: string }) {
    const { email } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await authenticateUser(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimitOk = await checkRateLimit(`resend-delete:${userId}`, 1, 86400);
    if (!rateLimitOk) {
      logStep("Rate limited (delete)", { userId });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await resend.contacts.remove({
      email: email,
    });

    if (error) {
      captureError(error, { userId });
      return new Response(JSON.stringify({ error: "Failed to delete contact" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});