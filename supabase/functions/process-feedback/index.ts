import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
};

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify the user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { feedback } = await req.json();
    if (!feedback || typeof feedback !== "string" || feedback.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Feedback content is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (feedback.trim().length > 5000) {
      return new Response(
        JSON.stringify({ error: "Feedback must be under 5000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit: 4 submissions per day per user
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("user_feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneDayAgo);

    if (countError) {
      console.error("Rate limit check error:", countError);
      return new Response(
        JSON.stringify({ error: "Something went wrong. Please try again later." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((count ?? 0) >= 4) {
      return new Response(
        JSON.stringify({ error: "You've reached the feedback limit for today. Please try again tomorrow." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Content hash for duplicate detection per user
    const contentHash = await sha256(feedback);

    const { data: existing } = await supabaseAdmin
      .from("user_feedback")
      .select("id")
      .eq("user_id", user.id)
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "You've already submitted this feedback." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert feedback
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("user_feedback")
      .insert({
        user_id: user.id,
        content: feedback.trim(),
        content_hash: contentHash,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save feedback. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile for email context
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, country")
      .eq("id", user.id)
      .single();

    // Send email via Resend
    if (resendApiKey) {
      try {
        const feedbackTime = new Date(inserted.created_at).toLocaleString("en-AU", {
          timeZone: "Australia/Sydney",
          dateStyle: "full",
          timeStyle: "short",
        });

        const emailHtml = `
          <h2>New User Feedback</h2>
          <table style="border-collapse:collapse;width:100%;max-width:600px;">
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Feedback ID</td><td style="padding:8px;border-bottom:1px solid #eee;">${inserted.id}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">User Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${user.email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">First Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${profile?.first_name || "N/A"}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Country</td><td style="padding:8px;border-bottom:1px solid #eee;">${profile?.country || "N/A"}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Time of Feedback</td><td style="padding:8px;border-bottom:1px solid #eee;">${feedbackTime}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Feedback</td><td style="padding:8px;white-space:pre-wrap;">${feedback.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>
          </table>
        `;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Scamly <noreply@notifications.scamly.io>",
            to: ["feedback@scamly.io"],
            subject: "[AUTO-FEEDBACK] A USER SUBMITTED NEW FEEDBACK",
            html: emailHtml,
          }),
        });

        if (!res.ok) {
          console.error("Resend error:", await res.text());
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
