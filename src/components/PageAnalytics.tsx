"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isAnalyticsAllowed } from "../lib/analytics-gate";
import {
  getPageVisitedProperties,
  resolvePageName,
  trackPageVisited,
} from "../lib/analytics";

/**
 * Fires page_visited on client-side route changes (App Router).
 * Deferred until PostHog initializes when the user has granted analytics consent.
 */
export function PageAnalytics() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTrackedRef.current === pathname) return;
    if (!isAnalyticsAllowed()) return;

    lastTrackedRef.current = pathname;
    trackPageVisited(resolvePageName(pathname), getPageVisitedProperties(pathname));
  }, [pathname]);

  return null;
}
