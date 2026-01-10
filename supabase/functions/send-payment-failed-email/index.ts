import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentFailedRequest {
  userId: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-PAYMENT-FAILED-EMAIL] ${step}${detailsStr}`);
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
    const { userId }: Partial<PaymentFailedRequest> = await req.json();

    if (!userId) {
      logStep("Missing userId");
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Processing payment failed email", { userId });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("first_name, subscription_plan")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError });
      return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user email from auth
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      logStep("Error fetching user", { error: userError });
      return new Response(JSON.stringify({ error: "Failed to fetch user email" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const firstName = profile?.first_name || "there";
    const userEmail = user.email;

    // Get plan details
    const isYearly = profile?.subscription_plan === "premium-yearly";
    const planDetails = isYearly
      ? { name: "Premium Yearly", price: "$99.00 AUD" }
      : { name: "Premium Monthly", price: "$10.00 AUD" };

    logStep("Sending payment failed email", { userEmail });

    const emailResponse = await resend.emails.send({
      from: "Scamly <noreply@scamly.io>",
      to: [userEmail],
      subject: "Action Required: Payment Issue with Your Scamly Subscription",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Logo/Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <img style="width: 128px" src="https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png" alt="Scamly Logo"/>
              </div>
              
              <!-- Title -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
                  We've Detected a Payment Issue 💳
                </h1>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0;">
                  Hi ${firstName}, we wanted to let you know that your recent payment for Scamly Premium was unsuccessful.
                </p>
              </div>

              <!-- Alert Box -->
              <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #991b1b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  ⚠️ What This Means
                </h3>
                <p style="color: #b91c1c; font-size: 14px; line-height: 1.6; margin: 0;">
                  Your subscription is currently in a <strong>past due</strong> state. You still have full access to all premium features for now, but we'll need you to update your payment details to continue your subscription.
                </p>
              </div>

              <!-- Subscription Details -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                  📋 Your Subscription
                </h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Plan</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${planDetails.name}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Amount Due</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${planDetails.price}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px;">
                      <strong>Status</strong>
                    </td>
                    <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 600; text-align: right;">
                      Past Due
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Common Reasons -->
              <div style="margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  Common reasons for payment failure:
                </h3>
                <ul style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>Your card has expired or been replaced</li>
                  <li>Insufficient funds in your account</li>
                  <li>Your bank declined the transaction</li>
                  <li>Your billing address has changed</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://scamly.io/portal" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                  Update Payment Details →
                </a>
              </div>

              <!-- Instructions -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  How to Update Your Payment:
                </h3>
                <ol style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>Go to <a href="https://scamly.io/portal" style="color: #6366f1;">scamly.io/portal</a></li>
                  <li>Click <strong>"Manage Subscription"</strong></li>
                  <li>Update your payment method</li>
                  <li>We'll automatically retry the payment</li>
                </ol>
              </div>

              <!-- Support Section -->
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                  Need help? Reply to this email or contact us at <a href="mailto:support@scamly.io" style="color: #6366f1;">support@scamly.io</a>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Scamly. All rights reserved.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
                You're receiving this email because there was an issue with your Scamly subscription payment.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      logStep("Error sending email", { error: emailResponse.error });
      return new Response(JSON.stringify({ error: emailResponse.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Payment failed email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error in send-payment-failed-email function", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
