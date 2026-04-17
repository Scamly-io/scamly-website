import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "meta-complete-registration";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, sentry-trace, x-internal-secret",
};

const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID") ?? "1582049792855534";
const META_API_VERSION = Deno.env.get("META_API_VERSION") ?? "v25.0";

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

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeCountryLookupKey(country: string): string {
  return country
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const COUNTRY_ALIAS_TO_ISO2: Record<string, string> = {
  afghanistan: "AF",
  albania: "AL",
  algeria: "DZ",
  andorra: "AD",
  angola: "AO",
  antiguaandbarbuda: "AG",
  argentina: "AR",
  armenia: "AM",
  australia: "AU",
  austria: "AT",
  azerbaijan: "AZ",
  bahamas: "BS",
  bahrain: "BH",
  bangladesh: "BD",
  barbados: "BB",
  belarus: "BY",
  belgium: "BE",
  belize: "BZ",
  benin: "BJ",
  bhutan: "BT",
  bolivia: "BO",
  bosniaandherzegovina: "BA",
  botswana: "BW",
  brazil: "BR",
  brunei: "BN",
  bulgaria: "BG",
  burkinafaso: "BF",
  burundi: "BI",
  caboverde: "CV",
  cambodia: "KH",
  cameroon: "CM",
  canada: "CA",
  centralafricanrepublic: "CF",
  chad: "TD",
  chile: "CL",
  china: "CN",
  colombia: "CO",
  comoros: "KM",
  congodemocraticrepublic: "CD",
  congorepublic: "CG",
  costarica: "CR",
  cotedivoire: "CI",
  croatia: "HR",
  cyprus: "CY",
  czechrepublic: "CZ",
  denmark: "DK",
  djibouti: "DJ",
  dominica: "DM",
  dominicanrepublic: "DO",
  ecuador: "EC",
  egypt: "EG",
  elsalvador: "SV",
  equatorialguinea: "GQ",
  eritrea: "ER",
  estonia: "EE",
  eswatini: "SZ",
  ethiopia: "ET",
  fiji: "FJ",
  finland: "FI",
  france: "FR",
  gabon: "GA",
  gambia: "GM",
  georgia: "GE",
  germany: "DE",
  ghana: "GH",
  greece: "GR",
  grenada: "GD",
  guatemala: "GT",
  guinea: "GN",
  guineabissau: "GW",
  guyana: "GY",
  haiti: "HT",
  honduras: "HN",
  hungary: "HU",
  iceland: "IS",
  india: "IN",
  indonesia: "ID",
  iraq: "IQ",
  ireland: "IE",
  israel: "IL",
  italy: "IT",
  jamaica: "JM",
  japan: "JP",
  jordan: "JO",
  kazakhstan: "KZ",
  kenya: "KE",
  kiribati: "KI",
  kosovo: "XK",
  kuwait: "KW",
  kyrgyzstan: "KG",
  laos: "LA",
  latvia: "LV",
  lebanon: "LB",
  lesotho: "LS",
  liberia: "LR",
  libya: "LY",
  liechtenstein: "LI",
  lithuania: "LT",
  luxembourg: "LU",
  madagascar: "MG",
  malawi: "MW",
  malaysia: "MY",
  maldives: "MV",
  mali: "ML",
  malta: "MT",
  marshallislands: "MH",
  mauritania: "MR",
  mauritius: "MU",
  mexico: "MX",
  micronesia: "FM",
  moldova: "MD",
  monaco: "MC",
  mongolia: "MN",
  montenegro: "ME",
  morocco: "MA",
  mozambique: "MZ",
  myanmar: "MM",
  namibia: "NA",
  nauru: "NR",
  nepal: "NP",
  netherlands: "NL",
  newzealand: "NZ",
  nicaragua: "NI",
  niger: "NE",
  nigeria: "NG",
  northmacedonia: "MK",
  norway: "NO",
  oman: "OM",
  pakistan: "PK",
  palau: "PW",
  palestine: "PS",
  panama: "PA",
  papuanewguinea: "PG",
  paraguay: "PY",
  peru: "PE",
  philippines: "PH",
  poland: "PL",
  portugal: "PT",
  qatar: "QA",
  romania: "RO",
  russia: "RU",
  rwanda: "RW",
  saintkittsandnevis: "KN",
  saintlucia: "LC",
  saintvincentandthegrenadines: "VC",
  samoa: "WS",
  sanmarino: "SM",
  saotomeandprincipe: "ST",
  saudiarabia: "SA",
  senegal: "SN",
  serbia: "RS",
  seychelles: "SC",
  sierraleone: "SL",
  singapore: "SG",
  slovakia: "SK",
  slovenia: "SI",
  solomonislands: "SB",
  somalia: "SO",
  southafrica: "ZA",
  southkorea: "KR",
  southsudan: "SS",
  spain: "ES",
  srilanka: "LK",
  suriname: "SR",
  sweden: "SE",
  switzerland: "CH",
  taiwan: "TW",
  tajikistan: "TJ",
  tanzania: "TZ",
  thailand: "TH",
  timorleste: "TL",
  togo: "TG",
  tonga: "TO",
  trinidadandtobago: "TT",
  tunisia: "TN",
  turkey: "TR",
  turkmenistan: "TM",
  tuvalu: "TV",
  uganda: "UG",
  ukraine: "UA",
  unitedarabemirates: "AE",
  unitedkingdom: "GB",
  unitedstates: "US",
  uruguay: "UY",
  uzbekistan: "UZ",
  vanuatu: "VU",
  vaticancity: "VA",
  venezuela: "VE",
  vietnam: "VN",
  yemen: "YE",
  zambia: "ZM",
  zimbabwe: "ZW",
};

function normalizeCountryToIso2(value: unknown): string | undefined {
  const country = nonEmptyString(value);
  if (!country) return undefined;
  if (/^[A-Za-z]{2}$/.test(country)) {
    return country.toUpperCase();
  }

  const normalizedKey = normalizeCountryLookupKey(country);
  return COUNTRY_ALIAS_TO_ISO2[normalizedKey];
}

async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

type CompleteRegistrationRequest = {
  email?: unknown;
  profile_id?: unknown;
  client_ip_address?: unknown;
  client_user_agent?: unknown;
  fbc?: unknown;
  fbp?: unknown;
  country?: unknown;
};

serve(async (req) => {
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
    const internalSecret = Deno.env.get("INTERNAL_SECRET");
    if (internalSecret) {
      const internalSecretHeader = req.headers.get("x-internal-secret");
      if (internalSecretHeader !== internalSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as CompleteRegistrationRequest;

    const profileId = nonEmptyString(body.profile_id);
    if (!profileId) {
      return new Response(JSON.stringify({ error: "profile_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = nonEmptyString(body.email);
    // Use a stable event ID so retries deduplicate consistently.
    const eventId = profileId;
    const eventTime = Math.floor(Date.now() / 1000);
    let metaResponse: unknown | null = null;
    let errorMessage: string | null = null;

    if (!email) {
      errorMessage = "email is required";
    } else {
      const metaToken = Deno.env.get("META_CONVERSIONS_API_TOKEN");
      if (!metaToken) {
        errorMessage = "META_CONVERSIONS_API_TOKEN not set";
      } else {
        try {
          const [emHash, externalIdHash] = await Promise.all([
            hashString(email),
            hashString(profileId),
          ]);

          const countryCode = normalizeCountryToIso2(body.country);
          const countryHash = countryCode ? await hashString(countryCode) : undefined;

          const userData: Record<string, unknown> = {
            em: emHash,
            external_id: externalIdHash,
            ...(countryHash && { country: countryHash }),
          };

          const clientIpAddress = nonEmptyString(body.client_ip_address);
          const clientUserAgent = nonEmptyString(body.client_user_agent);
          const fbc = nonEmptyString(body.fbc);
          const fbp = nonEmptyString(body.fbp);

          if (clientIpAddress) userData.client_ip_address = clientIpAddress;
          if (clientUserAgent) userData.client_user_agent = clientUserAgent;
          if (fbc) userData.fbc = fbc;
          if (fbp) userData.fbp = fbp;

          const payload = {
            data: [
              {
                event_name: "CompleteRegistration",
                event_id: eventId,
                event_time: eventTime,
                action_source: "website",
                user_data: userData,
              },
            ],
          };

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
          } else {
            metaResponse = null;
          }

          if (!response.ok) {
            errorMessage =
              `Meta CAPI responded with ${response.status}: ${responseText || "No response body"}`;
          }
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : String(error);
          logWarn("Meta CAPI request failed", { error, profileId, eventId });
          captureError(error, { step: "meta-capi-request-failed", profileId, eventId });
        }
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("meta_capi_events")
      .insert({
        user_id: profileId,
        event_id: eventId,
        event_name: "CompleteRegistration",
        event_time: eventTime,
        meta_response: metaResponse,
        error_message: errorMessage,
      });

    if (insertError) {
      logError("Failed to insert meta_capi_events row", { profileId, eventId, insertError });
      captureError(insertError, { step: "insert-meta-capi-events-row", profileId, eventId });
      return new Response(JSON.stringify({ error: "Failed to persist event record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (errorMessage) {
      logWarn("CompleteRegistration sent with error", { profileId, eventId, errorMessage });
    } else {
      logStep("CompleteRegistration sent successfully", { profileId, eventId });
    }

    return new Response(
      JSON.stringify({
        success: errorMessage === null,
        event_id: eventId,
        error: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError("Unhandled error", { errorMessage });
    captureError(error, { step: "unhandled", errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
