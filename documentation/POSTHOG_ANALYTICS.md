# PostHog Analytics Documentation

## Overview

PostHog powers product analytics, behavioral tracking, and conversion funnels on the Scamly marketing site and web portal. Implementation is centralized in `src/lib/analytics.ts`, with consent gating in `src/lib/consent.ts` and automatic route tracking in `src/components/PageAnalytics.tsx`.

**Key principles:**

- Analytics only load after the user grants **analytics** consent via CookieYes
- No chat content, scan results, or credentials in event properties
- Event names use `snake_case`
- Custom events include shared page context via `getCommonProperties()`
- Events fired before PostHog initializes are queued (or coalesced for `page_visited`) and flushed on init

**Separate from PostHog:** Vercel Analytics and Speed Insights are mounted in `src/app/layout.tsx` and are not governed by this module.

---

## Architecture

```
src/app/layout.tsx
  └── Providers (client)
        ├── setupConsentListener()  → initAnalytics() when consent granted
        └── PageAnalytics             → trackPageVisited() on route change

src/lib/analytics.ts                  → PostHog init, capture helpers
src/lib/consent.ts                    → CookieYes → initAnalytics()
src/lib/analytics-gate.ts             → excludes iOS onboarding webview routes
```

### Initialization flow

1. `Providers` mounts and calls `setupConsentListener()` once (`src/components/Providers.tsx`).
2. `setupConsentListener()` reads the existing CookieYes cookie and listens for `cookieyes_consent_update`.
3. When analytics consent is `yes`, `initAnalytics()` runs (dynamic `import("posthog-js")`).
4. Queued capture/identify/reset events and any deferred `page_visited` are flushed.

PostHog is **not** initialized from `main.tsx` (CRA-era); there is no `src/main.tsx` in this Next.js app.

### PostHog configuration

**Environment variables:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_POSTHOG_API_KEY` | Project API key (required; analytics disabled if unset) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Ingest host (default: `https://us.i.posthog.com`) |

```typescript
posthog.init(POSTHOG_API_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,      // page views tracked manually via page_visited
  persistence: "localStorage+cookie",
  autocapture: true,
  enable_heatmaps: true,
});
```

### Analytics gate (onboarding webview)

`src/lib/analytics-gate.ts` blocks tracking on routes rendered inside the iOS app webview (Apple ATT requirements):

| Excluded path | `page_name` (if tracked elsewhere) |
|---------------|-------------------------------------|
| `/portal/onboarding` | `portal_onboarding` |
| `/portal/onboarding-complete` | `portal_onboarding_complete` |

`PageAnalytics` checks `isAnalyticsAllowed()` before calling `trackPageVisited()`.

---

## Common properties

Included on every custom event via `getCommonProperties()`:

| Property | Type | Description |
|----------|------|-------------|
| `page_path` | string | Current pathname (e.g. `/blog/foo`) |
| `page_url` | string | Full URL including query string |
| `page_title` | string | `document.title` |
| `referrer` | string | `document.referrer` when present |
| `anonymous_id` | string | PostHog distinct ID when initialized |
| `client_timestamp` | string | ISO 8601 client time |

---

## Route tracking (`page_visited`)

Automatic tracking is handled by `PageAnalytics`, which uses Next.js `usePathname()` and fires on each client-side navigation.

**Files:** `src/components/PageAnalytics.tsx`, `src/components/Providers.tsx`

### `page_name` values (`resolvePageName`)

| Path | `page_name` |
|------|-------------|
| `/` | `home` |
| `/blog` | `blog` |
| `/blog/[slug]` | `blog_post` |
| `/auth` | `auth` |
| `/check-email` | `check_email` |
| `/reset-password` | `reset_password` |
| `/portal` | `portal` |
| `/contact` | `contact` |
| `/privacy` | `privacy` |
| `/terms` | `terms` |
| `/account-deleted` | `account_deleted` |
| Other paths | Derived from path segments (e.g. `/foo/bar` → `foo_bar`) |

Blog posts also send `blog_slug` (via `getPageVisitedProperties()`).

### Pre-init behavior

`page_visited` does not use the generic event queue. If PostHog is not ready, the **latest** visit is stored in `pendingPageVisit` and sent once on init (avoids duplicate or stale page events during consent banner delay).

