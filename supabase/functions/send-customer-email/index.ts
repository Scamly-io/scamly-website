import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "send-customer-email";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
};

// Initialize Sentry
const sentryDsn = Deno.env.get("SENTRY_DSN");
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
      }
      return event;
    },
  });
}

// Email types — payment_failed removed (now handled by Stripe directly)
type EmailType = 
  | "welcome" 
  | "subscription_created"
  | "free_trial_created"
  | "manual_cancellation" 
  | "forced_cancellation";

interface EmailRequest {
  type: EmailType;
  userId: string;
  // Fields for subscription_created and free_trial_created
  price?: string;
  billingPeriod?: string;
  nextPayment?: string;
  // Field for manual_cancellation
  accessExpiresAt?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

const logWarn = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.warn(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

const logError = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.error(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

const captureError = (error: Error, context: Record<string, unknown>) => {
  if (!sentryDsn) return;
  Sentry.withScope((scope) => {
    scope.setTag("function", FUNCTION_NAME);
    scope.setTag("source", "edge-function");
    scope.setContext("details", context);
    Sentry.captureException(error);
  });
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const requestData: Partial<EmailRequest> = await req.json();
    const { type, userId, price, billingPeriod, nextPayment, accessExpiresAt } = requestData;

    if (!type || !userId) {
      return new Response(JSON.stringify({ error: "type and userId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Welcome email is handled separately
    // Uses atomic claim mechanism to prevent duplicate sends
    if (type === "welcome") {
      const { data: claimedRows, error: claimError } = await supabaseClient
        .from("profiles")
        .update({ welcome_email_sent: true })
        .eq("id", userId)
        .eq("welcome_email_sent", false)
        .select("first_name");

      if (claimError) {
        return new Response(JSON.stringify({ error: "Failed to claim welcome email send" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!claimedRows || claimedRows.length === 0) {
        return new Response(JSON.stringify({ message: "Welcome email already sent" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const releaseClaim = async () => {
        await supabaseClient
          .from("profiles")
          .update({ welcome_email_sent: false })
          .eq("id", userId);
      };

      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.admin.getUserById(userId);

      if (userError || !user?.email) {
        await releaseClaim();
        captureError(new Error("Failed to fetch user"), {
          step: "fetch_user_for_welcome_email",
          userId,
          errorMessage: userError?.message,
        });
        return new Response(JSON.stringify({ error: "Failed to fetch user" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const firstName = claimedRows[0]?.first_name || "there";
      const userEmail = user.email;

      const emailResponse = await resend.emails.send({
        to: [userEmail],
        template: {
          id: "welcome-email",
          variables: {
            NAME: firstName,
          },
        },
      });

      if (emailResponse.error) {
        await releaseClaim();
        captureError(new Error("Failed to send welcome email"), {
          step: "send_welcome_email",
          userId,
          errorMessage: emailResponse.error.message,
        });
        return new Response(JSON.stringify({ error: emailResponse.error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // All other emails
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("first_name, subscription_plan")
      .eq("id", userId)
      .single();

    if (profileError) {
      captureError(new Error("Failed to fetch profile"), {
        step: "fetch_profile_for_email",
        userId,
        errorMessage: profileError?.message,
      });
      return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      captureError(new Error("Failed to fetch user email"), {
        step: "fetch_user_email_for_email",
        userId,
        errorMessage: userError?.message,
      });
      return new Response(JSON.stringify({ error: "Failed to fetch user email" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const firstName = profile?.first_name || "there";
    const userEmail = user.email;

    let templateId = "";
    let variables: Record<string, string> = {};

    switch (type) {
      case "free_trial_created": {
        if (!price || !billingPeriod || !nextPayment) {
          captureError(new Error("Missing required fields for free_trial_created"), {
            step: "free_trail_created",
            userId,
            price,
            billingPeriod,
            nextPayment,
          });
          return new Response(JSON.stringify({ error: "Missing required fields for free_trial_created" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        templateId = "free-trial-created";
        variables = {
          NAME: firstName,
          PRICE: price,
          BILLING_PERIOD: billingPeriod,
          NEXT_PAYMENT: nextPayment,
        };
        break;
      }

      case "subscription_created": {
        if (!price || !billingPeriod || !nextPayment) {
          captureError(new Error("Missing required fields for subscription_created"), {
            step: "subscription_created",
            userId,
            price,
            billingPeriod,
            nextPayment,
          });
          return new Response(JSON.stringify({ error: "Missing required fields for subscription_created" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        templateId = "subscription-created-1";
        variables = {
          NAME: firstName,
          PRICE: price,
          BILLING_PERIOD: billingPeriod,
          NEXT_PAYMENT: nextPayment,
        };
        break;
      }

      case "manual_cancellation": {
        let accessExpiryFormatted = "the end of your current billing period";
        if (accessExpiresAt) {
          accessExpiryFormatted = formatDate(accessExpiresAt);
        }

        templateId = "subscription-manual-cancellation-1";
        variables = {
          ACCESS_EXPIRES_AT: accessExpiryFormatted,
        };
        break;
      }

      case "forced_cancellation": {
        templateId = "subscription-forced-cancellation-1";
        variables = {
          NAME: firstName,
        };
        break;
      }

      default:
        captureError(new Error("Unknown email type"), {
          step: "unknown_email_type",
          userId,
          type,
        });
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    logStep(`Sending ${type} email via Resend template`, { userEmail, templateId });

    const emailResponse = await resend.emails.send({
      to: [userEmail],
      template: {
        id: templateId,
        variables,
      },
    });

    if (emailResponse.error) {
      captureError(new Error("Failed to send email"), {
        step: "send_email",
        userId,
        errorMessage: emailResponse.error.message,
      });
      return new Response(JSON.stringify({ error: emailResponse.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logError("Error in send-customer-email function", { error: error.message });
    captureError(new Error("Error in send-customer-email function"), {
      step: "unhandled",
      errorMessage: error.message,
    });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
