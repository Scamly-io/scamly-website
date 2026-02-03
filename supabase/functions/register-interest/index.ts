import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RegisterInterestRequest {
  email: string;
}

async function generateUnsubscribeToken(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hexArray = hexEncode(hashArray);
  return new TextDecoder().decode(hexArray);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const unsubscribeSecret = Deno.env.get("UNSUBSCRIBE_SECRET");
    if (!unsubscribeSecret) {
      throw new Error("UNSUBSCRIBE_SECRET is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const { email }: RegisterInterestRequest = await req.json();

    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("interested_users")
      .select("id, unsubscribed")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing user:", checkError);
      throw new Error("Failed to check existing user");
    }

    if (existingUser) {
      if (existingUser.unsubscribed) {
        // Re-subscribe the user
        const { error: updateError } = await supabase
          .from("interested_users")
          .update({ unsubscribed: false, unsubscribed_at: null })
          .eq("id", existingUser.id);

        if (updateError) {
          console.error("Error re-subscribing user:", updateError);
          throw new Error("Failed to re-subscribe user");
        }
      } else {
        // User already registered
        return new Response(
          JSON.stringify({ success: true, message: "Already registered" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      // Insert new user
      const { error: insertError } = await supabase
        .from("interested_users")
        .insert({ email: email.toLowerCase().trim() });

      if (insertError) {
        console.error("Error inserting user:", insertError);
        throw new Error("Failed to register interest");
      }
    }

    // Generate unsubscribe token
    const unsubscribeToken = await generateUnsubscribeToken(email.toLowerCase().trim(), unsubscribeSecret);
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?email=${encodeURIComponent(email.toLowerCase().trim())}&token=${unsubscribeToken}`;

    // Send confirmation email
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "Scamly <noreply@scamly.io>",
      to: [email],
      subject: "Thanks for your interest in Scamly!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png" alt="Scamly" style="height: 40px; margin-bottom: 20px;" />
            <h1 style="color: #1a1a1a; margin-bottom: 10px;">Thank You! 🎉</h1>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for registering your interest in <strong>Scamly</strong>!
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We're working hard to bring you the best scam detection and protection tools. You'll be among the first to know when we launch.
          </p>
          
          <p style="font-size: 16px; margin-bottom: 30px;">
            We promise to only send you updates related to the release of Scamly – no spam, ever.
          </p>
          
          <p style="font-size: 16px; margin-bottom: 10px;">
            Stay safe,<br>
            <strong>The Scamly Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            If you didn't sign up for this, you can safely ignore this email or 
            <a href="${unsubscribeUrl}" style="color: #888;">unsubscribe here</a>.
          </p>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send confirmation email");
    }

    console.log("Successfully registered interest and sent email to:", email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in register-interest function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
