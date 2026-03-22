import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "revenuecat-webhook";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
};

// Initialize Sentry
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

// ── Logging helpers ──────────────────────────────────────────────────────────

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

const logWarn = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.warn(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

const logError = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.error(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

const captureError = (error: unknown, context: Record<string, unknown>) => {
  if (!sentryDsn) return;
  Sentry.withScope((scope: any) => {
    scope.setTag("function", FUNCTION_NAME);
    scope.setTag("source", "edge-function");
    scope.setContext("details", context);
    Sentry.captureException(error);
  });
};

// ── Meta Conversions API ─────────────────────────────────────────────────────

const META_PIXEL_ID = "1582049792855534";
const META_API_VERSION = "v25.0";

/**
 * Send an event to Meta Conversions API.
 * - "StartTrial" for trial starts (no value).
 * - "Purchase" for paid subscriptions / renewals (includes value).
 * @param eventName  Meta standard event name
 * @param eventId    Unique ID for deduplication (derived from RC event ID)
 * @param value      Purchase amount in USD (omit for trials)
 */
const sendMetaConversionEvent = async (
  eventName: "Purchase" | "StartTrial",
  eventId: string,
  value?: number,
) => {
  const metaToken = Deno.env.get("META_CONVERSIONS_API_TOKEN");
  if (!metaToken) {
    logWarn("META_CONVERSIONS_API_TOKEN not set, skipping Meta CAPI event");
    return;
  }

  try {
    const eventTime = Math.floor(Date.now() / 1000);

    const eventData: Record<string, unknown> = {
      event_name: eventName,
      event_id: eventId,
      event_time: eventTime,
      action_source: "other",
    };

    if (value !== undefined && value > 0) {
      eventData.custom_data = {
        value,
        currency: "USD",
      };
    }

    const payload = { data: [eventData] };

    const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${metaToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Meta CAPI responded with ${response.status}: ${errorBody}`);
    }

    logStep("Meta CAPI event sent", { eventName, eventId });
  } catch (error) {
    logWarn("Failed to send Meta CAPI event", { error, eventName, eventId });
    captureError(error, { step: "meta-capi-event-failed", eventName, eventId });
    // Don't throw – tracking failure should not break the webhook
  }
};

// ── Product ID mapping ───────────────────────────────────────────────────────

const PRODUCT_TO_PLAN: Record<string, string> = {
  scamly_premium_monthly: "premium-monthly",
  scamly_premium_yearly: "premium-yearly",
};

function mapProductToPlan(productId: string | null): string {
  if (!productId) return "free";
  return PRODUCT_TO_PLAN[productId] || "premium-monthly";
}

// ── Customer email helper ────────────────────────────────────────────────────

/**
 * Fire-and-forget call to the send-customer-email edge function.
 * Failures are logged + captured but never block webhook processing.
 */
const sendCustomerEmail = async (
  supabaseAdmin: any,
  payload: Record<string, unknown>,
) => {
  try {
    const { error } = await supabaseAdmin.functions.invoke("send-customer-email", {
      body: payload,
    });
    if (error) {
      logWarn("send-customer-email invocation returned error", { error, payload });
      captureError(new Error("send-customer-email failed"), { step: "send-customer-email", payload, errorMessage: String(error) });
    } else {
      logStep("Customer email triggered", { type: payload.type, userId: payload.userId });
    }
  } catch (err) {
    logWarn("Failed to invoke send-customer-email", { err, payload });
    captureError(err, { step: "send-customer-email-invoke", payload });
  }
};

/**
 * Derive billing period label and formatted price from a RevenueCat event.
 */
function deriveBillingDetails(productId: string | null, event: Record<string, unknown>) {
  const isYearly = productId?.includes("yearly");
  const billingPeriod = isYearly ? "Yearly" : "Monthly";

  const rawPrice = event.price ? parseFloat(String(event.price)) : null;
  const amount = rawPrice !== null ? rawPrice.toFixed(2) : (isYearly ? "49.99" : "4.99");
  const formattedPrice = `${amount} USD`;

  return { billingPeriod, formattedPrice };
}

/**
 * Format an ISO date string to a human-readable date (e.g. "Saturday, 28 March 2026").
 */
function formatReadableDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Determine the store type from the RevenueCat event's `store` field.
 */
function mapStore(store: string | undefined): string | null {
  if (!store) return null;
  const s = store.toUpperCase();
  if (s === "APP_STORE" || s === "MAC_APP_STORE") return "app_store";
  if (s === "PLAY_STORE") return "play_store";
  if (s === "STRIPE") return "stripe";
  return store.toLowerCase();
}

// ── Idempotency helpers ──────────────────────────────────────────────────────

async function checkDuplicateEvent(
  supabaseAdmin: any,
  eventId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("processed_revenuecat_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (data) {
    logStep("Duplicate event detected, skipping", { eventId });
    return true;
  }
  return false;
}

async function insertProcessedEvent(
  supabaseAdmin: any,
  eventId: string,
  eventType: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("processed_revenuecat_events")
    .insert({ id: eventId, event_type: eventType });
  if (error) {
    // Unique constraint = another worker already processed it — that's fine
    if (error.code !== "23505") {
      logWarn("Failed to insert processed event", { eventId, error });
    }
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // ── Auth: verify bearer token matches project anon key ───────────────
    const authHeader = req.headers.get("Authorization");
    const expectedAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!expectedAnonKey) {
      throw new Error("SUPABASE_ANON_KEY is not configured");
    }

    if (!authHeader || authHeader !== `Bearer ${expectedAnonKey}`) {
      logError("Unauthorized webhook request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Authorization verified");

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await req.json();
    const event = body.event;

    if (!event) {
      logError("No event in request body", { body });
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType: string = event.type;
    const eventId: string = event.id || `${eventType}_${Date.now()}`;
    const appUserId: string =
      event.app_user_id || event.original_app_user_id || "";
    const productId: string | null =
      event.product_id || null;
    const store: string | null = mapStore(event.store);
    const expirationAtMs: number | null =
      event.expiration_at_ms || null;
    const periodType: string | null = event.period_type || null;

    logStep("Event received", { eventType, eventId, appUserId, productId, store, periodType });

    if (!appUserId) {
      logError("No app_user_id in event", { event });
      captureError(new Error("No app_user_id in RevenueCat event"), {
        step: "missing-app-user-id",
        eventType,
      });
      return new Response(JSON.stringify({ error: "Missing app_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Supabase admin client ────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // ── Idempotency check ────────────────────────────────────────────────
    const isDuplicate = await checkDuplicateEvent(supabaseAdmin, eventId);
    if (isDuplicate) {
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Compute common values
    const expirationDate = expirationAtMs
      ? new Date(expirationAtMs).toISOString()
      : null;
    const plan = mapProductToPlan(productId);

    // ── Event handling ───────────────────────────────────────────────────
    switch (eventType) {
      /**
       * INITIAL_PURCHASE
       * New subscription or trial started.
       */
      case "INITIAL_PURCHASE": {
        const isTrial = periodType === "TRIAL";
        const status = isTrial ? "trialing" : "active";

        logStep("Processing INITIAL_PURCHASE", { isTrial, plan, store });

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: status,
            subscription_plan: plan,
            subscription_product_id: productId,
            subscription_store: store,
            subscription_current_period_end: expirationDate,
            billing_issue: false,
            access_expires_at: null,
          })
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for INITIAL_PURCHASE", { error, appUserId });
          captureError(error, { step: "initial-purchase-update", appUserId });
          throw error;
        }

        logStep("INITIAL_PURCHASE processed successfully", { appUserId, status });

        // Meta CAPI: trial start or paid subscription start
        if (isTrial) {
          await sendMetaConversionEvent("StartTrial", `rc_trial_${eventId}`);
        } else {
          const price = event.price ? parseFloat(event.price) : 0;
          await sendMetaConversionEvent("Purchase", `rc_purchase_${eventId}`, price > 0 ? price : undefined);
        }

        // Send customer email
        {
          const { billingPeriod, price: formattedPrice } = deriveBillingDetails(productId, event);
          const nextPayment = formatReadableDate(expirationDate || new Date().toISOString());

          if (isTrial) {
            await sendCustomerEmail(supabaseAdmin, {
              type: "free_trial_created",
              userId: appUserId,
              price: formattedPrice,
              billingPeriod,
              nextPayment,
            });
          } else {
            await sendCustomerEmail(supabaseAdmin, {
              type: "subscription_created",
              userId: appUserId,
              price: formattedPrice,
              billingPeriod,
              nextPayment,
            });
          }
        }

        break;
      }

      /**
       * RENEWAL
       * Subscription renewed (auto-renew, trial conversion, billing recovery).
       */
      case "RENEWAL": {
        const isConversion = periodType === "NORMAL";
        logStep("Processing RENEWAL", { plan, isConversion, store });

        const updateData: Record<string, unknown> = {
          subscription_status: "active",
          subscription_current_period_end: expirationDate,
          billing_issue: false,
          access_expires_at: null,
        };

        // If product info is present, update it (handles product changes on App Store)
        if (productId) {
          updateData.subscription_plan = plan;
          updateData.subscription_product_id = productId;
        }
        if (store) {
          updateData.subscription_store = store;
        }

        const { error } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for RENEWAL", { error, appUserId });
          captureError(error, { step: "renewal-update", appUserId });
          throw error;
        }

        logStep("RENEWAL processed successfully", { appUserId });

        // Meta CAPI: payment on renewal
        const renewalPrice = event.price ? parseFloat(event.price) : 0;
        if (renewalPrice > 0) {
          await sendMetaConversionEvent("Purchase", `rc_renewal_${eventId}`, renewalPrice);
        }

        break;
      }

      /**
       * PRODUCT_CHANGE
       * User changed subscription product (upgrade/downgrade).
       */
      case "PRODUCT_CHANGE": {
        const newProductId: string | null = event.new_product_id || productId;
        const newPlan = mapProductToPlan(newProductId);

        logStep("Processing PRODUCT_CHANGE", { newProductId, newPlan });

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_plan: newPlan,
            subscription_product_id: newProductId,
            subscription_current_period_end: expirationDate,
          })
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for PRODUCT_CHANGE", { error, appUserId });
          captureError(error, { step: "product-change-update", appUserId });
          throw error;
        }

        logStep("PRODUCT_CHANGE processed successfully", { appUserId, newPlan });
        break;
      }

      /**
       * CANCELLATION
       * User cancelled (or billing-issue cancellation).
       * Access is NOT revoked here — that happens on EXPIRATION.
       * Only send the manual_cancellation email if the user actively cancelled
       * (i.e. cancel_reason is NOT BILLING_ERROR).
       */
      case "CANCELLATION": {
        const cancelReason: string | null = event.cancel_reason || null;
        const isBillingCancel = cancelReason === "BILLING_ERROR";
        logStep("Processing CANCELLATION", { cancelReason, isBillingCancel });

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "cancelled",
            access_expires_at: expirationDate,
            ...(isBillingCancel ? { billing_issue: true } : {}),
          })
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for CANCELLATION", { error, appUserId });
          captureError(error, { step: "cancellation-update", appUserId });
          throw error;
        }

        logStep("CANCELLATION processed successfully", { appUserId, cancelReason });

        // Only send manual cancellation email for user-initiated cancellations
        if (!isBillingCancel) {
          await sendCustomerEmail(supabaseAdmin, {
            type: "manual_cancellation",
            userId: appUserId,
            accessExpiresAt: expirationDate,
          });
        }

        break;
      }

      /**
       * BILLING_ISSUE
       * Payment failed — user retains access during grace period.
       */
      case "BILLING_ISSUE": {
        logStep("Processing BILLING_ISSUE");

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            billing_issue: true,
          })
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for BILLING_ISSUE", { error, appUserId });
          captureError(error, { step: "billing-issue-update", appUserId });
          throw error;
        }

        logStep("BILLING_ISSUE processed successfully", { appUserId });
        break;
      }

      /**
       * UNCANCELLATION
       * User reversed their cancellation — restore active state.
       */
      case "UNCANCELLATION": {
        logStep("Processing UNCANCELLATION");

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "active",
            access_expires_at: null,
            billing_issue: false,
          })
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for UNCANCELLATION", { error, appUserId });
          captureError(error, { step: "uncancellation-update", appUserId });
          throw error;
        }

        logStep("UNCANCELLATION processed successfully", { appUserId });
        break;
      }

      /**
       * EXPIRATION
       * Subscription fully expired — revoke all premium access.
       * This fires after both normal cancellations and billing-issue cancellations.
       * Only send the forced_cancellation email if the expiration is due to
       * a billing error (the user didn't choose to cancel).
       */
      case "EXPIRATION": {
        const expirationReason: string | null = event.expiration_reason || null;
        const isBillingExpiration = expirationReason === "BILLING_ERROR";
        logStep("Processing EXPIRATION", { expirationReason, isBillingExpiration });

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "free",
            subscription_plan: "free",
            subscription_id: null,
            subscription_product_id: null,
            subscription_current_period_end: null,
            billing_issue: false,
            access_expires_at: expirationDate || new Date().toISOString(),
          })
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for EXPIRATION", { error, appUserId });
          captureError(error, { step: "expiration-update", appUserId });
          throw error;
        }

        logStep("EXPIRATION processed successfully", { appUserId });

        // Only send forced_cancellation email for billing-error expirations.
        // Normal expirations (user cancelled voluntarily) already received
        // a manual_cancellation email at the CANCELLATION event.
        if (isBillingExpiration) {
          await sendCustomerEmail(supabaseAdmin, {
            type: "forced_cancellation",
            userId: appUserId,
          });
        }

        break;
      }

      /**
       * TRANSFER
       * Entitlements transferred between users.
       * transferred_from = source (revoke), transferred_to = destination (grant)
       */
      case "TRANSFER": {
        const transferredFrom: string[] = event.transferred_from || [];
        const transferredTo: string[] = event.transferred_to || [];

        logStep("Processing TRANSFER", { transferredFrom, transferredTo });

        // Revoke from source users
        for (const sourceUserId of transferredFrom) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "free",
              subscription_plan: "free",
              subscription_id: null,
              subscription_product_id: null,
              subscription_store: null,
              subscription_current_period_end: null,
              billing_issue: false,
              access_expires_at: new Date().toISOString(),
            })
            .eq("id", sourceUserId);

          if (error) {
            logError("Failed to revoke from source user in TRANSFER", { error, sourceUserId });
            captureError(error, { step: "transfer-revoke", sourceUserId });
          }
        }

        // Grant to destination users
        for (const destUserId of transferredTo) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "active",
              subscription_plan: plan,
              subscription_product_id: productId,
              subscription_store: store,
              subscription_current_period_end: expirationDate,
              billing_issue: false,
              access_expires_at: null,
            })
            .eq("id", destUserId);

          if (error) {
            logError("Failed to grant to destination user in TRANSFER", { error, destUserId });
            captureError(error, { step: "transfer-grant", destUserId });
          }
        }

        logStep("TRANSFER processed successfully");
        break;
      }

      /**
       * TEMPORARY_ENTITLEMENT_GRANT
       * Temporary access granted by RevenueCat during connectivity issues.
       */
      case "TEMPORARY_ENTITLEMENT_GRANT": {
        logStep("Processing TEMPORARY_ENTITLEMENT_GRANT");

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_current_period_end: expirationDate,
          })
          .eq("id", appUserId);

        if (error) {
          logError("Failed to update profile for TEMPORARY_ENTITLEMENT_GRANT", { error, appUserId });
          captureError(error, { step: "temporary-grant-update", appUserId });
          throw error;
        }

        logStep("TEMPORARY_ENTITLEMENT_GRANT processed successfully", { appUserId });
        break;
      }

      default: {
        logWarn("Unhandled event type", { eventType });
        break;
      }
    }

    // Record processed event
    await insertProcessedEvent(supabaseAdmin, eventId, eventType);

    logStep("Event processing complete", { eventType, eventId, appUserId });

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError("ERROR in revenuecat-webhook", { message: errorMessage });

    if (error instanceof Error && sentryDsn) {
      captureError(error, { step: "unhandled", message: errorMessage });
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
