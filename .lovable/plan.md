

## Consent-Gated Analytics Implementation

### Summary

Rework PostHog initialization so it **never loads before cookie consent**. Currently `initAnalytics()` fires eagerly in `main.tsx`. Instead, it will only fire when CookieYes grants analytics consent — either on page load (returning user) or dynamically when the user clicks "Accept".

### Architecture

```text
main.tsx
  ├─ initSentry()          ← always runs
  ├─ loadGTM()             ← still runs (GTM loads CookieYes banner)
  └─ setupConsentListener() ← NEW: registers cookieyes_consent_update listener
       │
       ├─ on consent event → push cookie_consent_update to dataLayer
       ├─ if analytics=yes → initAnalytics()  (once)
       └─ on load: check existing CookieYes cookie → maybe initAnalytics() immediately
```

### Changes

**1. New file: `src/lib/consent.ts`**

Core consent handler module:
- Reads existing CookieYes consent cookie on load (the `cookieyes-consent` cookie stores a string like `analytics:yes,advertisement:no`)
- Registers a `cookieyes_consent_update` event listener
- On consent update: pushes `cookie_consent_update` event to `window.dataLayer` with `analytics_consent` and `marketing_consent` booleans
- If `analytics_consent === true`, calls `initAnalytics()` (one time only, guarded by a flag)
- Exports `setupConsentListener()` to be called from `main.tsx`

**2. Modify `src/main.tsx`**

- Remove the direct `initAnalytics()` call
- Import and call `setupConsentListener()` instead (still gated behind `isAnalyticsAllowed()` for iOS webview exclusion)

```
Before:  if (isAnalyticsAllowed()) { initAnalytics(); loadGTM(); }
After:   if (isAnalyticsAllowed()) { loadGTM(); setupConsentListener(); }
```

**3. Modify `src/lib/analytics.ts`**

- No structural changes needed — `initAnalytics()` already has double-init guards and the event queue handles pre-init calls correctly
- The existing `captureEvent` queue means tracking calls made before consent will queue up and flush once PostHog initializes (this is the desired behavior since those calls only fire on pages where analytics is allowed)

### How it works end-to-end

1. **Page loads** — GTM loads, CookieYes banner appears, PostHog is NOT loaded
2. **Returning user with prior consent** — `setupConsentListener()` reads the `cookieyes-consent` cookie, finds `analytics:yes`, immediately calls `initAnalytics()`
3. **New user accepts cookies** — CookieYes fires `cookieyes_consent_update`, listener catches it, pushes to dataLayer, calls `initAnalytics()`
4. **User declines** — PostHog never loads, no tracking occurs
5. **Onboarding pages** — `isAnalyticsAllowed()` returns false, neither GTM nor the consent listener are set up at all

### Technical details: consent cookie parsing

CookieYes stores consent in a cookie named `cookieyes-consent` with format:
`consentid:xxx,consent:yes,action:yes,analytics:yes,advertisement:no,...`

The module will parse this to extract the `analytics` value.

