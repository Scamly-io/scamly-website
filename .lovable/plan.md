

## Adjustment to Portal Onboarding Token Handling

### Change

When the `/portal/onboarding` page receives a `token` query parameter, use that same token value for **both** `access_token` and `refresh_token` in the `supabase.auth.setSession()` call:

```typescript
await supabase.auth.setSession({
  access_token: token,
  refresh_token: token,
});
```

This is intentional -- the session won't persist long-term, which is acceptable since mobile app users complete onboarding in a temporary webview that closes afterward.

### Files Affected

| File | Action |
|------|--------|
| `src/pages/PortalOnboarding.tsx` | Update `setSession` call to use `token` for both fields (during creation of this file) |

This is a minor adjustment to the existing approved plan. No other changes needed.

