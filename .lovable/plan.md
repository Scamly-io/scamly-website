

## Plan: RevenueCat Webhook Handler

### Overview

Build `revenuecat-webhook` edge function to handle IAP subscription lifecycle events. The webhook authenticates by comparing the `Authorization: Bearer <token>` header against the project's anon key (no additional secret needed). Disable Stripe billing UI in Portal.

---

### 1. Database Migration

**New table: `processed_revenuecat_events`** (idempotency, mirrors `processed_stripe_events`):
- `id` text PK — RevenueCat event ID
- `event_type` text NOT NULL
- `processed_at` timestamptz DEFAULT now()

**New columns on `profiles`**:
- `subscription_store` text nullable — `app_store`, `play_store`, or `stripe`
- `subscription_product_id` text nullable — e.g. `scamly_premium_monthly`
- `billing_issue` boolean DEFAULT false

**RLS**: No RLS on `processed_revenuecat_events` (service-role only). The new `profiles` columns need to be added to the existing UPDATE policy's "protected fields" list so users cannot self-modify them.

---

### 2. Edge Function: `supabase/functions/revenuecat-webhook/index.ts`

**Auth**: Compare bearer token from `Authorization` header to `SUPABASE_ANON_KEY` env var. Reject with 401 if mismatch.

**Structure**: CORS headers, Sentry init, logging helpers, idempotency check via `processed_revenuecat_events` — all mirroring the Stripe webhook pattern.

**Product ID mapping**:
```text
scamly_premium_monthly → premium-monthly
scamly_premium_yearly  → premium-yearly
```

**Event handlers**:

| Event | Profile Update |
|---|---|
| `INITIAL_PURCHASE` | status=`active` (or `trialing` if period_type=TRIAL), set plan/product_id/store/expiry, clear billing_issue |
| `RENEWAL` | status=`active`, update expiry, clear billing_issue & access_expires_at |
| `PRODUCT_CHANGE` | Update plan & product_id based on new product |
| `CANCELLATION` | status=`cancelled`, set access_expires_at=expiry_date |
| `BILLING_ISSUE` | Set billing_issue=true |
| `UNCANCELLATION` | status=`active`, clear access_expires_at & billing_issue |
| `EXPIRATION` | status=`free`, plan=`free`, clear subscription fields, billing_issue=false |
| `TRANSFER` | Source user → free/clear. Destination user → active with product details |
| `TEMPORARY_ENTITLEMENT_GRANT` | status=`active`, set expiry |

**User identification**: `app_user_id` from the webhook payload is the Supabase user UUID. Updates use `.eq("id", appUserId)` with service role client.

---

### 3. Config Update: `supabase/config.toml`

```toml
[functions.revenuecat-webhook]
verify_jwt = false
```

---

### 4. Disable Stripe Billing UI in Portal (`src/pages/Portal.tsx`)

- Add a notice banner on the subscription tab: "Subscriptions are managed through the Scamly mobile app."
- Disable "Subscribe Now" / "Start Free Trial" buttons (add `disabled`, `opacity-50 cursor-not-allowed`)
- Disable "Manage Billing" and "Cancel Subscription" buttons similarly
- Hide the referral code input on the subscription tab
- Suppress the trial abuse modal (never show it)
- Hide the "Upgrade to Premium" banner

---

### 5. Update `profiles` RLS UPDATE Policy

Add the three new columns (`subscription_store`, `subscription_product_id`, `billing_issue`) to the existing protected-fields check in the UPDATE policy so users cannot modify them client-side.

---

### Files Summary

| File | Action |
|---|---|
| `supabase/functions/revenuecat-webhook/index.ts` | Create — full webhook handler |
| `supabase/config.toml` | Add revenuecat-webhook entry |
| `src/pages/Portal.tsx` | Disable Stripe checkout/billing UI |
| Database migration | Add table + columns + update RLS |

