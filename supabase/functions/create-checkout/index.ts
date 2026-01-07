import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs from Stripe
const PRICES = {
  monthly: "price_1RZoVe3J81eQle64BxY5Ls2s", // $10/month
  yearly: "price_1RaBqI3J81eQle64GF6WYMfm", // $99/year
};

// Stripe coupon IDs for referrals
const REFERRAL_COUPONS = {
  REFERRED_USER_10_PERCENT: "qLrjIGkn", // 10% off for referred user
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Create Supabase client with service role for referral operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    // Authenticate the user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body for plan selection and optional referral code
    const { plan, referralCode } = await req.json();
    if (!plan || !["monthly", "yearly"].includes(plan)) {
      throw new Error("Invalid plan. Must be 'monthly' or 'yearly'");
    }
    logStep("Plan selected", { plan, hasReferralCode: !!referralCode });

    const priceId = PRICES[plan as keyof typeof PRICES];
    logStep("Price ID determined", { priceId });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // Validate referral code if provided
    let validatedReferrer: { id: string; code: string } | null = null;

    if (referralCode && typeof referralCode === "string") {
      const normalizedCode = referralCode.trim().toUpperCase();
      logStep("Validating referral code", { code: normalizedCode });

      // Check if user has ever used a referral code
      const { data: existingReferral } = await supabaseAdmin
        .from("referrals")
        .select("id")
        .eq("referred_user_id", user.id)
        .maybeSingle();

      if (existingReferral) {
        logStep("User has already used a referral code, ignoring", { userId: user.id });
      } else {
        // Find the referral code owner
        const { data: referrer } = await supabaseAdmin
          .from("profiles")
          .select("id, referral_code, referral_code_active")
          .ilike("referral_code", normalizedCode)
          .maybeSingle();

        if (referrer && referrer.id !== user.id && referrer.referral_code_active) {
          validatedReferrer = { id: referrer.id, code: referrer.referral_code };
          // Update the referred users profile with temp "referred_user" boolean
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              referred_user: true,
            })
            .eq("id", user.id);
          if (updateError) {
            logStep("Error updating referred user profile", { error: updateError });
          } else {
            logStep("Referred user profile updated successfully", { userId: user.id });
          }
          logStep("Referral code validated", { referrerId: referrer.id });
        } else {
          logStep("Referral code invalid or inactive", {
            found: !!referrer,
            isSelf: referrer?.id === user.id,
            isActive: referrer?.referral_code_active,
          });
        }
      }
    }

    // Check if a Stripe customer already exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      logStep("No existing Stripe customer, will create during checkout");
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "https://rdrumcjwntyfnjhownbd.lovable.app";

    // Build checkout session params with 14-day free trial
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/portal?success=true`,
      cancel_url: `${origin}/portal?canceled=true`,
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          user_id: user.id,
          // Store referrer info in subscription metadata for webhook processing
          ...(validatedReferrer && {
            referrer_user_id: validatedReferrer.id,
            referral_code_used: validatedReferrer.code,
          }),
        },
      },
      metadata: {
        user_id: user.id,
        ...(validatedReferrer && {
          referrer_user_id: validatedReferrer.id,
          referral_code_used: validatedReferrer.code,
        }),
      },
    };

    // Apply 10% discount coupon for referred users
    if (validatedReferrer) {
      sessionParams.discounts = [{ coupon: REFERRAL_COUPONS.REFERRED_USER_10_PERCENT }];
      logStep("Applying referral discount", { couponId: REFERRAL_COUPONS.REFERRED_USER_10_PERCENT });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
