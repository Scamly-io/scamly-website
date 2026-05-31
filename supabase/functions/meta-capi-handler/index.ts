import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";
import { parseAppData, type MetaAppDataPayload } from "./app-data.ts";
import { dobYyyyMmDdToMetaDb, normalizeDobToYyyyMmDd } from "./dob.ts";
import {
  getUserEmail,
  handlePurchaseRoute,
  nonEmptyString,
  persistMetaCapiEvent,
  sendCompleteRegistration,
  sendPurchaseEvent,
  type MetaActionSource,
} from "./meta-capi.ts";

const FUNCTION_NAME = "meta-capi-handler";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, sentry-trace, x-internal-secret",
};

const sentryDsn = Deno.env.get("SENTRY_DSN");
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    tracesSampleRate: 0.1,
    beforeSend(event: { request?: { headers?: Record<string, string> } }) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
      }
      return event;
    },
  });
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

const logWarn = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.warn(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

const captureError = (error: unknown, context: Record<string, unknown>) => {
  if (!sentryDsn) return;
  Sentry.withScope((scope: {
    setTag: (k: string, v: string) => void;
    setContext: (k: string, v: Record<string, unknown>) => void;
    captureException: (e: unknown) => void;
  }) => {
    scope.setTag("function", FUNCTION_NAME);
    scope.setTag("source", "edge-function");
    scope.setContext("details", context);
    scope.captureException(error);
  });
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRoute(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const idx = segments.indexOf("meta-capi-handler");
  if (idx !== -1 && segments[idx + 1]) {
    return segments[idx + 1];
  }
  const last = segments[segments.length - 1];
  const routes = [
    "complete-registration",
    "trial-start",
    "purchase",
    "renewal",
    "test-purchase",
  ];
  return routes.includes(last) ? last : null;
}

function verifyInternalSecret(req: Request): boolean {
  const internalSecret = Deno.env.get("INTERNAL_SECRET");
  if (!internalSecret) return true;
  return req.headers.get("x-internal-secret") === internalSecret;
}

async function authenticateUser(
  authHeader: string | null,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

type CompleteRegistrationBody = {
  first_name?: unknown;
  country?: unknown;
  dob?: unknown;
  gender?: unknown;
  referral_source?: unknown;
  /** Stored on profiles only; not sent to Meta. */
  signup_reason?: unknown;
  ip_address?: unknown;
  user_agent?: unknown;
  fbp?: unknown;
  fbc?: unknown;
  action_source?: unknown;
  app_data?: unknown;
};

function parseActionSource(value: unknown): MetaActionSource {
  const source = nonEmptyString(value);
  if (source === "app" || source === "website") return source;
  return "website";
}

async function handleCompleteRegistration(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<Response> {
  const userId = await authenticateUser(req.headers.get("Authorization"), supabaseAdmin);
  if (!userId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const body = (await req.json()) as CompleteRegistrationBody;
  const firstName = nonEmptyString(body.first_name);
  const country = nonEmptyString(body.country);

  if (!firstName || !country) {
    return jsonResponse({ error: "first_name and country are required" }, 400);
  }

  const actionSource = parseActionSource(body.action_source);
  let appData: MetaAppDataPayload | undefined;

  if (actionSource === "app") {
    const parsed = parseAppData(body.app_data);
    if ("error" in parsed) {
      return jsonResponse({ error: parsed.error }, 400);
    }
    appData = parsed.data;
  } else if (body.app_data !== null && body.app_data !== undefined) {
    logWarn("Ignoring app_data for website CompleteRegistration", { userId });
  }

  const profileUpdate: Record<string, unknown> = {
    first_name: firstName,
    country,
    onboarding_completed: true,
  };

  const dobRaw = nonEmptyString(body.dob);
  const gender = nonEmptyString(body.gender);
  const referralSource = nonEmptyString(body.referral_source);
  const signupReason = nonEmptyString(body.signup_reason);
  const ipAddress = nonEmptyString(body.ip_address);
  const userAgent = nonEmptyString(body.user_agent);
  const fbp = nonEmptyString(body.fbp);
  const fbc = nonEmptyString(body.fbc);

  let dobForProfile: string | undefined;
  let dobMetaDb: string | undefined;
  if (dobRaw) {
    const normalizedDob = normalizeDobToYyyyMmDd(dobRaw);
    if ("error" in normalizedDob) {
      return jsonResponse({ error: normalizedDob.error }, 400);
    }
    dobForProfile = normalizedDob.value;
    dobMetaDb = dobYyyyMmDdToMetaDb(normalizedDob.value);
  }

  if (dobForProfile) profileUpdate.dob = dobForProfile;
  if (gender) profileUpdate.gender = gender;
  if (referralSource) profileUpdate.referral_source = referralSource;
  if (ipAddress) profileUpdate.ip_address = ipAddress;
  if (userAgent) profileUpdate.user_agent = userAgent;
  if (fbp) profileUpdate.fbp = fbp;
  if (fbc) profileUpdate.fbc = fbc;
  if (appData) profileUpdate.app_data = appData;

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (profileError) {
    captureError(profileError, { step: "complete-registration-profile-update", userId });
    return jsonResponse({ error: "Failed to update profile" }, 500);
  }

  // Best-effort only: optional field for an unreleased app build. Must not block signup
  // if the column is missing, the client omits the field, or persistence fails.
  if (signupReason) {
    const { error: signupReasonError } = await supabaseAdmin
      .from("profiles")
      .update({ signup_reason: signupReason })
      .eq("id", userId);

    if (signupReasonError) {
      logWarn("signup_reason not persisted; registration continues", {
        userId,
        message: signupReasonError.message,
      });
      captureError(signupReasonError, {
        step: "complete-registration-signup-reason",
        userId,
      });
    }
  }

  const email = await getUserEmail(supabaseAdmin, userId);
  const eventId = userId;

  if (!email) {
    const eventTime = Math.floor(Date.now() / 1000);
    const errorMessage = "Failed to resolve user email";
    await persistMetaCapiEvent(supabaseAdmin, {
      userId,
      eventId,
      eventName: "CompleteRegistration",
      eventTime,
      metaResponse: null,
      errorMessage,
    });
    return jsonResponse({ success: false, event_id: eventId, error: errorMessage });
  }

  const result = await sendCompleteRegistration(supabaseAdmin, {
    userId,
    email,
    country,
    dobMetaDb,
    clientIpAddress: ipAddress,
    clientUserAgent: userAgent,
    fbp,
    fbc,
    actionSource,
    appData,
  });

  if (result.errorMessage) {
    logWarn("CompleteRegistration sent with error", { userId, eventId, error: result.errorMessage });
  } else {
    logStep("CompleteRegistration sent successfully", { userId, eventId });
  }

  return jsonResponse({
    success: result.errorMessage === null,
    event_id: eventId,
    error: result.errorMessage,
  });
}

async function handleTestPurchase(
  body: Record<string, unknown>,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<Response> {
  const eventId = nonEmptyString(body.event_id) ?? `test_${Date.now()}`;
  const country = nonEmptyString(body.country) ?? "us";
  const email = nonEmptyString(body.email) ?? "admin@scamly.io";
  const externalId = nonEmptyString(body.external_id) ?? "test_user";
  const clientIpAddress = nonEmptyString(body.client_ip_address) ?? "127.0.0.1";
  const clientUserAgent = nonEmptyString(body.client_user_agent) ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
  const value = body.value !== undefined ? parseFloat(String(body.value)) : 4.99;

  const result = await sendPurchaseEvent(
    supabaseAdmin,
    {
      eventName: "Purchase",
      eventId,
      actionSource: "website",
      userId: externalId,
      em: email,
      country,
      externalId,
      clientIpAddress,
      clientUserAgent,
      contents: [{ id: "revenuecat_test", quantity: 1 }],
      value: Number.isNaN(value) ? 4.99 : value,
    },
    { testEvent: true, persist: false },
  );

  return jsonResponse({
    success: result.errorMessage === null,
    event_id: eventId,
    error: result.errorMessage,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const route = getRoute(new URL(req.url).pathname);
  if (!route) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (route === "complete-registration") {
      return await handleCompleteRegistration(req, supabaseAdmin);
    }

    if (!verifyInternalSecret(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as Record<string, unknown>;

    switch (route) {
      case "trial-start": {
        const result = await handlePurchaseRoute(
          supabaseAdmin,
          "StartTrial",
          "app",
          body,
        );
        return jsonResponse({
          success: result.errorMessage === null,
          event_id: nonEmptyString(body.event_id),
          error: result.errorMessage,
        });
      }
      case "purchase": {
        const result = await handlePurchaseRoute(
          supabaseAdmin,
          "Purchase",
          "website",
          body,
        );
        return jsonResponse({
          success: result.errorMessage === null,
          event_id: nonEmptyString(body.event_id),
          error: result.errorMessage,
        });
      }
      case "renewal": {
        const result = await handlePurchaseRoute(
          supabaseAdmin,
          "Purchase",
          "system_generated",
          body,
        );
        return jsonResponse({
          success: result.errorMessage === null,
          event_id: nonEmptyString(body.event_id),
          error: result.errorMessage,
        });
      }
      case "test-purchase":
        return await handleTestPurchase(body, supabaseAdmin);
      default:
        return jsonResponse({ error: "Not found" }, 404);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWarn("Unhandled error", { route, errorMessage });
    captureError(error, { step: "unhandled", route, errorMessage });
    return jsonResponse({ error: errorMessage }, 500);
  }
});
