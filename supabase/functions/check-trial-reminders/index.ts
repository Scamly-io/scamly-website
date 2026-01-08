import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-TRIAL-REMINDERS] ${step}${detailsStr}`);
};

/**
 * This function should be called daily (via cron or external scheduler) to check
 * for users whose trial ends in exactly 7 days and send them a reminder email.
 * 
 * It queries profiles with:
 * - subscription_status = 'trialing'
 * - subscription_current_period_end is 7 days from now (within a 24hr window)
 * - trial_reminder_sent = false (to prevent duplicate sends)
 * 
 * After sending, it marks trial_reminder_sent = true on the profile.
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    logStep("Starting trial reminder check");

    // Calculate the date range for trials ending in 7 days
    // We look for trials ending between 6.5 and 7.5 days from now to account for timing variance
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const minDate = new Date(sevenDaysFromNow.getTime() - 12 * 60 * 60 * 1000); // 6.5 days
    const maxDate = new Date(sevenDaysFromNow.getTime() + 12 * 60 * 60 * 1000); // 7.5 days

    logStep("Date range for trial reminders", {
      minDate: minDate.toISOString(),
      maxDate: maxDate.toISOString(),
    });

    // Find users who need reminders
    const { data: usersNeedingReminder, error: queryError } = await supabaseClient
      .from("profiles")
      .select("id, first_name, subscription_current_period_end")
      .eq("subscription_status", "trialing")
      .gte("subscription_current_period_end", minDate.toISOString())
      .lte("subscription_current_period_end", maxDate.toISOString());

    if (queryError) {
      logStep("Error querying profiles", { error: queryError });
      return new Response(JSON.stringify({ error: "Failed to query profiles" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Found users needing trial reminder", { count: usersNeedingReminder?.length || 0 });

    if (!usersNeedingReminder || usersNeedingReminder.length === 0) {
      return new Response(JSON.stringify({ message: "No trial reminders needed", sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send reminder emails to each user
    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const user of usersNeedingReminder) {
      try {
        // Call the send-trial-reminder edge function
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-trial-reminder`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ userId: user.id }),
          },
        );

        const result = await response.json();

        if (response.ok && result.success) {
          results.push({ userId: user.id, success: true });
          logStep("Reminder sent successfully", { userId: user.id });
        } else {
          results.push({ userId: user.id, success: false, error: result.error || "Unknown error" });
          logStep("Failed to send reminder", { userId: user.id, error: result.error });
        }
      } catch (error: any) {
        results.push({ userId: user.id, success: false, error: error.message });
        logStep("Error sending reminder", { userId: user.id, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    logStep("Trial reminder check complete", { successCount, failureCount });

    return new Response(
      JSON.stringify({
        message: "Trial reminder check complete",
        sent: successCount,
        failed: failureCount,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    logStep("Error in check-trial-reminders function", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