---

## User identification

### Identify

**Function:** `identifyUser(userId, traits?)`

**When:** Authenticated user loads the portal with a valid session.

**Location:** `src/app/(portal)/portal/page.tsx` — `useEffect` when `user` / `profile` are available.

**Traits:**

| Trait | Source |
|-------|--------|
| `email` | `user.email` |
| `first_name` | `profile?.first_name` |

Traits are attached to the PostHog person profile, not duplicated on every event.

### Reset

**Function:** `resetUser()`

**When:** User signs out or deletes their account.

**Locations:**

- `src/app/(portal)/portal/page.tsx` — sign out handler
- `src/components/DeleteAccountSection.tsx` — after successful account deletion

---

## Custom events

### Summary

| Event | Function | Status |
|-------|----------|--------|
| `page_visited` | `trackPageVisited()` | Active — all allowed routes |
| `pricing_viewed` | `trackPricingViewed()` | Active |
| `signup_started` | `trackSignupStarted(source)` | Active |
| `signup_completed` | `trackSignupCompleted(userId?)` | Active |
| _(generic)_ | `trackEvent(name, props?)` | Available — no current callers |

**Not implemented in code:** `checkout_started`, `checkout_completed`, and `trial_abuse_detected` are not defined or called in the current codebase. Subscription changes are handled in the mobile app, not via Stripe on the web portal.

---

### 1. `page_visited`

**Function:** `trackPageVisited(pageName, extraProperties?)`

**When:** Client-side route change on any analytics-allowed page.

**Caller:** `PageAnalytics` (do not call manually per route unless you have a special case).

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `page_name` | string | Stable page identifier (see table above) |
| `blog_slug` | string | Present on `/blog/[slug]` posts only |

**Use in analysis:** Traffic volume, page mix, blog post views (filter or break down by `page_name` / `blog_slug`).

---

### 2. `pricing_viewed`

**Function:** `trackPricingViewed()`

**When:** Pricing section enters the viewport (intersection observer, 30% threshold).

**Location:** `src/components/landing/PricingSection.tsx`

**Properties:** Common properties only.

**Notes:** Fires at most once per page load (`useRef` guard). Not tied to `page_visited` timing — measures visibility, not mount.

---

### 3. `signup_started`

**Function:** `trackSignupStarted(source)`

**When:** User clicks a tracked signup/download CTA.

**Locations and `signup_source` values:**

| Location | `signup_source` |
|----------|-----------------|
| `src/components/Navbar.tsx` — desktop CTA | `navbar` |
| `src/components/Navbar.tsx` — mobile CTA | `navbar_mobile` |
| `src/components/landing/CTASection.tsx` — primary button | `cta` |
| `src/components/landing/PricingSection.tsx` — plan CTA | `pricing_premium` |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `signup_source` | string | CTA identifier (see table) |

**Note:** `HeroSection` has no signup tracking. The CTA section primary button links to the App Store but still records `signup_started` with source `cta`.

---

### 4. `signup_completed`

**Function:** `trackSignupCompleted(userId?)`

**When:** User successfully completes portal onboarding (profile saved).

**Location:** `src/app/(portal)/portal/onboarding/page.tsx` — after successful onboarding submit (including a fallback path when analytics invoke fails but profile save succeeds).

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `user_id` | string | Supabase user ID when available |

**Note:** This reflects **onboarding completion**, not the initial magic-link or email auth step on `/auth`. Pair with `signup_started` and `page_visited` (`page_name: auth`) for full funnel context.

---

### 5. Generic events

**Function:** `trackEvent(eventName, properties?)`

Merges custom properties with common properties. Prefer adding a typed `track*` helper in `analytics.ts` for new product events.

---

## Tracking by area

### Marketing / base routes (`app/(base)/`)

| Route | `page_visited` | Other events |
|-------|----------------|--------------|
| `/` | `home` | `pricing_viewed`, `signup_started` (pricing, navbar) |
| `/blog`, `/blog/[slug]` | `blog`, `blog_post` + `blog_slug` | — |
| `/contact`, `/privacy`, `/terms`, `/account-deleted` | respective `page_name` | — |

