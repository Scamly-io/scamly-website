import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend";

const baseCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, baggage, sentry-trace",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getCorsHeaders(req: Request) {
  const requestedHeaders = req.headers.get("Access-Control-Request-Headers");
  if (!requestedHeaders) return baseCorsHeaders;
  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Headers": requestedHeaders,
  };
}

interface RegisterInterestRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email }: RegisterInterestRequest = await req.json();

    if (!email || !email.trim()) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      });
    }

    const resend = new Resend(resendApiKey);

    // Create contact in Resend
    const { error: contactError } = await resend.contacts.create({
      email: email.trim(),
      unsubscribed: false,
    });

    if (contactError) {
      console.error("Error creating Resend contact:", contactError);
      // Don't throw if contact already exists — still send email
      if (!contactError.message?.includes("already exists")) {
        throw new Error(contactError.message || "Failed to create contact");
      }
    }

    // Send confirmation email using Resend template
    const { error: emailError } = await resend.emails.send({
      to: email.trim(),
      template: {
        id: "register-interest-confirmed",
      },
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send confirmation email");
    }

    console.log("Successfully registered interest for:", email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  } catch (error: unknown) {
    console.error("Error in register-interest function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }
};

serve(handler);
