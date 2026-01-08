import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { userId }: Partial<WelcomeEmailRequest> = await req.json();

    if (!userId) {
      console.error("No userId provided");
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing welcome email for user: ${userId}`);

    // IMPORTANT: users often have multiple tabs open during email confirmation.
    // To prevent duplicate sends, we atomically "claim" the send in the DB.
    // We temporarily flip welcome_email_sent=true as a lock. If sending fails, we revert it.
    const { data: claimedRows, error: claimError } = await supabaseClient
      .from("profiles")
      .update({ welcome_email_sent: true })
      .eq("id", userId)
      .eq("welcome_email_sent", false)
      .select("first_name");

    if (claimError) {
      console.error("Error claiming welcome email send:", claimError);
      return new Response(JSON.stringify({ error: "Failed to claim welcome email send" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If no row was updated, the email was already sent OR another request/tab is currently processing it.
    if (!claimedRows || claimedRows.length === 0) {
      console.log("Welcome email already sent (or currently processing) for this user");
      return new Response(JSON.stringify({ message: "Welcome email already sent" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const releaseClaim = async () => {
      const { error: releaseError } = await supabaseClient
        .from("profiles")
        .update({ welcome_email_sent: false })
        .eq("id", userId);

      if (releaseError) {
        console.error("Error releasing welcome email claim:", releaseError);
      }
    };

    // Get user email from auth
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      await releaseClaim();
      return new Response(JSON.stringify({ error: "Failed to fetch user" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userEmail = user.email;
    const firstName = claimedRows[0]?.first_name || "there";

    if (!userEmail) {
      console.error("User has no email");
      await releaseClaim();
      return new Response(JSON.stringify({ error: "User has no email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending welcome email to: ${userEmail}`);

    // Send welcome email
    const emailResponse = await resend.emails.send({
      from: "Scamly <noreply@scamly.io>",
      to: [userEmail],
      subject: "Welcome to Scamly!",
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
                <img style="width: 128px" src="cid:top-logo"/>
                <p style="color: #71717a; font-size: 14px; margin-top: 4px;">Your AI-Powered Scam Protection</p>
              </div>
              
              <!-- Welcome Message -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h2 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
                  Welcome, ${firstName}! 🎉
                </h2>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0;">
                  Thank you for joining Scamly. You've taken an important step towards protecting yourself from online scams and fraud.
                </p>
              </div>
              
              <!-- Features Section -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <h3 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">What you can do with Scamly:</h3>
                <ul style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li><strong>Scan suspicious messages</strong> - Instantly analyze texts, emails, and links for potential scams</li>
                  <li><strong>Chat with our AI</strong> - Get personalized advice on staying safe online</li>
                  <li><strong>Learn from our library</strong> - Access articles and tips about the latest scam tactics</li>
                  <li><strong>Stay protected 24/7</strong> - Our AI is always ready to help you spot red flags</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://scamly.io/portal" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                  Get Started →
                </a>
              </div>
              
              <!-- Support Section -->
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                  We value your feedback on Scamly. To submit feedback, email feedback@scamly.io
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Scamly. All rights reserved.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
                You're receiving this email because you signed up for Scamly.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          path: "https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png",
          filename: "navbar-logo-light.png",
          contentId: "top-logo",
        },
      ],
    });

    if (emailResponse.error) {
      console.error("Error sending email:", emailResponse.error);
      await releaseClaim();

      const statusCodeRaw = (emailResponse.error as any)?.statusCode;
      const statusCode = typeof statusCodeRaw === "number" ? statusCodeRaw : 500;

      return new Response(JSON.stringify({ error: emailResponse.error.message }), {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
