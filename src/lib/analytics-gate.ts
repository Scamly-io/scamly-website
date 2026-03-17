/**
 * Analytics Gate
 *
 * Determines whether analytics/cookies should be loaded on the current page.
 * Onboarding pages are excluded because they are rendered inside an iOS
 * webview and Apple requires the ATT framework for cookie-based tracking.
 */

const EXCLUDED_PATHS = ["/portal/onboarding", "/portal/onboarding-complete"];

export function isAnalyticsAllowed(): boolean {
  return !EXCLUDED_PATHS.some((p) => window.location.pathname.startsWith(p));
}
