import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { MetaAppDataPayload } from "./app-data.ts";
import { COUNTRY_ALIAS_TO_ISO2, normalizeCountryLookupKey } from "./country-aliases.ts";

export const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID") ?? "1582049792855534";
export const META_API_VERSION = Deno.env.get("META_API_VERSION") ?? "v25.0";

export type MetaEventName = "Purchase" | "StartTrial" | "CompleteRegistration";
export type MetaActionSource = "app" | "system_generated" | "website";

export function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeCountryToIso2(value: unknown): string | undefined {
  const country = nonEmptyString(value);
  if (!country) return undefined;
  if (/^[A-Za-z]{2}$/.test(country)) {
    return country.toUpperCase();
  }
  const normalizedKey = normalizeCountryLookupKey(country);
  return COUNTRY_ALIAS_TO_ISO2[normalizedKey];
}

export async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ProfileDataForCapiEvent {
  em: string;
  ipAddress: string;
  fbp?: string;
  fbc?: string;
  userAgent?: string;
}

export async function getUserEmail(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: email, error } = await supabaseAdmin.rpc("get_user_email_by_id", {
    p_user_id: userId,
  });
  if (error) return null;
  return nonEmptyString(email) ?? null;
}

export async function getProfileDataForCapiEvent(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<ProfileDataForCapiEvent | null> {
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("ip_address, fbp, fbc, user_agent")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[META-CAPI] profile fetch error", profileError);
  }

  const email = await getUserEmail(supabaseAdmin, userId);
  const ipAddress = nonEmptyString(profileData?.ip_address);
  if (!email || !ipAddress) {
    return null;
  }

  const out: ProfileDataForCapiEvent = { em: email, ipAddress };
  const fbp = nonEmptyString(profileData?.fbp);
  const fbc = nonEmptyString(profileData?.fbc);
  const userAgent = nonEmptyString(profileData?.user_agent);
  if (fbp) out.fbp = fbp;
  if (fbc) out.fbc = fbc;
  if (userAgent) out.userAgent = userAgent;
  return out;
}

export interface MetaCapiSendResult {
  eventTime: number;
  metaResponse: unknown | null;
  errorMessage: string | null;
}

export interface PersistMetaCapiEventParams {
  userId: string;
  eventId: string;
  eventName: MetaEventName;
  eventTime: number;
  metaResponse: unknown | null;
  errorMessage: string | null;
}

export async function persistMetaCapiEvent(
  supabaseAdmin: SupabaseClient,
  params: PersistMetaCapiEventParams,
): Promise<{ error: unknown | null }> {
  const { error } = await supabaseAdmin.from("meta_capi_events").insert({
    user_id: params.userId,
    event_id: params.eventId,
    event_name: params.eventName,
    event_time: params.eventTime,
    meta_response: params.metaResponse,
    error_message: params.errorMessage,
  });
  if (error) {
    console.error("[META-CAPI] persist failed", {
      error,
      userId: params.userId,
      eventId: params.eventId,
      eventName: params.eventName,
    });
  }
  return { error };
}

export interface PurchaseEventParams {
  eventName: "Purchase" | "StartTrial";
  eventId: string;
  actionSource: MetaActionSource;
  userId: string;
  em: string;
  country: string;
  externalId: string;
  clientIpAddress: string;
  contents: Record<string, unknown>[];
  value?: number;
  fbp?: string;
  fbc?: string;
  clientUserAgent?: string;
}

