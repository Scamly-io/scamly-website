import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Error response helper
function errorResponse(
  message: string,
  stage: "subscription_check" | "validation" | "ai_response" | "auth",
  code: string,
  details: Record<string, unknown> = {},
  status = 500
) {
  console.error(`[${code}] ${message}`, details);
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message,
        stage,
        code,
        details,
      },
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Success response helper
function successResponse(data: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      ...data,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Generate the search prompt for a given company name.
 * DO NOT ADJUST - Matches original frontend logic
 */
function getSearchPrompt(companyName: string): string {
  return `
      Search specifically for "${companyName} contact information", "${companyName} phone number", and "${companyName} contact us".

      You MUST prioritise the company's official website and pages with URLs containing:
      - /contact
      - /contact-us
      - /support
      - /help
      - /about

      Do NOT rely on Wikipedia, Crunchbase, or legal/company profile pages for phone numbers.
      Those sources may only be used to confirm the official company name or website domain.

      From the official website, extract the following:
      - Official company name
      - General enquiries phone number
      - International enquiries phone number
      - Official website domain (domain only, no protocol or paths, e.g "apple.com", not "www.apple.com" or "https://apple.com")
      - Contact us page (domain + path only, e.g. "example.com/contact")

      Rules:
      - Only use information found on the company's official website
      - Do not guess, infer, or fabricate phone numbers
      - If a field cannot be found, set it to "0"
      - Return JSON only, matching the provided schema
      - Always include found_all_fields. False if any of "company_name", "local_phone_number", "international_phone_number", or "contact_us_page" is set to "0", otherwise True
      - Always include missing_fields. List of keys if any of "company_name", "local_phone_number", "international_phone_number", or "contact_us_page" are set to "0", otherwise return an empty array`;
}

// Search result schema for Perplexity
const searchResultSchema = {
  type: "json_schema",
  json_schema: {
    schema: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        local_phone_number: { type: "string" },
        international_phone_number: { type: "string" },
        website_domain: { type: "string" },
        contact_us_page: { type: "string" },
        found_all_fields: { type: "boolean" },
        missing_fields: { type: "array", items: { type: "string" } },
      },
      required: [
        "company_name",
        "local_phone_number",
        "international_phone_number",
        "website_domain",
        "contact_us_page",
        "found_all_fields",
        "missing_fields",
      ],
    },
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", "validation", "INVALID_JSON", {}, 400);
    }

    const companyName = body.companyName as string;

    // Validate input
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return errorResponse("Company name is required", "validation", "MISSING_COMPANY_NAME", {}, 400);
    }

    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", "auth", "MISSING_AUTH", {}, 401);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("Server configuration error", "validation", "CONFIG_ERROR", {}, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return errorResponse("Authentication failed", "auth", "AUTH_FAILED", {}, 401);
    }

    const userId = user.id;
    console.log(`[ai-search] User: ${userId}, Company: ${companyName}`);

    // Check subscription - Free users can't use the search feature
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return errorResponse(
          "Error fetching user profile for search",
          "subscription_check",
          "PROFILE_FETCH_ERROR",
          { error: profileError.message },
          500
        );
      }

      if (!profile) {
        return errorResponse(
          "User profile not found",
          "subscription_check",
          "PROFILE_NOT_FOUND",
          {},
          404
        );
      }

      if (profile.subscription_plan === "free") {
        return errorResponse(
          "Free users cannot use the search feature",
          "subscription_check",
          "FREE_USER_BLOCKED",
          { userId },
          403
        );
      }
    } catch (error) {
      console.error("Subscription check error:", error);
      return errorResponse(
        "Error checking subscription",
        "subscription_check",
        "SUBSCRIPTION_CHECK_ERROR",
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }

    // Perform the search
    try {
      const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
      if (!perplexityApiKey) {
        return errorResponse(
          "Server configuration error: Missing Perplexity API key",
          "ai_response",
          "CONFIG_ERROR",
          {},
          500
        );
      }

      const prompt = getSearchPrompt(companyName);

      console.log(`[ai-search] Calling Perplexity API for: ${companyName}`);

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: prompt }],
          response_format: searchResultSchema,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Perplexity API error:", response.status, errorText);
        return errorResponse(
          "Error from Perplexity API",
          "ai_response",
          "PERPLEXITY_API_ERROR",
          { status: response.status, error: errorText },
          502
        );
      }

      const completion = await response.json();
      const messageContent = completion?.choices?.[0]?.message?.content;

      if (!messageContent) {
        return errorResponse(
          "No response from Perplexity",
          "ai_response",
          "EMPTY_RESPONSE",
          {},
          502
        );
      }

      // Remove any thinking content from the response
      const output = messageContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

      // Ensure the output is valid JSON
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(output);
      } catch {
        console.error("Invalid JSON from Perplexity:", output);
        return errorResponse(
          "Invalid JSON response from Perplexity",
          "ai_response",
          "INVALID_JSON_RESPONSE",
          { raw: output.substring(0, 200) },
          502
        );
      }

      console.log(`[ai-search] Search completed for: ${companyName}`);

      return successResponse({
        data: result,
        warning: result.found_all_fields
          ? null
          : "Some information could not be found, missing fields set to 0",
      });
    } catch (error) {
      console.error("Error performing search:", error);
      return errorResponse(
        "Failed to search for company information",
        "ai_response",
        "SEARCH_ERROR",
        { error: error instanceof Error ? error.message : "Unknown error" },
        502
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse(
      "An unexpected error occurred",
      "ai_response",
      "UNEXPECTED_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
