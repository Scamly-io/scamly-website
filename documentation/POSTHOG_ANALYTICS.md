# PostHog Analytics Documentation

## Overview

PostHog is used for product analytics, behavioral tracking, and conversion funnel analysis on the Scamly web application. The implementation is centralized in `src/lib/analytics.ts` and uses a dynamic import with an event queue to prevent data loss during initialization.

**Key Principles:**
- Analytics available for all visitors (no auth gate on the landing page)
- No PII ever captured in event properties
- Event naming convention: `snake_case`
- All events include common context properties (page path, referrer, timestamp)
- Events are queued if fired before PostHog initializes, then flushed automatically

## Configuration

**File:** `src/lib/analytics.ts`

**Environment Variables:**
- `NEXT_PUBLIC_POSTHOG_API_KEY` — PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog host URL (default: `https://us.i.posthog.com`)

**Initialization:**
- PostHog is dynamically imported in `initAnalytics()` to avoid React bundling conflicts
- Called once in `src/main.tsx` before the app renders
- Autocapture and heatmaps are enabled
- Manual pageview capture (`capture_pageview: false`) for more control
- Persistence: `localStorage+cookie`

**PostHog Settings:**
```typescript
posthog.init(POSTHOG_API_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
  persistence: "localStorage+cookie",
  autocapture: true,
  enable_heatmaps: true,
});
```

---

## Common Properties

Every event automatically includes the following context via `getCommonProperties()`:

| Property           | Type     | Description                                      |
|--------------------|----------|--------------------------------------------------|
| `page_path`        | string   | Current URL pathname (e.g., `/`, `/auth`)        |
| `page_url`         | string   | Full URL including query params                  |
| `page_title`       | string   | Document title                                   |
| `referrer`         | string   | `document.referrer` (traffic source)             |
| `anonymous_id`     | string   | PostHog distinct ID for anonymous user tracking  |
| `client_timestamp` | string   | ISO 8601 timestamp for accurate event ordering   |

---

## User Identification

### Identify User

**Function:** `identifyUser(userId: string, traits?: Record<string, unknown>)`

**When:** After user logs in / portal loads with authenticated user

**Location:** `src/pages/Portal.tsx` — `useEffect` on user/profile change

**Traits Passed:**
- `email`: User email
- `first_name`: User's first name from profile

**Usage:**
```typescript
identifyUser(user.id, {
  email: user.email,
  first_name: profile?.first_name,
});
```

### Reset User

**Function:** `resetUser()`

**When:** User signs out

**Location:** `src/pages/Portal.tsx` — `handleSignOut()`

**Effect:**
- Clears PostHog user data
- Subsequent events tracked as a new anonymous user

---

## Analytics Events

### 1. Page Visited

**Event:** `page_visited`

**Function:** `trackPageVisited(pageName: string = "home")`

**When:** User lands on the home/landing page

**Location:** `src/pages/Index.tsx` — `useEffect` on mount

**Properties:**

| Property    | Type   | Description                    |
|-------------|--------|--------------------------------|
| `page_name` | string | Name of the page (e.g., `home`) |

**Business Question:** How many users land on our home page? What's our traffic volume over time?

---

### 2. Pricing Viewed

**Event:** `pricing_viewed`

**Function:** `trackPricingViewed()`

**When:** Pricing section becomes visible in the viewport (via intersection observer)

**Locations:**
- `src/components/landing/PricingSection.tsx` — intersection observer callback
- `src/components/landing/MainPricingSection.tsx` — intersection observer callback

**Properties:** Common properties only (no additional properties)

**Note:** Uses intersection observer, NOT page load, for accurate visibility tracking. Only fires once per page load via `useRef` guard.

**Business Question:** What percentage of visitors see our pricing? This is a key funnel step — if users don't see pricing, they can't convert.

---

### 3. Signup Started

**Event:** `signup_started`

**Function:** `trackSignupStarted(source: string)`

**When:** User clicks a primary signup CTA button

**Locations:**
- `src/components/landing/HeroSection.tsx` — hero "Start Free Trial" button (`source: "hero"`)
- `src/components/landing/CTASection.tsx` — CTA "Create Free Account" button (`source: "cta_section"`)
- `src/components/landing/PricingSection.tsx` — pricing plan CTA buttons (`source: "pricing_{planName}"`)
- `src/components/Navbar.tsx` — desktop "Get Started" button (`source: "navbar"`)
- `src/components/Navbar.tsx` — mobile "Get Started" button (`source: "navbar_mobile"`)

