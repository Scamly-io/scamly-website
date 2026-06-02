# Meta Conversions API (CAPI) Events

## Overview

Scamly sends server-side conversion events to Meta (Facebook) via the [Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api). All event logic lives in a single Supabase Edge Function, **`meta-capi-handler`**, which:

1. Validates and enriches incoming requests
2. Loads attribution data from the user's profile (and, for purchases, prior trial events)
3. Builds a Meta CAPI payload with hashed PII
4. POSTs to the Meta Graph API
5. Persists an audit row to `meta_capi_events`

This complements any client-side Meta Pixel events and improves match quality for ads attribution.

**Key principles:**

- PII sent to Meta (`em`, `country`, `external_id`, `db`) is **SHA-256 hashed** (lowercased first)
- `event_id` is used for deduplication between Pixel and CAPI
- App-originated events use `action_source: "app"` and require `app_data`
- Website-originated events use `action_source: "website"` (CompleteRegistration from the web portal)
- Subscription purchases and renewals use `action_source: "system_generated"`
- Every send attempt is logged to `meta_capi_events`, including failures

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Callers                                                                    │
├──────────────────────────────┬──────────────────────────────────────────────┤
│  Website onboarding          │  RevenueCat webhook                          │
│  src/lib/complete-           │  supabase/functions/revenuecat-webhook       │
│  registration.ts             │  → invokeMetaCapi(...)                       │
│  (action_source: website)    │  → trial-start | purchase | renewal          │
│                              │  → test-purchase (RevenueCat TEST events)    │
│  Mobile app (external)       │                                              │
│  → complete-registration     │                                              │
│    (action_source: app)      │                                              │
└──────────────┬───────────────┴──────────────────────┬───────────────────────┘
               │                                      │
               ▼                                      ▼
        meta-capi-handler (Supabase Edge Function)
        supabase/functions/meta-capi-handler/
               │
               ├── index.ts          Route handlers, auth, profile updates
               ├── meta-capi.ts       Payload building, Meta API calls, DB persist
               ├── app-data.ts        app_data validation for app events
               ├── dob.ts             Date-of-birth normalization
               └── country-aliases.ts Country name → ISO-2 for Meta hashing
               │
               ├──► Meta Graph API  POST /{pixel_id}/events
               │
               └──► meta_capi_events table (audit log)
               └──► profiles table   (attribution + app_data storage)
