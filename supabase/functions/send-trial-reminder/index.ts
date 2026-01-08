import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialReminderRequest {
  userId: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-TRIAL-REMINDER] ${step}${detailsStr}`);
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
    const { userId }: Partial<TrialReminderRequest> = await req.json();

    if (!userId) {
      logStep("Missing userId");
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Processing trial reminder email", { userId });

    // Get user profile with subscription details
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("first_name, subscription_status, subscription_plan, subscription_current_period_end")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError });
      return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify user is actually on trial
    if (profile?.subscription_status !== "trialing") {
      logStep("User is not on trial, skipping reminder", { status: profile?.subscription_status });
      return new Response(JSON.stringify({ message: "User is not on trial" }), {
        status: 200,
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
    const isYearly = profile.subscription_plan === "premium-yearly";
    const planDetails = isYearly
      ? { name: "Premium Yearly", price: "$99.00 AUD", billingPeriod: "year" }
      : { name: "Premium Monthly", price: "$10.00 AUD", billingPeriod: "month" };

    const trialEndDate = profile.subscription_current_period_end;
    const formattedBillingDate = trialEndDate ? formatDate(trialEndDate) : "in 7 days";

    logStep("Sending trial reminder email", { userEmail, trialEndDate });

    const emailResponse = await resend.emails.send({
      from: "Scamly <noreply@scamly.io>",
      to: [userEmail],
      subject: "Your Scamly Trial Ends in 7 Days - Action Required",
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
                  Your Free Trial Ends Soon ⏰
                </h1>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0;">
                  Hi ${firstName}, this is a friendly reminder that your Scamly Premium free trial will end in 7 days.
                </p>
              </div>

              <!-- Important Notice Box -->
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #92400e; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  ⚠️ Upcoming Charge Notice
                </h3>
                <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
                  Your payment method will be automatically charged <strong>${planDetails.price}</strong> on <strong>${formattedBillingDate}</strong> 
                  when your trial period ends. Your subscription will then continue to renew every ${planDetails.billingPeriod} at this rate.
                </p>
              </div>

              <!-- Billing Summary -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
                  💳 Upcoming Billing Summary
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
                      <strong>First Charge Date</strong>
                    </td>
                    <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${formattedBillingDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Amount</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${planDetails.price}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px;">
                      <strong>Billing Frequency</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right;">
                      Every ${planDetails.billingPeriod}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Options Section -->
              <div style="margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                  What would you like to do?
                </h3>
                
                <!-- Continue Option -->
                <div style="background-color: #dcfce7; border: 1px solid #22c55e; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                  <h4 style="color: #166534; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                    ✅ Continue with Scamly Premium
                  </h4>
                  <p style="color: #15803d; font-size: 13px; line-height: 1.5; margin: 0;">
                    No action needed! Your subscription will automatically continue and you'll keep enjoying unlimited scans, AI chat, and full article access.
                  </p>
                </div>

                <!-- Cancel Option -->
                <div style="background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 12px; padding: 16px;">
                  <h4 style="color: #991b1b; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                    ❌ Cancel Your Subscription
                  </h4>
                  <p style="color: #b91c1c; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">
                    If you don't wish to continue, cancel before ${formattedBillingDate} to avoid being charged.
                  </p>
                  <a href="https://scamly.io/portal" style="display: inline-block; background-color: #dc2626; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                    Cancel Subscription →
                  </a>
                </div>
              </div>

              <!-- Steps to Cancel -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  How to Cancel:
                </h3>
                <ol style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>Go to <a href="https://scamly.io/portal" style="color: #6366f1;">scamly.io/portal</a></li>
                  <li>Click <strong>"Manage Subscription"</strong></li>
                  <li>Select <strong>"Cancel Subscription"</strong></li>
                  <li>Confirm your cancellation</li>
                </ol>
              </div>

              <!-- Support Section -->
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                  Questions? Reply to this email or contact us at <a href="mailto:support@scamly.io" style="color: #6366f1;">support@scamly.io</a>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Scamly. All rights reserved.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
                You're receiving this email because you started a free trial on Scamly. This is a required reminder as per Visa's free trial subscription service requirements.
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

    logStep("Trial reminder email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error in send-trial-reminder function", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