**Properties:**

| Property        | Type   | Description                                                        |
|-----------------|--------|--------------------------------------------------------------------|
| `signup_source` | string | Identifies which CTA was clicked (e.g., `hero`, `pricing_pro`, `navbar`) |

**Business Question:** How many users click our signup CTAs? Which CTAs perform best?

---

### 4. Signup Completed

**Event:** `signup_completed`

**Function:** `trackSignupCompleted(userId?: string)`

**When:** User successfully completes the signup form and Supabase returns success

**Location:** `src/pages/Auth.tsx` — after successful `supabase.auth.signUp()` response

**Properties:**

| Property  | Type   | Description                                   |
|-----------|--------|-----------------------------------------------|
| `user_id` | string | Supabase user ID (if available at this point) |

**Note:** Only fires AFTER successful signup, not on form submission.

**Business Question:** What's our signup conversion rate? How many users who started signup actually complete it?

---

### 5. Checkout Started

**Event:** `checkout_started`

**Function:** `trackCheckoutStarted(plan: "monthly" | "yearly", hasReferralCode: boolean)`

**When:** User clicks the upgrade/subscribe button and is about to be redirected to Stripe Checkout

**Location:** `src/pages/Portal.tsx` — `handleUpgrade()` function

**Properties:**

| Property            | Type    | Description                                     |
|---------------------|---------|-------------------------------------------------|
| `checkout_plan`     | string  | Pricing plan selected (`monthly` or `yearly`)   |
| `has_referral_code` | boolean | Whether user entered a referral code at checkout |

**Business Question:** How many users initiate payment? Which pricing plan is more popular?

---

### 6. Checkout Completed

**Event:** `checkout_completed`

**Function:** `trackCheckoutCompleted(plan?: string)`

**When:** User returns from Stripe Checkout with `?success=true` in the URL

**Location:** `src/pages/Portal.tsx` — `useEffect` checking `searchParams`

**Properties:**

| Property        | Type   | Description                                |
|-----------------|--------|--------------------------------------------|
| `checkout_plan` | string | Subscription plan from profile (if available) |

**Note:** Relies on the `success` query param in the Stripe return URL.

**Business Question:** What's our checkout conversion rate? How many users who start checkout actually complete payment?

---

### 7. Trial Abuse Detected

**Event:** `trial_abuse_detected`

**Function:** `trackTrialAbuseDetected()`

**When:** Trial abuse is detected and the abuse modal is shown for the first time

**Location:** Currently defined in `src/lib/analytics.ts` but **not yet called** in any component (ready for implementation).

**Properties:** Common properties only (no additional properties)

**Business Question:** How many users are attempting to abuse the trial system?

---

### 8. Generic Event

**Function:** `trackEvent(eventName: string, properties?: Record<string, unknown>)`

**Purpose:** Generic event capture for custom/ad-hoc events. Use specific `track*` functions when available for consistency.

**Location:** `src/lib/analytics.ts` — available for use anywhere

**Properties:** Any custom key-value pairs merged with common properties.

---

## Event Summary

### Total Events: 7 named event types (+ generic)

**By Category:**

**Landing Page Events (3):**
1. `page_visited` — Home page load
2. `pricing_viewed` — Pricing section visible
3. `signup_started` — CTA click

**Auth Events (1):**
4. `signup_completed` — Successful registration

**Checkout Events (2):**
5. `checkout_started` — Stripe redirect initiated
6. `checkout_completed` — Stripe return with success

**Abuse Prevention (1):**
7. `trial_abuse_detected` — Trial abuse modal shown (not yet wired)

---

## Event Tracking by Feature

### Landing Page

**Files:** `src/pages/Index.tsx`, `src/components/landing/HeroSection.tsx`, `src/components/landing/PricingSection.tsx`, `src/components/landing/MainPricingSection.tsx`, `src/components/landing/CTASection.tsx`, `src/components/Navbar.tsx`

