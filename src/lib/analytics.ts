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

const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_API_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

// Track PostHog instance after dynamic import
let posthogInstance: PostHog | null = null;

// Event queue for events fired before PostHog initializes
type QueuedEvent = {
  type: "capture" | "identify" | "reset";
  eventName?: string;
  properties?: Record<string, unknown>;
  userId?: string;
  traits?: Record<string, unknown>;
};
const eventQueue: QueuedEvent[] = [];
let isInitializing = false;

/** Latest page visit before PostHog init (coalesced to avoid duplicate/stale queue entries). */
let pendingPageVisit: {
  pageName: string;
  extraProperties?: Record<string, unknown>;
} | null = null;

/**
 * Process queued events after PostHog initializes
 */
function flushEventQueue(): void {
  if (!posthogInstance) return;
  if (eventQueue.length === 0 && !pendingPageVisit) return;

  if (eventQueue.length > 0) {
    console.log(`[Analytics] Flushing ${eventQueue.length} queued event(s)`);
  }

  while (eventQueue.length > 0) {
    const event = eventQueue.shift();
    if (!event) continue;

    switch (event.type) {
      case "capture":
        if (event.eventName) {
          posthogInstance.capture(event.eventName, event.properties);
          console.log(`[Analytics] Flushed queued event: ${event.eventName}`);
        }
        break;
      case "identify":
        if (event.userId) {
          posthogInstance.identify(event.userId, event.traits);
        }
        break;
      case "reset":
        posthogInstance.reset();
        break;
    }
  }

  if (pendingPageVisit) {
    const { pageName, extraProperties } = pendingPageVisit;
    pendingPageVisit = null;
    posthogInstance.capture("page_visited", {
      ...getCommonProperties(),
      page_name: pageName,
      ...extraProperties,
    });
    console.log("[Analytics] Flushed deferred page_visited");
  }
}

/**
 * Capture an event, queuing if PostHog isn't ready yet
 */
function captureEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (posthogInstance) {
    posthogInstance.capture(eventName, properties);
    console.log(`[Analytics] ${eventName} event tracked`);
  } else {
    // Queue the event for later
    eventQueue.push({ type: "capture", eventName, properties });
    console.log(`[Analytics] ${eventName} event queued (PostHog not ready)`);
  }
}

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
    console.warn(
      "[Analytics] NEXT_PUBLIC_POSTHOG_API_KEY not set, analytics disabled"
    );
    return;
  }

  // Guard: Prevent double initialization
  if (posthogInstance || isInitializing) {
    return;
  }

  isInitializing = true;

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

    // Flush any events that were queued before initialization
    flushEventQueue();
  } catch (error) {
    console.error("[Analytics] Failed to initialize PostHog:", error);
  } finally {
    isInitializing = false;
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
  if (posthogInstance) {
    posthogInstance.identify(userId, traits);
  } else {
    eventQueue.push({ type: "identify", userId, traits });
    console.log(`[Analytics] identify event queued (PostHog not ready)`);
  }
}

/**
 * Reset user identification (call on logout).
 * This ensures subsequent events are tracked as a new anonymous user.
 */
export function resetUser(): void {
  if (posthogInstance) {
    posthogInstance.reset();
  } else {
    eventQueue.push({ type: "reset" });
  }
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
// Page naming & route tracking
// ============================================================================

/**
 * Map a pathname to a stable page_name for segmentation in PostHog.
 */
export function resolvePageName(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/blog") return "blog";
  if (pathname.startsWith("/blog/")) return "blog_post";
  if (pathname === "/auth") return "auth";
  if (pathname === "/check-email") return "check_email";
  if (pathname === "/reset-password") return "reset_password";
  if (pathname === "/portal") return "portal";
  if (pathname === "/portal/onboarding") return "portal_onboarding";
  if (pathname === "/portal/onboarding-complete") return "portal_onboarding_complete";
  if (pathname === "/contact") return "contact";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/terms") return "terms";
  if (pathname === "/account-deleted") return "account_deleted";

  const normalized = pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "_");
  return normalized || "unknown";
}

/**
 * Extra properties for page_visited beyond page_name (e.g. blog slug).
 */
export function getPageVisitedProperties(pathname: string): Record<string, unknown> {
  if (pathname.startsWith("/blog/") && pathname !== "/blog") {
    const slug = pathname.split("/")[2];
    if (slug) return { blog_slug: slug };
  }
  return {};
}

// ============================================================================
// Event Tracking Functions
// ============================================================================

/**
 * PAGE_VISITED Event
 *
 * Business Question: Traffic volume and page-level engagement across the site.
 *
 * Fires when: User navigates to any tracked route (via PageAnalytics).
 */
export function trackPageVisited(
  pageName: string,
  extraProperties?: Record<string, unknown>
): void {
  const properties = {
    ...getCommonProperties(),
    page_name: pageName,
    ...extraProperties,
  };

  if (posthogInstance) {
    posthogInstance.capture("page_visited", properties);
    console.log("[Analytics] page_visited event tracked");
    pendingPageVisit = null;
  } else {
    pendingPageVisit = { pageName, extraProperties };
    console.log("[Analytics] page_visited deferred (PostHog not ready)");
  }
}

/**
 * PRICING_VIEWED Event
 *
 * Business Question: What percentage of visitors see our pricing?
 * This is a key funnel step - if users don't see pricing, they can't convert.
 *
 * Fires when: Pricing section becomes visible (via intersection observer)
 */
export function trackPricingViewed(): void {
  captureEvent("pricing_viewed", {
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
  captureEvent("signup_started", {
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
 */
export function trackSignupCompleted(userId?: string): void {
  captureEvent("signup_completed", {
    ...getCommonProperties(),
    user_id: userId,
  });
}

// ============================================================================
// Generic Event Capture (for future extensibility)
// ============================================================================

/**
 * Generic event capture for custom events.
 * Use specific track* functions when available for consistency.
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  captureEvent(eventName, {
    ...getCommonProperties(),
    ...properties,
  });
}
