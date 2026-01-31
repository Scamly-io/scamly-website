

# Subdomain Testing Setup Plan

## Overview
This plan sets up a dual-site architecture where the main domain (`scamly.io`) serves as a marketing/landing page with interest registration, while a test subdomain (`test.scamly.io`) retains full app functionality behind password protection.

---

## DNS Configuration Required

After publishing your site to your custom domain, add these DNS records at your domain provider:

```text
Type    Name    Value
----    ----    -----
A       @       185.158.133.1       (root domain)
A       www     185.158.133.1       (www subdomain)  
A       test    185.168.133.1       (test subdomain)
TXT     _lovable lovable_verify=... (verification - provided by Lovable)
```

Note: After setting up DNS, you will need to add both `scamly.io` and `test.scamly.io` as separate custom domains in Lovable's project settings. Both will serve the same codebase, with subdomain detection handled in the React app.

---

## Implementation Tasks

### 1. Create Subdomain Detection Utility
Create `src/lib/subdomain.ts` to detect which site the user is on:
- `isTestSubdomain()`: Returns `true` if hostname starts with `test.` or includes `test.`
- This utility will be used throughout the app to conditionally render content and control routing

### 2. Update App.tsx for Subdomain-Aware Routing
Modify the main app to:
- On test subdomain: Apply `PasswordGate` wrapper and allow all routes (current behavior)
- On main domain: Remove password protection, redirect all non-home routes to `/`
- Remove dependency on `VITE_PRIVATE_MODE` environment variable (subdomain detection handles this)

### 3. Create Register Interest Section Component
Create `src/components/landing/RegisterInterestSection.tsx`:
- Replace the CTASection on the main domain
- Email input field with validation
- "Register Interest" button (UI only, no backend)
- Friendly copy about being notified when Scamly launches
- Styled consistently with existing landing page components

### 4. Update Index Page
Modify `src/pages/Index.tsx`:
- Conditionally render `CTASection` (test subdomain) or `RegisterInterestSection` (main domain)

### 5. Create Main Domain Navbar
Create `src/components/MainDomainNavbar.tsx`:
- Remove Sign In/Get Started buttons
- Keep only theme toggle and anchor links (Features, Pricing, About)
- Remove mobile menu auth buttons

### 6. Update Index Page Navbar
Modify `src/pages/Index.tsx`:
- Conditionally render `Navbar` (test subdomain) or `MainDomainNavbar` (main domain)

### 7. Create Main Domain Pricing Section
Create `src/components/landing/MainPricingSection.tsx`:
- Copy existing `PricingSection.tsx`
- Remove CTA buttons from both pricing cards
- Update trust note to: "Start with a 14-day free trial. Accounts can be created when Scamly is released to the App Store and Google Play."

### 8. Update Index Page Pricing
Modify `src/pages/Index.tsx`:
- Conditionally render `PricingSection` (test subdomain) or `MainPricingSection` (main domain)

### 9. Create Main Domain Footer
Create `src/components/MainDomainFooter.tsx`:
- Remove "Download App" link
- Keep Features, Pricing links as anchor links
- Keep Privacy Policy and Terms of Service (these should remain accessible)

### 10. Update SEO Meta Tags
Modify `index.html`:
- Remove `noindex, nofollow` meta tags (main domain should be indexed)
- Add conditional logic note (the test subdomain will have its own robots handling via the app)

### 11. Update robots.txt
Modify `public/robots.txt`:
- Allow crawling for the main domain
- Note: The test subdomain password protection effectively blocks crawlers anyway

---

## Technical Details

### Subdomain Detection Logic
```typescript
// src/lib/subdomain.ts
export function isTestSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.startsWith('test.') || hostname.includes('.test.');
}

export function isMainDomain(): boolean {
  return !isTestSubdomain();
}
```

### Route Protection on Main Domain
```typescript
// In App.tsx
const MainDomainApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      {/* All other routes redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
```

### Register Interest Section Structure
- Badge: "Coming Soon to App Store & Google Play"
- Heading: "Be the First to Know"
- Subheading: "Sign up to get notified when Scamly launches and receive exclusive early access."
- Email input with submit button
- Note: UI only, backend integration to follow

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/subdomain.ts` | Create | Subdomain detection utilities |
| `src/App.tsx` | Modify | Subdomain-aware routing and password protection |
| `src/components/landing/RegisterInterestSection.tsx` | Create | Email signup form for main domain |
| `src/components/MainDomainNavbar.tsx` | Create | Navbar without auth buttons |
| `src/components/MainDomainFooter.tsx` | Create | Footer without download links |
| `src/components/landing/MainPricingSection.tsx` | Create | Pricing without CTA buttons |
| `src/pages/Index.tsx` | Modify | Conditional component rendering |
| `index.html` | Modify | Remove noindex meta tags |
| `public/robots.txt` | Modify | Allow crawling |

---

## Testing Checklist
After implementation, verify:
- [ ] Main domain shows landing page without auth buttons
- [ ] Main domain redirects `/auth`, `/portal`, etc. to `/`
- [ ] Main domain shows Register Interest section instead of CTA
- [ ] Main domain pricing cards have no buttons
- [ ] Main domain is not password protected
- [ ] Test subdomain shows password gate
- [ ] Test subdomain has full functionality after password entry
- [ ] Terms and Privacy pages accessible on both domains