| Event             | Trigger                          | Key Properties                  |
|-------------------|----------------------------------|---------------------------------|
| `page_visited`    | Page mount                       | `page_name: 'home'`            |
| `pricing_viewed`  | Pricing section in viewport      | _(common only)_                 |
| `signup_started`  | CTA button click                 | `signup_source: '{source}'`     |

### Auth / Signup

**File:** `src/pages/Auth.tsx`

| Event              | Trigger                          | Key Properties    |
|--------------------|----------------------------------|-------------------|
| `signup_completed` | Successful Supabase signup       | `user_id`         |

### Portal (Authenticated)

**File:** `src/pages/Portal.tsx`

| Event                | Trigger                          | Key Properties                              |
|----------------------|----------------------------------|---------------------------------------------|
| `checkout_started`   | Upgrade button click             | `checkout_plan`, `has_referral_code`         |
| `checkout_completed` | Return from Stripe with success  | `checkout_plan`                             |
| _(identify)_         | Portal loads with user           | `email`, `first_name`                       |
| _(reset)_            | Sign out                         | _(clears user)_                             |

---

## Event Queue Mechanism

PostHog is loaded via dynamic `import()` which is asynchronous. Events fired before initialization completes are queued in memory and automatically flushed once PostHog is ready.

**Queue Types:**
- `capture` — Standard event capture
- `identify` — User identification
- `reset` — User reset

This ensures zero event loss during app startup.

---

## Funnels to Build

### Landing → Signup Funnel
1. `page_visited` (page_name: 'home')
2. `pricing_viewed`
3. `signup_started`
4. `signup_completed`

### Signup → Payment Funnel
1. `signup_completed`
2. `checkout_started`
3. `checkout_completed`

### Full Conversion Funnel
1. `page_visited`
2. `pricing_viewed`
3. `signup_started`
4. `signup_completed`
5. `checkout_started`
6. `checkout_completed`

---

## Key Metrics

| Metric                    | Calculation                                    |
|---------------------------|------------------------------------------------|
| CTA Click-Through Rate    | `signup_started` / `page_visited`              |
| Signup Conversion Rate    | `signup_completed` / `signup_started`           |
| Checkout Initiation Rate  | `checkout_started` / `signup_completed`         |
| Checkout Completion Rate  | `checkout_completed` / `checkout_started`       |
| Pricing Visibility Rate   | `pricing_viewed` / `page_visited`              |
| Best Performing CTA       | Group `signup_started` by `signup_source`       |
| Plan Preference           | Group `checkout_started` by `checkout_plan`     |
| Referral Impact           | Filter `checkout_started` by `has_referral_code` |

---

## Privacy & PII

### Never Captured
- ❌ Chat messages or AI responses
- ❌ Scan results or image contents
- ❌ Passwords or sensitive credentials

### Safe to Capture
- ✅ User IDs (Supabase UUIDs)
- ✅ Page paths and referrers
- ✅ Button click sources
- ✅ Subscription plan names
- ✅ Timestamps

**Note:** `email` and `first_name` are passed to `identifyUser()` as user traits for PostHog user profiles. These are NOT included in event properties.

---

## Best Practices

### Event Naming
- **Convention:** `snake_case`
- **Structure:** `noun_verb` (e.g., `signup_started`, `checkout_completed`)

### When to Add New Events
✅ **DO track:** User actions with clear intent, funnel milestones, meaningful errors
❌ **DON'T track:** PII, content of user inputs, silent background operations

### Adding a New Event
1. Add a typed tracking function in `src/lib/analytics.ts`
2. Call `captureEvent()` with `...getCommonProperties()` and event-specific properties
3. Import and call the function at the appropriate location
4. Document the event in this file

---

## Troubleshooting

### Events Not Appearing
1. Check that `NEXT_PUBLIC_POSTHOG_API_KEY` is set in `.env`
2. Verify `initAnalytics()` is called in `src/main.tsx`
3. Check browser console for `[Analytics]` log messages
4. Ensure no ad-blocker is blocking PostHog requests

### Duplicate Events
1. Check for missing `useRef` guards on intersection observers
2. Review React `useEffect` dependencies
3. Ensure tracking functions are not called on every re-render

### Queued Events Not Flushing
1. Check for PostHog initialization errors in console
2. Verify API key is valid
3. Check network connectivity to PostHog host