export async function sendPurchaseEvent(
  supabaseAdmin: SupabaseClient,
  params: PurchaseEventParams,
  options?: { testEvent?: boolean; persist?: boolean },
): Promise<MetaCapiSendResult> {
  const testEvent = options?.testEvent ?? false;
  const persist = options?.persist ?? !testEvent;
  const eventTime = Math.floor(Date.now() / 1000);
  let metaResponse: unknown | null = null;
  let errorMessage: string | null = null;

  const metaToken = Deno.env.get("META_CONVERSIONS_API_TOKEN");
  if (!metaToken) {
    errorMessage = "META_CONVERSIONS_API_TOKEN not set";
    if (persist) {
      await persistMetaCapiEvent(supabaseAdmin, {
        userId: params.userId,
        eventId: params.eventId,
        eventName: params.eventName,
        eventTime,
        metaResponse,
        errorMessage,
      });
    }
    return { eventTime, metaResponse, errorMessage };
  }

  try {
    const [emHash, countryHash, externalIdHash] = await Promise.all([
      hashString(params.em),
      hashString(params.country),
      hashString(params.externalId),
    ]);

    const userData: Record<string, unknown> = {
      em: emHash,
      country: countryHash,
      external_id: externalIdHash,
      client_ip_address: params.clientIpAddress,
    };
    if (params.fbp) userData.fbp = params.fbp;
    if (params.fbc) userData.fbc = params.fbc;
    if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;

    const customData: Record<string, unknown> = {
      contents: params.contents,
      content_type: "product",
    };
    if (params.value !== undefined) {
      customData.value = params.value;
      customData.currency = "USD";
    }

    const eventData: Record<string, unknown> = {
      event_name: params.eventName,
      event_id: params.eventId,
      event_time: eventTime,
      action_source: params.actionSource,
      user_data: userData,
      custom_data: customData,
    };

    const payload = testEvent
      ? { data: [eventData], test_event_code: "TEST8296" }
      : { data: [eventData] };

    const url =
      `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${metaToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    metaResponse = await response.json();
    if (!response.ok) {
      errorMessage =
        `Meta CAPI responded with ${response.status}: ${JSON.stringify(metaResponse)}`;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  if (persist) {
    await persistMetaCapiEvent(supabaseAdmin, {
      userId: params.userId,
      eventId: params.eventId,
      eventName: params.eventName,
      eventTime,
      metaResponse,
      errorMessage,
    });
  }

  return { eventTime, metaResponse, errorMessage };
}

export interface CompleteRegistrationParams {
  userId: string;
  email: string;
  country?: string;
  /** Meta user_data.db: YYYYMMDD (already normalized, no hyphens). */
  dobMetaDb?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  actionSource?: MetaActionSource;
  /** Required for Meta when action_source is "app"; omitted for website. */
  appData?: MetaAppDataPayload;
}

export async function sendCompleteRegistration(
  supabaseAdmin: SupabaseClient,
  params: CompleteRegistrationParams,
): Promise<MetaCapiSendResult> {
  const eventId = params.userId;
  const eventTime = Math.floor(Date.now() / 1000);
  let metaResponse: unknown | null = null;
  let errorMessage: string | null = null;

  const metaToken = Deno.env.get("META_CONVERSIONS_API_TOKEN");
  if (!metaToken) {
    errorMessage = "META_CONVERSIONS_API_TOKEN not set";
    await persistMetaCapiEvent(supabaseAdmin, {
      userId: params.userId,
      eventId,
      eventName: "CompleteRegistration",
      eventTime,
      metaResponse,
      errorMessage,
    });
    return { eventTime, metaResponse, errorMessage };
  }

  try {
    const hashPromises: Promise<string>[] = [
      hashString(params.email),
      hashString(params.userId),
    ];
    if (params.dobMetaDb) {
      hashPromises.push(hashString(params.dobMetaDb));
    }

    const hashes = await Promise.all(hashPromises);
    const emHash = hashes[0];
    const externalIdHash = hashes[1];
    const dobHash = params.dobMetaDb ? hashes[2] : undefined;

    const countryCode = normalizeCountryToIso2(params.country);
    const countryHash = countryCode ? await hashString(countryCode) : undefined;

    const userData: Record<string, unknown> = {
      em: emHash,
      external_id: externalIdHash,
      ...(countryHash && { country: countryHash }),
      ...(dobHash && { db: dobHash }),
    };
    if (params.clientIpAddress) userData.client_ip_address = params.clientIpAddress;
    if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;
    if (params.fbp) userData.fbp = params.fbp;
    if (params.fbc) userData.fbc = params.fbc;

    const actionSource = params.actionSource ?? "website";
    const eventData: Record<string, unknown> = {
      event_name: "CompleteRegistration",
      event_id: eventId,
      event_time: eventTime,
      action_source: actionSource,
      user_data: userData,
    };

    if (actionSource === "app") {
      if (!params.appData) {
        throw new Error("app_data is required for app CompleteRegistration events");
      }
      eventData.app_data = params.appData;
    }

    const payload = { data: [eventData] };

    const url =
      `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${metaToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (responseText.length > 0) {
      try {
        metaResponse = JSON.parse(responseText);
      } catch {
        metaResponse = { raw: responseText };
      }
    }

    if (!response.ok) {
      errorMessage =
        `Meta CAPI responded with ${response.status}: ${responseText || "No response body"}`;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  await persistMetaCapiEvent(supabaseAdmin, {
    userId: params.userId,
    eventId,
    eventName: "CompleteRegistration",
    eventTime,
    metaResponse,
    errorMessage,
  });

  return { eventTime, metaResponse, errorMessage };
}

export async function handlePurchaseRoute(
  supabaseAdmin: SupabaseClient,
  eventName: "Purchase" | "StartTrial",
  actionSource: MetaActionSource,
  body: Record<string, unknown>,
): Promise<MetaCapiSendResult & { skipped?: boolean }> {
  const userId = nonEmptyString(body.user_id);
  const eventId = nonEmptyString(body.event_id);
  const country = nonEmptyString(body.country);

  if (!userId || !eventId || !country) {
    return {
      eventTime: Math.floor(Date.now() / 1000),
      metaResponse: null,
      errorMessage: "user_id, event_id, and country are required",
    };
  }

  const profileData = await getProfileDataForCapiEvent(supabaseAdmin, userId);
  const value = body.value !== undefined && body.value !== null
    ? parseFloat(String(body.value))
    : undefined;
  const plan = nonEmptyString(body.plan) ?? "premium-monthly";

  if (!profileData) {
    const eventTime = Math.floor(Date.now() / 1000);
    const errorMessage = `Failed to get profile data for ${eventName}`;
    await persistMetaCapiEvent(supabaseAdmin, {
      userId,
      eventId,
      eventName,
      eventTime,
      metaResponse: null,
      errorMessage,
    });
    return { eventTime, metaResponse: null, errorMessage, skipped: true };
  }

  return sendPurchaseEvent(supabaseAdmin, {
    eventName,
    eventId,
    actionSource,
    userId,
    em: profileData.em,
    country,
    externalId: userId,
    clientIpAddress: profileData.ipAddress,
    contents: [{
      id: plan,
      quantity: 1,
      ...(value !== undefined && !Number.isNaN(value) && { item_price: value }),
    }],
    value: value !== undefined && !Number.isNaN(value) ? value : undefined,
    fbp: profileData.fbp,
    fbc: profileData.fbc,
    clientUserAgent: profileData.userAgent,
  });
}