```

### Source files

| File | Purpose |
|------|---------|
| `supabase/functions/meta-capi-handler/index.ts` | HTTP routing, request validation, complete-registration profile update |
| `supabase/functions/meta-capi-handler/meta-capi.ts` | Core send logic, profile lookups, trial event lookup, persistence |
| `supabase/functions/meta-capi-handler/app-data.ts` | Validates Meta `app_data` shape for `action_source: "app"` |
| `supabase/functions/meta-capi-handler/dob.ts` | Normalizes DOB to `yyyy-mm-dd` (profile) and `YYYYMMDD` (Meta `db`) |
| `supabase/functions/meta-capi-handler/country-aliases.ts` | Maps country names to ISO-2 codes before hashing |
| `src/lib/complete-registration.ts` | Website client helper for the complete-registration route |
| `supabase/functions/revenuecat-webhook/index.ts` | Invokes purchase-related routes on subscription lifecycle events |

---

## Edge function routes

Base URL:

```
POST {SUPABASE_URL}/functions/v1/meta-capi-handler/{route}
```

| Route | Meta event name | Auth | Called by |
|-------|-----------------|------|-----------|
| `complete-registration` | `CompleteRegistration` | User JWT (`Authorization: Bearer`) | Website onboarding, mobile app |
| `trial-start` | `StartTrial` | Internal secret | RevenueCat webhook (`INITIAL_PURCHASE` with trial) |
| `purchase` | `Purchase` | Internal secret | RevenueCat webhook (`INITIAL_PURCHASE` without trial) |
| `renewal` | `Purchase` | Internal secret | RevenueCat webhook (`RENEWAL`) |
| `test-purchase` | `Purchase` (test mode) | Internal secret | RevenueCat webhook (`TEST` event type) |

### Authentication

- **`complete-registration`**: Requires a valid Supabase user access token. The handler resolves the user ID from the JWT.
- **All other routes**: Require the `x-internal-secret` header when `INTERNAL_SECRET` is set in the environment. If `INTERNAL_SECRET` is unset, internal routes are open (useful for local dev only).

The function has `verify_jwt = false` in `supabase/config.toml`; authentication is handled manually per route.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `META_CONVERSIONS_API_TOKEN` | Yes | Meta CAPI access token |
| `META_PIXEL_ID` | No | Defaults to `1582049792855534` |
| `META_API_VERSION` | No | Defaults to `v25.0` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (admin DB access) |
| `INTERNAL_SECRET` | Recommended | Shared secret for internal route auth |
| `SENTRY_DSN` | No | Error reporting |

---

## Database tables

### `meta_capi_events`

Audit log of every send attempt. Used for debugging and to link purchase events back to the original trial.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `bigint` | Auto-generated primary key |
| `user_id` | `uuid` | FK → `profiles.id` |
| `event_id` | `text` | Meta deduplication ID (see per-event notes below) |
| `event_name` | `text` | `CompleteRegistration`, `StartTrial`, or `Purchase` |
| `event_time` | `int` | Unix timestamp (seconds) when the event was sent |
| `meta_response` | `jsonb` | Raw Meta API response |
| `error_message` | `text` | Error details if the send failed |
| `created_at` | `timestamptz` | Row insert time |

### `profiles` (attribution fields)

These columns are written during **complete registration** and read back for subscription events:

| Column | Used for |
|--------|----------|
| `ip_address` | `user_data.client_ip_address` |
| `user_agent` | `user_data.client_user_agent` |
| `fbp` | `user_data.fbp` (Meta browser ID cookie) |
| `fbc` | `user_data.fbc` (Meta click ID cookie) |
| `app_data` | `app_data` on app events (`jsonb`) |
| `country`, `dob`, `first_name`, etc. | Profile data; country/dob also feed CompleteRegistration |

**Important:** Purchase and trial events require `ip_address` and a resolvable user email on the profile. If either is missing, the event is skipped and an error row is persisted.

---

## Event types

### 1. CompleteRegistration

Fired when a user finishes onboarding. Updates the profile **and** sends the Meta event in one request.

#### Called from

| Source | `action_source` | Client |
|--------|-----------------|--------|
| Website portal onboarding | `website` | `src/app/(portal)/portal/onboarding/page.tsx` → `src/lib/complete-registration.ts` |
| Mobile app | `app` | App calls the edge function directly (not in this repo) |

#### Request — `POST .../complete-registration`

**Headers:**

```
Authorization: Bearer {user_access_token}
Content-Type: application/json
apikey: {SUPABASE_PUBLISHABLE_KEY}   # required by website client
```

**Body:**

| Field | Required | Notes |
|-------|----------|-------|
| `first_name` | Yes | Saved to profile |
| `country` | Yes | Saved to profile; hashed to ISO-2 for Meta |
| `dob` | No | `yyyy-mm-dd`; saved to profile, sent to Meta as hashed `db` |
| `gender` | No | Profile only |
| `referral_source` | No | Profile only |
| `signup_reason` | No | Profile only; not sent to Meta |
| `ip_address` | Recommended | Saved to profile; sent as `client_ip_address` |
| `user_agent` | Recommended | Saved to profile |
| `fbp` | Recommended | Meta `_fbp` cookie |
| `fbc` | Recommended | Meta `_fbc` cookie |
| `action_source` | No | `"website"` (default) or `"app"` |
| `app_data` | Required when `action_source` is `"app"` | See [App data](#app-data) below; saved to `profiles.app_data` |

**Response:**

```json
{
  "success": true,
  "event_id": "{user_uuid}",
  "error": null
}
```

`event_id` is always the user's UUID (deduplication key).

#### Meta payload structure

```json
{
  "data": [{
    "event_name": "CompleteRegistration",
    "event_id": "{user_uuid}",
    "event_time": 1710000000,
    "action_source": "website",
    "user_data": {
      "em": "{sha256(email)}",
      "external_id": "{sha256(user_uuid)}",
      "country": "{sha256(iso2_country)}",
      "db": "{sha256(YYYYMMDD)}",
      "client_ip_address": "1.2.3.4",
      "client_user_agent": "...",
      "fbp": "...",
      "fbc": "..."
    },
    "app_data": { "...": "only when action_source is app" }
  }]
}
```

---

### 2. StartTrial

Fired when a user starts a free trial via the mobile app (RevenueCat `INITIAL_PURCHASE` with `period_type: TRIAL`).

#### Called from

`supabase/functions/revenuecat-webhook/index.ts` → `invokeMetaCapi("trial-start", {...})`

#### Request — `POST .../trial-start`

**Headers:**

```
Authorization: Bearer {service_role_key}
x-internal-secret: {INTERNAL_SECRET}
Content-Type: application/json
```

**Body:**

| Field | Required | Source |
|-------|----------|--------|
| `user_id` | Yes | RevenueCat `app_user_id` |
| `event_id` | Yes | RevenueCat event `id` (deduplication key) |
| `country` | Yes | RevenueCat `country_code` |
| `plan` | No | Defaults to `"premium-monthly"`; maps to `custom_data.contents[0].id` |
| `value` | No | RevenueCat price; when present, sets `custom_data.contents[0].item_price` only (does **not** affect `custom_data.value`) |

**Profile data loaded automatically:** email, `ip_address`, `fbp`, `fbc`, `user_agent`, `app_data`.

#### Meta payload structure

`custom_data.value` and `custom_data.predicted_ltv` are **hardcoded to `2.25`** for all StartTrial events (`START_TRIAL_CUSTOM_VALUE` in `meta-capi.ts`). They are not derived from the webhook `value` field.

```json
{
  "data": [{
    "event_name": "StartTrial",
    "event_id": "{revenuecat_event_id}",
    "event_time": 1710000000,
    "action_source": "app",
    "user_data": {
      "em": "{sha256(email)}",
      "country": "{sha256(country)}",
      "external_id": "{sha256(user_uuid)}",
      "client_ip_address": "...",
      "client_user_agent": "...",
      "fbp": "...",
      "fbc": "..."
    },
    "custom_data": {
      "contents": [{ "id": "premium-monthly", "quantity": 1, "item_price": 4.99 }],
      "content_type": "product",
      "value": 2.25,
      "predicted_ltv": 2.25,
      "currency": "USD"
    },
    "app_data": { "...": "from profiles.app_data" }
  }]
}
```

In the example above, `item_price` reflects the optional webhook `value` (e.g. RevenueCat price). `value` and `predicted_ltv` are always `2.25` regardless.

`app_data` is **required**. It must have been saved during app complete registration. If missing or invalid, the event is skipped and an error is logged to `meta_capi_events`.

---

### 3. Purchase

Fired for two scenarios with different `action_source` values:

| Route | Trigger | `action_source` |
|-------|---------|-----------------|
| `purchase` | RevenueCat `INITIAL_PURCHASE` (non-trial) | `system_generated` |
| `renewal` | RevenueCat `RENEWAL` (trial conversion, auto-renew, billing recovery) | `system_generated` |

Both routes send Meta event name **`Purchase`**.

#### Called from

`supabase/functions/revenuecat-webhook/index.ts`:

- `invokeMetaCapi("purchase", {...})` on direct purchase
- `invokeMetaCapi("renewal", {...})` on renewal

#### Request — `POST .../purchase` or `.../renewal`

Same body shape as StartTrial:

| Field | Required | Notes |
|-------|----------|-------|
| `user_id` | Yes | RevenueCat `app_user_id` |
| `event_id` | Yes | RevenueCat event `id` |
| `country` | Yes | RevenueCat `country_code` |
| `plan` | No | Defaults to `"premium-monthly"` |
| `value` | No | Transaction price; sets `custom_data.value`, `custom_data.contents[0].item_price`, and `currency: "USD"` when present |

**Profile data loaded automatically:** email, `ip_address`, `fbp`, `fbc`, `user_agent`.

**Trial linkage:** For `Purchase` events, the handler queries `meta_capi_events` for the user's most recent `StartTrial` row and, if found, attaches it as `original_event_data`.

#### Meta payload structure

```json
{
  "data": [{
    "event_name": "Purchase",
    "event_id": "{revenuecat_event_id}",
    "event_time": 1710000000,
    "action_source": "system_generated",
    "user_data": { "...": "same shape as StartTrial" },
    "custom_data": {
      "contents": [{ "id": "premium-monthly", "quantity": 1, "item_price": 4.99 }],
      "content_type": "product",
      "value": 4.99,
      "currency": "USD"
    },
    "original_event_data": {
      "event_name": "StartTrial",
      "event_time": 1709900000,
      "event_id": "{original_revenuecat_trial_event_id}"
    }
  }]
}
```

`original_event_data` is omitted if no prior `StartTrial` row exists (e.g. direct purchase with no trial).

The trial lookup query:

```sql
SELECT event_name, event_time, event_id
FROM meta_capi_events
WHERE user_id = $user_id AND event_name = 'StartTrial'
ORDER BY created_at DESC, id DESC
LIMIT 1
```

---

### 4. Test purchase

Used only when RevenueCat sends a `type: "TEST"` webhook event to validate the endpoint.

#### Called from

`revenuecat-webhook` → `invokeMetaCapi("test-purchase", {...})`

#### Request — `POST .../test-purchase`

| Field | Required | Default |
|-------|----------|---------|
| `event_id` | No | `test_{timestamp}` |
| `country` | No | `"us"` |
| `email` | No | `"admin@scamly.io"` |
| `external_id` | No | `"test_user"` |
| `client_ip_address` | No | `"127.0.0.1"` |
| `client_user_agent` | No | Chrome UA string |
| `value` | No | `4.99` |

Sends to Meta with `test_event_code: "TEST8296"`. Does **not** persist to `meta_capi_events`.

---

## App data

Required for all events with `action_source: "app"` (`CompleteRegistration` from the app, `StartTrial`).

Validated in `app-data.ts`. Reference: [Meta app_data parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/app-data).

```typescript
{
  advertiser_tracking_enabled: 0 | 1,
  application_tracking_enabled: 0 | 1,
  campaign_ids: string | null,
  extinfo: [ /* exactly 16 strings */ ]
}
```

**extinfo rules:**

- Must be an array of exactly **16** string values
- `extinfo[0]` — extinfo version (required, non-empty)
- `extinfo[4]` — OS version (required, non-empty)
- Remaining slots may be empty strings `""`

During app complete registration, validated `app_data` is persisted to `profiles.app_data` (jsonb). Trial start events read it back from the profile rather than requiring it in the webhook body.

---

## End-to-end flows

### Website signup

```
User completes onboarding form
  → completeRegistration() [website, action_source: "website"]
  → meta-capi-handler/complete-registration
  → Update profiles (name, country, ip, fbp, fbc, etc.)
  → Send CompleteRegistration to Meta
  → Insert meta_capi_events row
