import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManualCancellationRequest {
  userId: string;
  accessExpiresAt: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-MANUAL-CANCELLATION-EMAIL] ${step}${detailsStr}`);
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
    const { userId, accessExpiresAt }: Partial<ManualCancellationRequest> = await req.json();

    if (!userId) {
      logStep("Missing userId");
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Processing manual cancellation email", { userId, accessExpiresAt });

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

    // Format the access expiry date
    let accessExpiryFormatted = "the end of your current billing period";
    if (accessExpiresAt) {
      const expiryDate = new Date(accessExpiresAt);
      accessExpiryFormatted = expiryDate.toLocaleDateString("en-AU", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    logStep("Sending manual cancellation email", { userEmail, accessExpiryFormatted });

    const emailResponse = await resend.emails.send({
      from: "Scamly <noreply@scamly.io>",
      to: [userEmail],
      subject: "Your Scamly Subscription Has Been Cancelled",
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
                  We're Sorry to See You Go
                </h1>
              </div>

              <!-- Main Content -->
              <div style="margin-bottom: 24px;">
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${firstName},
                </p>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Thank you for trying Scamly Premium. We truly appreciate you giving us a chance to help protect you from scams.
                </p>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Your subscription has been successfully cancelled, and <strong>you will not be charged again</strong>.
                </p>
              </div>

              <!-- Access Info Box -->
              <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #166534; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                  ✓ Your Access Continues
                </h3>
                <p style="color: #15803d; font-size: 14px; line-height: 1.6; margin: 0;">
                  You'll retain full access to all premium features until <strong>${accessExpiryFormatted}</strong>. After that, your account will be downgraded to our free plan.
                </p>
              </div>

              <!-- Feedback Request -->
              <div style="margin-bottom: 24px;">
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  If you have a moment, we'd love to hear about your experience. Was there something we could have done better? Your feedback helps us improve for everyone.
                </p>
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                  Simply reply to this email with any thoughts — no pressure at all.
                </p>
              </div>

              <!-- Resubscribe Info -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Changed your mind?</strong> You can resubscribe anytime from your account portal at <a href="https://scamly.io/portal" style="color: #6366f1;">scamly.io/portal</a>. We'll be here whenever you need us.
                </p>
              </div>

              <!-- Sign-off -->
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">
                  Thank you again for being part of the Scamly community. Stay safe out there.
                </p>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 4px 0;">
                  Warm regards,
                </p>
                <p style="color: #18181b; font-size: 16px; line-height: 1.6; margin: 0; font-weight: 600;">
                  Ryan<br>
                  <span style="font-weight: 400; color: #71717a;">Founder, Scamly</span>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Scamly. All rights reserved.
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

    logStep("Manual cancellation email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error in send-manual-cancellation-email function", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
