import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

async function generateUnsubscribeToken(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hexArray = hexEncode(hashArray);
  return new TextDecoder().decode(hexArray);
}

function htmlResponse(title: string, message: string, success: boolean): Response {
  const bgColor = success ? "#10b981" : "#ef4444";
  const icon = success ? "✓" : "✕";
  
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Scamly</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 500px;
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 40px;
          color: white;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 16px;
          font-weight: 600;
        }
        p {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
        }
        .footer {
          margin-top: 40px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <p class="footer">© Scamly</p>
      </div>
    </body>
    </html>`,
    {
      status: success ? 200 : 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email || !token) {
      return htmlResponse(
        "Invalid Request",
        "The unsubscribe link is invalid or incomplete. Please try clicking the link from your email again.",
        false
      );
    }

    const unsubscribeSecret = Deno.env.get("UNSUBSCRIBE_SECRET");
    if (!unsubscribeSecret) {
      console.error("UNSUBSCRIBE_SECRET is not configured");
      return htmlResponse(
        "Server Error",
        "An unexpected error occurred. Please try again later or contact support.",
        false
      );
    }

    // Validate the token
    const expectedToken = await generateUnsubscribeToken(email.toLowerCase().trim(), unsubscribeSecret);
    if (token !== expectedToken) {
      console.error("Invalid unsubscribe token for email:", email);
      return htmlResponse(
        "Invalid Token",
        "The unsubscribe link is invalid or has expired. Please contact support if you need assistance.",
        false
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase environment variables are not configured");
      return htmlResponse(
        "Server Error",
        "An unexpected error occurred. Please try again later or contact support.",
        false
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the user's unsubscribed status
    const { error: updateError } = await supabase
      .from("interested_users")
      .update({ 
        unsubscribed: true, 
        unsubscribed_at: new Date().toISOString() 
      })
      .eq("email", email.toLowerCase().trim());

    if (updateError) {
      console.error("Error updating unsubscribe status:", updateError);
      return htmlResponse(
        "Error",
        "We couldn't process your unsubscribe request. Please try again or contact support.",
        false
      );
    }

    console.log("Successfully unsubscribed:", email);

    return htmlResponse(
      "Unsubscribed Successfully",
      "You have been successfully unsubscribed from Scamly updates. You will no longer receive any emails from us.",
      true
    );
  } catch (error: unknown) {
    console.error("Error in unsubscribe function:", error);
    return htmlResponse(
      "Error",
      "An unexpected error occurred. Please try again later or contact support.",
      false
    );
  }
};

serve(handler);
