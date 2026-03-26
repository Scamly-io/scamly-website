import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Redis } from "https://esm.sh/@upstash/redis";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@latest";

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

/**
 * Look up a Resend contact by email and return their ID (or null).
 */
async function findResendContactByEmail(
  email: string,
  apiKey: string,
  audienceId: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    logStep("Failed to list contacts", { status: res.status, body });
    throw new Error(`Resend list contacts failed: ${res.status}`);
  }

  const data = await res.json();
  const contacts = data?.data || [];
  const match = contacts.find(
    (c: { email: string }) => c.email.toLowerCase() === email.toLowerCase()
  );
  return match?.id || null;
}

/**
 * Delete a Resend contact by their contact ID.
 */
async function deleteResendContact(
  contactId: string,
  apiKey: string,
  audienceId: string
): Promise<void> {
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts/${contactId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    logStep("Failed to delete contact", { status: res.status, body });
    throw new Error(`Resend delete contact failed: ${res.status}`);
  }
}

/**
 * Create a Resend contact.
 */
async function createResendContact(
  email: string,
  firstName: string | undefined,
  apiKey: string,
  audienceId: string
): Promise<unknown> {
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        first_name: firstName || undefined,
        unsubscribed: false,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    logStep("Failed to create contact", { status: res.status, data });
    throw new Error(`Resend create contact failed: ${res.status}`);
  }

  return data;
}

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

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_AUDIENCE_ID = Deno.env.get("RESEND_AUDIENCE_ID");
  const SENTRY_DSN = Deno.env.get("SENTRY_DSN");

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    console.error("RESEND_API_KEY or RESEND_AUDIENCE_ID not configured");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const action = body.action || "create";

    logStep("Request received", { action });

    // ── CREATE ──────────────────────────────────────────────────────────
    if (action === "create") {
      // Protected by internal secret (called from pg_net trigger)
      const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET");
      if (!INTERNAL_SECRET) {
        console.error("INTERNAL_SECRET not configured");
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

      const { email, first_name } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await createResendContact(email, first_name, RESEND_API_KEY, RESEND_AUDIENCE_ID);
      logStep("Contact created", { email });

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE ──────────────────────────────────────────────────────────
    if (action === "update") {
      // Requires authenticated user
      const userId = await authenticateUser(req.headers.get("Authorization"));
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: 5 per day
      const rateLimitOk = await checkRateLimit(`resend-update:${userId}`, 5, 86400);
      if (!rateLimitOk) {
        logStep("Rate limited (update)", { userId });
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { old_email, new_email, first_name } = body;
      if (!old_email || !new_email) {
        return new Response(JSON.stringify({ error: "old_email and new_email are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete old contact if it exists
      const oldContactId = await findResendContactByEmail(old_email, RESEND_API_KEY, RESEND_AUDIENCE_ID);
      if (oldContactId) {
        await deleteResendContact(oldContactId, RESEND_API_KEY, RESEND_AUDIENCE_ID);
        logStep("Old contact deleted", { old_email });
      } else {
        logStep("Old contact not found, skipping delete", { old_email });
      }

      // Create new contact
      const data = await createResendContact(new_email, first_name, RESEND_API_KEY, RESEND_AUDIENCE_ID);
      logStep("New contact created", { new_email });

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE ──────────────────────────────────────────────────────────
    if (action === "delete") {
      // Requires authenticated user
      const userId = await authenticateUser(req.headers.get("Authorization"));
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: 1 per day
      const rateLimitOk = await checkRateLimit(`resend-delete:${userId}`, 1, 86400);
      if (!rateLimitOk) {
        logStep("Rate limited (delete)", { userId });
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contactId = await findResendContactByEmail(email, RESEND_API_KEY, RESEND_AUDIENCE_ID);
      if (contactId) {
        await deleteResendContact(contactId, RESEND_API_KEY, RESEND_AUDIENCE_ID);
        logStep("Contact deleted", { email });
      } else {
        logStep("Contact not found for deletion", { email });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message });

    // Report to Sentry via fetch (edge functions can't use the SDK directly)
    try {
      const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
      if (SENTRY_DSN) {
        // Parse DSN: https://<key>@<host>/<project_id>
        const dsnUrl = new URL(SENTRY_DSN);
        const projectId = dsnUrl.pathname.replace("/", "");
        const sentryKey = dsnUrl.username;
        const sentryHost = dsnUrl.hostname;

        await fetch(`https://${sentryHost}/api/${projectId}/store/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${sentryKey}, sentry_client=edge-function/1.0`,
          },
          body: JSON.stringify({
            event_id: crypto.randomUUID().replace(/-/g, ""),
            timestamp: new Date().toISOString(),
            level: "error",
            logger: FUNCTION_NAME,
            platform: "node",
            server_name: FUNCTION_NAME,
            exception: {
              values: [
                {
                  type: err instanceof Error ? err.constructor.name : "Error",
                  value: message,
                },
              ],
            },
            tags: {
              source: "edge-function",
              function_name: FUNCTION_NAME,
            },
          }),
        });
      }
    } catch (sentryErr) {
      console.error("Failed to report to Sentry:", sentryErr);
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
