import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "customer-portal";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Sentry for edge function monitoring
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

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      const error = new Error("STRIPE_SECRET_KEY is not set");
      captureError(error, { step: "env_check" });
      throw error;
    }
    logStep("Stripe key verified");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const error = new Error("No authorization header provided");
      captureError(error, { step: "authentication" });
      throw error;
    }
    logStep("Authorization header found");

    // Authenticate the user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      const error = new Error(`Authentication error: ${userError.message}`);
      captureError(error, { step: "authentication", errorCode: userError.code });
      throw error;
    }
    
    const user = userData.user;
    if (!user?.email) {
      const error = new Error("User not authenticated or email not available");
      captureError(error, { step: "authentication" });
      throw error;
    }
    logStep("User authenticated", { userId: user.id });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // Find the Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      const error = new Error("No Stripe customer found for this user. Please subscribe first.");
      captureError(error, { step: "find_customer", userId: user.id });
      throw error;
    }
    
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get the origin for the return URL
    const origin = req.headers.get("origin") || "https://rdrumcjwntyfnjhownbd.lovable.app";

    // Create a billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/portal`,
    });

    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    
    if (error instanceof Error && sentryDsn) {
      captureError(error, { step: "unhandled", message: errorMessage });
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
