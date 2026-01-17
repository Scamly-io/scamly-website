import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize Sentry for frontend error tracking and performance monitoring.
 * 
 * Configuration rationale:
 * - tracesSampleRate: 0.1 (10%) - Conservative sampling for performance data
 * - replaysOnErrorSampleRate: 1.0 - Capture replays for all errors
 * - replaysSessionSampleRate: 0 - No session replays (cost control)
 * - Only captures unhandled errors and critical business logic failures
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn("[Sentry] DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? "production" : "development",
    
    // Performance monitoring - conservative sampling
    tracesSampleRate: 0.1,
    
    // Enable in both production and preview environments
    enabled: true,
    
    // Filter out non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Skip validation errors - these are expected user input issues
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Skip common user-initiated validation errors only
        // Note: We DO want to capture network/fetch errors as they indicate real issues
        if (
          message.includes("validation") ||
          message.includes("invalid email") ||
          message.includes("password must") ||
          message.includes("passwords do not match") ||
          message.includes("aborted") // User cancelled request
        ) {
          return null;
        }
      }
      
      // Redact any PII from the event
      if (event.user) {
        event.user = {
          id: event.user.id, // Keep user ID for tracking
          // Remove email, username, ip_address
        };
      }
      
      return event;
    },
    
    // Don't capture breadcrumbs for XHR requests to avoid logging sensitive data
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy console logs
      if (breadcrumb.category === "console" && breadcrumb.level === "log") {
        return null;
      }
      
      // Redact request URLs that might contain sensitive info
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        if (breadcrumb.data?.url) {
          // Keep the URL but redact any query params that might have tokens
          const url = new URL(breadcrumb.data.url, window.location.origin);
          url.searchParams.forEach((_, key) => {
            if (key.toLowerCase().includes("token") || 
                key.toLowerCase().includes("key") ||
                key.toLowerCase().includes("secret")) {
              url.searchParams.set(key, "[REDACTED]");
            }
          });
          breadcrumb.data.url = url.toString();
        }
      }
      
      return breadcrumb;
    },
    
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    
    // Only trace API calls to our backend
    tracePropagationTargets: [
      /^https:\/\/rdrumcjwntyfnjhownbd\.supabase\.co/,
      /^https:\/\/rdrumcjwntyfnjhownbd\.functions\.supabase\.co/,
    ],
  });
  
  console.log("[Sentry] Initialized for frontend monitoring");
}

/**
 * Capture a critical error with context.
 * Use this for business-critical failures that need immediate attention.
 */
export function captureError(
  error: Error,
  context: {
    source: string;
    action: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag("source", "frontend");
    scope.setTag("component", context.source);
    scope.setTag("action", context.action);
    
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context.metadata) {
      // Redact sensitive fields before adding as context
      const safeMetadata = redactSensitiveFields(context.metadata);
      scope.setContext("metadata", safeMetadata);
    }
    
    Sentry.captureException(error);
  });
}

/**
 * Capture a critical message for alerting.
 * Use sparingly - only for critical business events that aren't errors.
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    scope.setTag("source", "frontend");
    
    if (context) {
      const safeContext = redactSensitiveFields(context);
      scope.setContext("details", safeContext);
    }
    
    Sentry.captureMessage(message, level);
  });
}

/**
 * Redact sensitive fields from objects before sending to Sentry.
 */
function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    "password", "token", "secret", "key", "auth", "bearer",
    "credit", "card", "ssn", "email", "phone", "address"
  ];
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(k => lowerKey.includes(k));
    
    if (isSensitive) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

export { Sentry };
