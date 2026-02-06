
# Email Unsubscribe Redirect Implementation

## Overview
Change the unsubscribe flow from returning inline HTML to redirecting users to a dedicated `/email-unsubscribed` page. This will ensure proper HTML rendering and provide a consistent user experience.

## Changes

### 1. Create New Unsubscribe Result Page
Create a new page at `src/pages/EmailUnsubscribed.tsx` that displays:
- **Success state**: Shows a confirmation message that the user has been unsubscribed
- **Error state**: Shows an error message based on query parameters
- Styled consistently with the existing app design (dark background, centered content)
- Includes the Scamly branding

The page will read query parameters to determine what to display:
- `?status=success` - Shows success message
- `?status=error&reason=invalid-link` - Shows invalid link error
- `?status=error&reason=invalid-token` - Shows invalid token error  
- `?status=error&reason=server-error` - Shows generic server error

### 2. Update App Routing
Add the `/email-unsubscribed` route to **both** routing configurations in `App.tsx`:
- `TestSubdomainApp` - Add route for test environment
- `MainDomainApp` - Add route for main domain (since unsubscribe emails go to main domain users)

### 3. Modify Unsubscribe Edge Function
Update `supabase/functions/unsubscribe/index.ts` to:
- Remove the `htmlResponse` function (no longer needed)
- Replace all HTML responses with HTTP 302 redirects
- Redirect to the app URL with appropriate query parameters
- Use the app's base URL (will need to determine the correct domain)

The redirect URLs will be:
- Success: `https://scamly.io/email-unsubscribed?status=success`
- Invalid link: `https://scamly.io/email-unsubscribed?status=error&reason=invalid-link`
- Invalid token: `https://scamly.io/email-unsubscribed?status=error&reason=invalid-token`
- Server error: `https://scamly.io/email-unsubscribed?status=error&reason=server-error`

---

## Technical Details

### New Page Component Structure
```text
src/pages/EmailUnsubscribed.tsx
├── Parse query params (status, reason)
├── Conditional rendering based on status
├── Success view with checkmark icon
├── Error view with appropriate message
└── Link back to home page
```

### Edge Function Redirect Logic
```text
Instead of: return htmlResponse(title, message, success)
Use: return Response.redirect(redirectUrl, 302)
```

### Route Configuration
The page will be accessible at `/email-unsubscribed` on both the main domain and test subdomain since users who register interest via the main domain will receive emails with unsubscribe links.