```

### App signup + trial

```
User completes onboarding in app
  → POST complete-registration [action_source: "app", app_data: {...}]
  → Update profiles (including app_data)
  → Send CompleteRegistration to Meta

User starts free trial
  → RevenueCat INITIAL_PURCHASE (period_type: TRIAL)
  → revenuecat-webhook
  → meta-capi-handler/trial-start
  → Load profile (ip, fbp, fbc, app_data)
  → Send StartTrial to Meta (action_source: app)
  → Insert meta_capi_events row

Trial converts to paid subscription
  → RevenueCat RENEWAL
  → revenuecat-webhook
  → meta-capi-handler/renewal
  → Load profile + lookup StartTrial in meta_capi_events
  → Send Purchase to Meta with original_event_data
  → Insert meta_capi_events row
```

### Direct purchase (no trial)

```
RevenueCat INITIAL_PURCHASE (non-trial)
  → revenuecat-webhook
  → meta-capi-handler/purchase
  → Load profile (no app_data needed)
  → Send Purchase to Meta (action_source: system_generated)
  → original_event_data omitted if no StartTrial exists
```

---

## Error handling and debugging

### Persistence

Every production send attempt inserts into `meta_capi_events`, including:

- Meta API errors (stored in `error_message`, response in `meta_response`)
- Pre-send failures (missing profile data, invalid `app_data`, missing email)
- Missing `META_CONVERSIONS_API_TOKEN`

Query recent events for a user:

```sql
SELECT *
FROM meta_capi_events
WHERE user_id = '{user_uuid}'
ORDER BY created_at DESC;
```

### Common failure modes

| Symptom | Likely cause |
|---------|--------------|
| `Failed to get profile data for StartTrial` | Profile missing `ip_address` or email not resolvable |
| `Invalid or missing profile app_data for StartTrial` | App registration didn't save `app_data`, or user registered before app_data support |
| `Failed to resolve user email` | Auth user exists but email RPC failed |
| `META_CONVERSIONS_API_TOKEN not set` | Missing env var on edge function |
| Purchase sent without `original_event_data` | No `StartTrial` row in `meta_capi_events` for that user |
| `meta-capi-handler invocation failed` (RevenueCat logs) | Wrong `INTERNAL_SECRET`, service role issue, or 4xx/5xx from handler |

### Sentry

Unhandled errors in `meta-capi-handler` are reported to Sentry when `SENTRY_DSN` is configured. RevenueCat webhook also captures invocation failures.

### Logs

Edge function logs are prefixed with `[META-CAPI-HANDLER]` or `[META-CAPI]`. Check Supabase function logs for send details and Meta API responses.

---

## Action source summary

| Event | Route | `action_source` | `app_data` | `original_event_data` |
|-------|-------|-----------------|------------|------------------------|
| CompleteRegistration | `complete-registration` (website) | `website` | No | No |
| CompleteRegistration | `complete-registration` (app) | `app` | Yes (request body) | No |
| StartTrial | `trial-start` | `app` | Yes (from profile) | No |
| Purchase | `purchase` | `system_generated` | No | Yes (if StartTrial exists) |
| Purchase | `renewal` | `system_generated` | No | Yes (if StartTrial exists) |
| Purchase (test) | `test-purchase` | `website` | No | No |

---

## Related documentation

- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta app_data parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/app-data)
- RevenueCat webhook handler: `supabase/functions/revenuecat-webhook/index.ts`
- Website client helper: `src/lib/complete-registration.ts`
