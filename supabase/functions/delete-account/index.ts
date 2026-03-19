import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend";
import { Redis } from "https://esm.sh/@upstash/redis";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@latest";

function getCorsHeaders(req: Request) {
  const requestHeaders = req.headers.get("Access-Control-Request-Headers") || "";
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": requestHeaders || "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[DELETE-ACCOUNT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// ── Error codes for support reference ──────────────────────────────────
// Format: DA-<category><number>
// DA-SUB01: Profile shows active subscription
// DA-SUB02: RevenueCat shows active entitlements
// DA-MIS01: Profile active but RevenueCat inactive (mismatch)
// DA-MIS02: Profile inactive but RevenueCat active (mismatch)
// DA-RC01:  RevenueCat API call failed (could not verify)

/**
 * Check if the user has an active subscription according to the profiles table.
 * "Active" = subscription_status is one of: active, trialing, past_due, pending
 */
function hasActiveProfileSubscription(profile: {
  subscription_status: string | null;
}): boolean {
  const activeStatuses = ["active", "trialing", "past_due", "pending"];
  return !!profile.subscription_status && activeStatuses.includes(profile.subscription_status);
}

/**
 * Check RevenueCat V2 API for active entitlements.
 * Returns: { hasActive: boolean; error?: string }
 */
async function checkRevenueCatEntitlements(
  userId: string,
): Promise<{ hasActive: boolean; error?: string }> {
  const rcApiKey = Deno.env.get("REVENUECAT_V2_API_KEY");
  const rcProjectId = Deno.env.get("REVENUECAT_PROJECT_ID");

  if (!rcApiKey || !rcProjectId) {
    logStep("RevenueCat credentials not configured");
    return { hasActive: false, error: "RevenueCat credentials not configured" };
  }

  try {
    const url = `https://api.revenuecat.com/v2/projects/${rcProjectId}/customers/${encodeURIComponent(userId)}`;
    logStep("Calling RevenueCat V2 API", { url: url.replace(rcProjectId, "***") });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${rcApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      // Customer not found in RevenueCat — no active entitlements
      logStep("Customer not found in RevenueCat (404), treating as no active entitlements");
      return { hasActive: false };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      logStep("RevenueCat API error", { status: response.status, body: errorBody });
      return { hasActive: false, error: `RevenueCat API returned ${response.status}` };
    }

    const data = await response.json();
    const activeEntitlements = data?.active_entitlements?.items || [];
    const hasActive = activeEntitlements.length > 0;

    logStep("RevenueCat entitlements check", {
      hasActive,
      entitlementCount: activeEntitlements.length,
    });

    return { hasActive };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("RevenueCat API call failed", { error: msg });
    return { hasActive: false, error: msg };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    // Rate limiting: 2 per minute
    const redis = new Redis({
      url: Deno.env.get("REDIS_URL")!,
      token: Deno.env.get("REDIS_TOKEN")!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "60 s"),
      analytics: false,
    });

    const { success: rateLimitOk } = await ratelimit.limit(`delete-account:${userId}`);
    if (!rateLimitOk) {
      logStep("Rate limited", { userId });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Fetch profile ──────────────────────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_id, subscription_status, subscription_store, subscription_plan")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
      throw new Error("Failed to fetch profile");
    }

    logStep("Profile fetched", {
      subscriptionStatus: profile.subscription_status,
      subscriptionStore: profile.subscription_store,
      subscriptionPlan: profile.subscription_plan,
    });

    // ── Step 2: Check for active subscription in profiles table ───────
    const profileHasActive = hasActiveProfileSubscription(profile);

    // ── Step 3: Check RevenueCat for active entitlements ──────────────
    const rcResult = await checkRevenueCatEntitlements(userId);

    logStep("Subscription check results", {
      profileHasActive,
      rcHasActive: rcResult.hasActive,
      rcError: rcResult.error || null,
    });

    // ── Step 4: Handle RevenueCat API failure ────────────────────────
    if (rcResult.error) {
      // If we can't verify with RevenueCat, return an error
      logStep("Cannot verify RevenueCat status, returning error", { errorCode: "DA-RC01" });
      return new Response(
        JSON.stringify({
          error: "Unable to verify subscription status. Please try again later or contact support.",
          code: "DA-RC01",
          type: "verification_failed",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 5: Both agree user has active subscription ──────────────
    if (profileHasActive && rcResult.hasActive) {
      logStep("Active subscription detected (both sources agree)", { errorCode: "DA-SUB01" });
      return new Response(
        JSON.stringify({
          error: "You have an active subscription. Please cancel your subscription in the app before deleting your account.",
          code: "DA-SUB01",
          type: "active_subscription",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 6: Mismatch scenarios ───────────────────────────────────
    if (profileHasActive && !rcResult.hasActive) {
      logStep("Mismatch: profile active but RevenueCat inactive", { errorCode: "DA-MIS01" });
      return new Response(
        JSON.stringify({
          error: "There was an issue verifying your subscription status. Please contact support with your error code.",
          code: "DA-MIS01",
          type: "subscription_mismatch",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!profileHasActive && rcResult.hasActive) {
      logStep("Mismatch: profile inactive but RevenueCat active", { errorCode: "DA-MIS02" });
      return new Response(
        JSON.stringify({
          error: "There was an issue verifying your subscription status. Please contact support with your error code.",
          code: "DA-MIS02",
          type: "subscription_mismatch",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 7: No active subscription — proceed with deletion ───────
    logStep("No active subscription, proceeding with deletion");

    // Fetch user email before deletion
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = authUser?.email;

    logStep("User email fetched", { hasEmail: !!userEmail });

    // Send account-deleted email BEFORE deleting the user
    if (userEmail) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          logStep("Sending account-deleted email", { userEmail });
          await resend.emails.send({
            from: "Scamly <notifications@scamly.io>",
            to: [userEmail],
            template: { id: "account-deleted" },
          });
          logStep("Account-deleted email sent");
        } else {
          logStep("RESEND_API_KEY not set, skipping account-deleted email");
        }
      } catch (emailErr) {
        logStep("Account-deleted email error (proceeding with deletion)", {
          error: emailErr instanceof Error ? emailErr.message : String(emailErr),
        });
      }
    }

    // Delete the user from auth (cascades to profiles and other FK tables)
    logStep("Deleting user from auth", { userId });
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logStep("Delete user error", { error: deleteError.message });
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    logStep("User deleted successfully", { userId });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
