import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate internal secret
  const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET");
  if (!INTERNAL_SECRET) {
    console.error("INTERNAL_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("x-internal-secret");
  if (authHeader !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const RESEND_AUDIENCE_ID = Deno.env.get("RESEND_AUDIENCE_ID");
  if (!RESEND_AUDIENCE_ID) {
    console.error("RESEND_AUDIENCE_ID not configured");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { email, first_name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          first_name: first_name || undefined,
          unsubscribed: false,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error(`Resend API error [${res.status}]:`, JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to create contact", details: data }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Contact created in Resend:", data);
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in resend-contact-sync:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
