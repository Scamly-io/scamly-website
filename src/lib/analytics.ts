/**
 * PostHog Analytics Helper Module
 *
 * This module centralizes all analytics tracking for the Scamly application.
 * All event capture logic should go through this helper to ensure consistency
 * and make it easy to modify tracking behavior in one place.
 *
 * PostHog is used for:
 * - Behavioral analytics (understanding user journeys)
 * - Funnel analytics (conversion tracking from landing to signup to payment)
 */

import type { PostHog } from "posthog-js";

// ============================================================================
// Configuration
// ============================================================================

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

// Track PostHog instance after dynamic import
let posthogInstance: PostHog | null = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize PostHog analytics.
 * Should be called once when the app starts (e.g., in main.tsx or App.tsx).
 * Only initializes in browser environment and when API key is present.
 * Uses dynamic import to avoid bundling conflicts with React.
 */
export async function initAnalytics(): Promise<void> {
  // Guard: Only run in browser
  if (typeof window === "undefined") {
    console.warn("[Analytics] Not in browser environment, skipping initialization");
    return;
  }

  // Guard: Require API key
  if (!POSTHOG_API_KEY) {
    console.warn("[Analytics] VITE_POSTHOG_API_KEY not set, analytics disabled");
    return;
  }

  // Guard: Prevent double initialization
  if (posthogInstance) {
    return;
  }

  try {
    // Dynamic import to avoid React bundling conflicts
    const posthog = (await import("posthog-js")).default;

    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      // Capture pageviews manually for more control
      capture_pageview: false,
      // Persistence for anonymous user tracking
      persistence: "localStorage+cookie",
      // Autocapture enabled
      autocapture: true,
      enable_heatmaps: true,
    });

    posthogInstance = posthog;
    console.log("[Analytics] PostHog initialized");
  } catch (error) {
    console.error("[Analytics] Failed to initialize PostHog:", error);
  }
}

// ============================================================================
// User Identification
// ============================================================================

/**
 * Identify an authenticated user to PostHog.
 * Call this after successful login/signup to link anonymous events to the user.
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!posthogInstance) return;

  posthogInstance.identify(userId, traits);
}

/**
 * Reset user identification (call on logout).
 * This ensures subsequent events are tracked as a new anonymous user.
 */
export function resetUser(): void {
  if (!posthogInstance) return;

  posthogInstance.reset();
}

// ============================================================================
// Helper: Get Common Event Properties
// ============================================================================

/**
 * Get common properties that should be included with every event.
 * These provide context for analysis and segmentation.
 */
function getCommonProperties(): Record<string, unknown> {
  return {
    // Page context
    page_path: window.location.pathname,
    page_url: window.location.href,
    page_title: document.title,

    // Referrer (if available) - helps understand traffic sources
    referrer: document.referrer || undefined,

    // Anonymous ID for tracking users before authentication
    anonymous_id: posthogInstance?.get_distinct_id?.() || undefined,

    // Timestamp for accurate event ordering
    client_timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Event Tracking Functions
// ============================================================================

/**
 * PAGE_VISITED Event
 *
 * Business Question: How many users land on our home page?
 * What's our traffic volume and growth over time?
 *
 * Fires when: User lands on the home page
 */
export function trackPageVisited(pageName: string = "home"): void {
  if (!posthogInstance) return;

  posthogInstance.capture("page_visited", {
    ...getCommonProperties(),
    page_name: pageName,
  });
}

/**
 * PRICING_VIEWED Event
 *
 * Business Question: What percentage of visitors see our pricing?
 * This is a key funnel step - if users don't see pricing, they can't convert.
 *
 * Fires when: Pricing section becomes visible (via intersection observer)
 * Note: Uses intersection observer, NOT page load, for accurate visibility tracking
 */
export function trackPricingViewed(): void {
  if (!posthogInstance) return;

  posthogInstance.capture("pricing_viewed", {
    ...getCommonProperties(),
  });
}

/**
 * SIGNUP_STARTED Event
 *
 * Business Question: How many users click our signup CTAs?
 * What's our CTA click-through rate?
 * Which CTAs perform best?
 *
 * Fires when: User clicks primary signup CTA button
 */
export function trackSignupStarted(source: string): void {
  if (!posthogInstance) return;

  posthogInstance.capture("signup_started", {
    ...getCommonProperties(),
    // Source helps identify which CTA was clicked (hero, pricing, cta_section, etc.)
    signup_source: source,
  });
}

/**
 * SIGNUP_COMPLETED Event
 *
 * Business Question: What's our signup conversion rate?
 * How many users who started signup actually complete it?
 *
 * Fires when: User successfully completes signup flow
 * Note: Only fires AFTER successful signup, not on form submission
 */
export function trackSignupCompleted(userId?: string): void {
  if (!posthogInstance) return;

  posthogInstance.capture("signup_completed", {
    ...getCommonProperties(),
    // Include user_id if available for linking to identified user
    user_id: userId,
  });
}

/**
 * CHECKOUT_STARTED Event
 *
 * Business Question: How many users initiate payment?
 * What's our checkout initiation rate from the portal?
 *
 * Fires when: User is redirected to Stripe Checkout
 */
export function trackCheckoutStarted(plan: "monthly" | "yearly", hasReferralCode: boolean): void {
  if (!posthogInstance) return;

  posthogInstance.capture("checkout_started", {
    ...getCommonProperties(),
    // Plan helps analyze which pricing option is more popular
    checkout_plan: plan,
    // Referral tracking for attribution
    has_referral_code: hasReferralCode,
  });

  console.log("[Analytics] Checkout started event tracked");
}

/**
 * CHECKOUT_COMPLETED Event
 *
 * Business Question: What's our checkout conversion rate?
 * How many users who start checkout actually complete payment?
 *
 * Fires when: User returns from Stripe with confirmed subscription
 * Note: This relies on the success param in the return URL
 */
export function trackCheckoutCompleted(plan?: string): void {
  if (!posthogInstance) return;

  posthogInstance.capture("checkout_completed", {
    ...getCommonProperties(),
    // Plan info if available
    checkout_plan: plan,
  });

  console.log("[Analytics] Checkout completed event tracked");
}

// ============================================================================
// Generic Event Capture (for future extensibility)
// ============================================================================

/**
 * Generic event capture for custom events.
 * Use specific track* functions when available for consistency.
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!posthogInstance) return;

  posthogInstance.capture(eventName, {
    ...getCommonProperties(),
    ...properties,
  });
}
