/**
 * Consent-Gated Analytics
 *
 * Listens for CookieYes consent events and only initialises PostHog
 * when the user has granted analytics consent. Also pushes structured
 * consent events into the GTM dataLayer.
 */

import { initAnalytics } from "./analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

declare global {
  interface WindowEventMap {
    cookieyes_consent_update: CustomEvent<Record<string, string>>;
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let analyticsInitialised = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the `cookieyes-consent` cookie.
 * Format: `consentid:xxx,consent:yes,action:yes,analytics:yes,advertisement:no,...`
 */
function parseCookieYesConsent(): Record<string, string> {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith("cookieyes-consent="));

  if (!raw) return {};

  const value = decodeURIComponent(raw.split("=").slice(1).join("="));
  const map: Record<string, string> = {};

  value.split(",").forEach((pair) => {
    const [key, val] = pair.split(":");
    if (key && val) map[key.trim()] = val.trim();
  });

  return map;
}

function isAnalyticsAccepted(consent: Record<string, string>): boolean {
  return consent.analytics === "yes" || consent.analytics === "true";
}

function isMarketingAccepted(consent: Record<string, string>): boolean {
  return (
    consent.advertisement === "yes" || consent.advertisement === "true"
  );
}

function pushConsentToDataLayer(consent: Record<string, string>): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "cookie_consent_update",
    analytics_consent: isAnalyticsAccepted(consent),
    marketing_consent: isMarketingAccepted(consent),
  });
}

function maybeInitAnalytics(consent: Record<string, string>): void {
  if (analyticsInitialised) return;
  if (!isAnalyticsAccepted(consent)) return;

  analyticsInitialised = true;
  console.log("[Consent] Analytics consent granted — initialising PostHog");
  initAnalytics();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call once from main.tsx (on pages where analytics is allowed).
 *
 * 1. Checks for an existing CookieYes consent cookie → may init immediately.
 * 2. Registers a listener for future consent updates from CookieYes.
 */
export function setupConsentListener(): void {
  // 1. Check existing cookie (returning visitor who already consented)
  const existing = parseCookieYesConsent();
  if (Object.keys(existing).length > 0) {
    pushConsentToDataLayer(existing);
    maybeInitAnalytics(existing);
  }

  // 2. Listen for live consent updates (banner interaction)
  document.addEventListener("cookieyes_consent_update", (event) => {
    const detail: Record<string, string> = (event as CustomEvent).detail || {};
    console.log("[Consent] cookieyes_consent_update received", detail);

    pushConsentToDataLayer(detail);
    maybeInitAnalytics(detail);
  });
}
