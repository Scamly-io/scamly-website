import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const BASE_URL = "https://scamly.io";

async function generateUnsubscribeToken(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hexArray = hexEncode(hashArray);
  return new TextDecoder().decode(hexArray);
}

function redirectResponse(status: 'success' | 'error', reason?: string): Response {
  let redirectUrl = `${BASE_URL}/email-unsubscribed?status=${status}`;
  if (reason) {
    redirectUrl += `&reason=${reason}`;
  }
  
  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
    },
  });
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email || !token) {
      return redirectResponse('error', 'invalid-link');
    }

    const unsubscribeSecret = Deno.env.get("UNSUBSCRIBE_SECRET");
    if (!unsubscribeSecret) {
      console.error("UNSUBSCRIBE_SECRET is not configured");
      return redirectResponse('error', 'server-error');
    }

    // Validate the token
    const expectedToken = await generateUnsubscribeToken(email.toLowerCase().trim(), unsubscribeSecret);
    if (token !== expectedToken) {
      console.error("Invalid unsubscribe token for email:", email);
      return redirectResponse('error', 'invalid-token');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase environment variables are not configured");
      return redirectResponse('error', 'server-error');
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
      return redirectResponse('error', 'server-error');
    }

    console.log("Successfully unsubscribed:", email);

    return redirectResponse('success');
  } catch (error: unknown) {
    console.error("Error in unsubscribe function:", error);
    return redirectResponse('error', 'server-error');
  }
};

serve(handler);
