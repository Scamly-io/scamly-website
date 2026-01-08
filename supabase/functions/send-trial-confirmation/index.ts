import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialConfirmationRequest {
  userId: string;
  plan: "monthly" | "yearly";
  trialEndDate: string; // ISO date string
  firstBillingDate: string; // ISO date string
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-TRIAL-CONFIRMATION] ${step}${detailsStr}`);
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
    const { userId, plan, trialEndDate, firstBillingDate }: Partial<TrialConfirmationRequest> = await req.json();

    if (!userId || !plan || !trialEndDate || !firstBillingDate) {
      logStep("Missing required fields", { userId, plan, trialEndDate, firstBillingDate });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Processing trial confirmation email", { userId, plan });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("first_name")
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

    // Calculate pricing based on plan
    const planDetails = plan === "yearly" 
      ? { name: "Premium Yearly", price: "$99.00 AUD", billingPeriod: "year" }
      : { name: "Premium Monthly", price: "$10.00 AUD", billingPeriod: "month" };

    const trialStartDate = new Date().toISOString();
    const formattedTrialStart = formatDate(trialStartDate);
    const formattedTrialEnd = formatDate(trialEndDate);
    const formattedFirstBilling = formatDate(firstBillingDate);

    // Calculate reminder date (7 days before trial end)
    const reminderDate = new Date(trialEndDate);
    reminderDate.setDate(reminderDate.getDate() - 7);
    const formattedReminderDate = formatDate(reminderDate.toISOString());

    logStep("Sending trial confirmation email", { userEmail, plan, trialEndDate });

    const emailResponse = await resend.emails.send({
      from: "Scamly <noreply@scamly.io>",
      to: [userEmail],
      subject: "Your Scamly Free Trial Has Started",
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
                  Your Free Trial Has Started! 🎉
                </h1>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0;">
                  Hi ${firstName}, thank you for starting your free trial of Scamly Premium.
                </p>
              </div>

              <!-- Important Notice Box -->
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #92400e; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  ⚠️ Important Subscription Information
                </h3>
                <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
                  By starting this free trial, you have consented to an <strong>ongoing subscription with recurring payments</strong>. 
                  Your subscription will automatically continue after the trial period ends unless you cancel before the first billing date.
                </p>
              </div>

              <!-- Trial Details Box -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
                  📋 Your Trial & Subscription Details
                </h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Service</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      Scamly Premium - AI-powered scam protection including unlimited scans, AI chat assistance, and full article library access
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Selected Plan</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${planDetails.name}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Trial Period</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      14 days
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Trial Price</strong>
                    </td>
                    <td style="padding: 10px 0; color: #22c55e; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      FREE ($0.00)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Trial Start Date</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${formattedTrialStart}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Trial End Date</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${formattedTrialEnd}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>First Billing Date</strong>
                    </td>
                    <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${formattedFirstBilling}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
                      <strong>Subscription Price After Trial</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
                      ${planDetails.price} per ${planDetails.billingPeriod}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #52525b; font-size: 14px;">
                      <strong>Billing Frequency</strong>
                    </td>
                    <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right;">
                      ${plan === "yearly" ? "Annually (every 12 months)" : "Monthly"}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Reminder Notice -->
              <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  📅 Reminder Notification
                </h3>
                <p style="color: #1e3a8a; font-size: 14px; line-height: 1.6; margin: 0;">
                  We will send you a reminder email <strong>7 days before your trial ends</strong> (on ${formattedReminderDate}) 
                  to remind you of your upcoming first charge. This gives you time to cancel if you no longer wish to continue.
                </p>
              </div>

              <!-- Cancellation Policy -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                  ❌ How to Cancel Your Subscription
                </h3>
                <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                  You can cancel your subscription at any time before your trial ends to avoid being charged. Here's how:
                </p>
                <ol style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>Log in to your Scamly account at <a href="https://scamly.io" style="color: #6366f1;">scamly.io</a></li>
                  <li>Navigate to the <a href="https://scamly.io/portal" style="color: #6366f1;">Portal page</a></li>
                  <li>Click on <strong>"Manage Subscription"</strong></li>
                  <li>Select <strong>"Cancel Subscription"</strong></li>
                  <li>Confirm your cancellation</li>
                </ol>
                <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
                  Your cancellation will take effect immediately after your current period ends, and you will not be charged.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://scamly.io/portal" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                  Start Using Scamly Premium →
                </a>
              </div>

              <!-- Support Section -->
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                  Questions about your trial or subscription? Email us at <a href="mailto:support@scamly.io" style="color: #6366f1;">support@scamly.io</a>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Scamly. All rights reserved.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
                You're receiving this email because you started a free trial on Scamly.
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

    logStep("Trial confirmation email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error in send-trial-confirmation function", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