Home page composition: `src/app/(base)/page.tsx` → `HomeAnnouncementStack`, `FeatureShowcaseSection`, etc., with pricing on the landing stack via `PricingSection`.

### Auth (`app/(auth)/`)

| Route | `page_visited` | Other events |
|-------|----------------|--------------|
| `/auth` | `auth` | — |
| `/check-email` | `check_email` | — |
| `/reset-password` | `reset_password` | — |

### Portal (`app/(portal)/`)

| Route | `page_visited` | Other events |
|-------|----------------|--------------|
| `/portal` | `portal` | `identifyUser` on load; `resetUser` on sign out |
| `/portal/onboarding` | _(excluded)_ | `signup_completed` on success |
| `/portal/onboarding-complete` | _(excluded)_ | — |

---

## Event queue

| Mechanism | Used for |
|-----------|----------|
| `eventQueue` | `captureEvent`, `identifyUser`, `resetUser` before init |
| `pendingPageVisit` | Latest `page_visited` only (coalesced) |

After `initAnalytics()` completes, `flushEventQueue()` processes the queue and then sends any deferred `page_visited`.

---

## Suggested funnels

### Landing → app interest

1. `page_visited` (`page_name: home`)
2. `pricing_viewed`
3. `signup_started`

### Web onboarding

1. `page_visited` (`page_name: auth`)
2. `signup_started` (any source)
3. `signup_completed`

### Blog engagement

1. `page_visited` (`page_name: blog` or `blog_post`)
2. `signup_started` (break down by `signup_source`)

---

## Key metrics

| Metric | Calculation |
|--------|-------------|
| CTA click-through (home) | `signup_started` ÷ `page_visited` where `page_name = home` |
| Pricing visibility | `pricing_viewed` ÷ `page_visited` where `page_name = home` |
| Best-performing CTA | Break down `signup_started` by `signup_source` |
| Onboarding completion | `signup_completed` count (optionally vs `page_visited` on `auth`) |
| Blog → CTA | `signup_started` after `page_visited` with `page_name = blog_post` |

---

## Privacy and PII

### Do not capture in event properties

- Chat messages or AI responses
- Scan results or uploaded media
- Passwords or secrets

### Acceptable in events

- Page paths, URLs, referrers
- CTA source labels
- Supabase user UUID on `signup_completed`
- Timestamps

### Person traits (identify only)

`email` and `first_name` are sent via `identifyUser()` for PostHog person profiles, not as properties on each event.

---

## Adding a new event

1. Add a typed `track*` function in `src/lib/analytics.ts` using `captureEvent()` and `getCommonProperties()`.
2. Call it from the relevant client component (`'use client'` if it runs in the browser).
3. Ensure the route is not blocked by `isAnalyticsAllowed()` if applicable.
4. Document the event in this file.

**Naming:** `snake_case`, typically `noun_verb` (e.g. `signup_started`).

---

## Troubleshooting

### No events in PostHog

1. Confirm `NEXT_PUBLIC_POSTHOG_API_KEY` is set in the environment (local `.env` / Vercel).
2. Accept **analytics** cookies in the CookieYes banner (or use a returning session with consent already stored).
3. Check the browser console for `[Consent]` and `[Analytics]` logs.
4. Rule out ad blockers blocking `posthog-js` or the ingest host.
5. Remember onboarding routes do not fire `page_visited`.

### `page_visited` missing

1. Verify `PageAnalytics` is mounted under `Providers` in the root layout.
2. Confirm consent was granted so `initAnalytics()` ran.
3. Look for `[Analytics] page_visited deferred` then `[Analytics] page_visited event tracked` or `Flushed deferred page_visited`.
4. Navigation must be client-side (App Router); full hard reloads still fire once on mount.

### Duplicate events

1. `pricing_viewed` — should only fire once per load (ref guard in `PricingSection`).
2. `page_visited` — deduped per pathname in `PageAnalytics` via `lastTrackedRef`.
3. React Strict Mode in development can double-invoke effects; production should not duplicate for the same navigation.

### Queued events not flushing

1. Check for `[Analytics] Failed to initialize PostHog` in the console.
2. Validate API key and host.
3. Ensure analytics consent is actually `yes` in the CookieYes cookie.
