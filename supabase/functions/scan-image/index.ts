/**
 * Thie is the API endpoint for scanning images within the Scamly app.
 * 
 * The API can be called from https://rdrumcjwntyfnjhownbd.supabase.co/functions/v1/scan-image
 * It expects a POST request with a bearer token in the Authorization header and a base64
 * encoded image in the body.
 * 
 * The scan is currently performed using OpenAI's GPT-5 mini model. There are plans to 
 * change this to Google GenAI using Gemini 3 flash, however Google currently has reliability
 * issues with the API and therefore it will be changed in a future update.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// import { GoogleGenAI } from "https://esm.sh/@google/genai";
import OpenAI from "https://esm.sh/openai";
import { Redis } from "https://esm.sh/@upstash/redis";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@latest";

const FUNCTION_NAME = "scan-image";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ScanResult = {
  is_scam: boolean;
  risk_level: "low" | "medium" | "high";
  confidence: number;
  detections: {
    category: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  scan_successful: boolean;
  scan_failure_reason: string | null;
};

// 6 monthly scans for free users
const FREE_TIER_SCAN_LIMIT = 6;

// Error response helper
function errorResponse(
  message: string,
  stage: "upload" | "processing" | "quota_exceeded" | "validation" | "auth" | "rate_limit",
  code: string,
  details: Record<string, unknown> = {},
  status: number = 500
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, stage, code, details },
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Success response helper
function successResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: true, data }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Get user billing period (preserved from original logic)
function getUserBillingPeriod(createdAt: string): { periodStart: Date; nextPeriodStart: Date } {
  const created = new Date(createdAt);
  const now = new Date();

  // Build period start in UTC
  let periodStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    created.getUTCMonth(),
    created.getUTCDate(),
    0, 0, 0, 0
  ));

  // Go back one month if the user has not reached the anniversary yet.
  if (periodStart > now) {
    periodStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      created.getUTCMonth() - 1,
      created.getUTCDate(),
      0, 0, 0, 0
    ));
  }

  const nextPeriodStart = new Date(Date.UTC(
    periodStart.getUTCFullYear(),
    periodStart.getUTCMonth() + 1,
    periodStart.getUTCDate(),
    0, 0, 0, 0
  ));

  return { periodStart, nextPeriodStart };
}

/**
 * Log a generic console message
 * @param step
 * @param details
 */
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

/**
 * Log a console warning
 * @param message
 * @param details
 */
const logWarn = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.warn(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

/**
 * Log a console error
 * @param message
 * @param details
 */
const logError = (message: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.error(`[${FUNCTION_NAME.toUpperCase()}] ${message}${detailsStr}`);
};

// NEW SYSTEM PROMPT, WILL IMPLEMENT ON RELEASE
const systemPrompt = `
  Your task is to analyze screenshots of text messages, emails, social media posts, advertisements, or other online media to determine if they are scams. Generate an output according to the provided schema.

  You should analyze tone, urgency, language patterns, sender identity, formatting, links, and overall message structure to decide if the content is fraudulent, suspicious, or safe.

  Rules:
  1. Purpose: Identify potential scams and assess their likelihood and risk level based on scam indicators such as requests for money, urgency, impersonation, links, or poor grammar.
  2. Confidence: Provide a confidence score representing how certain you are in your judgment (in whole numbers 0 to 100). Base this on the strength of your evidence and clarity of the scam indicators, not randomness. Note that it is important users feel you are confident. A low confidence score shows you are unsure, which makes the user unsure.
  3. Risk level:
    - "low" → content appears legitimate or no strong scam indicators.
    - "medium" → some suspicious traits or uncertain legitimacy.
    - "high" → clear or multiple strong scam indicators.
  4. isScam:
    - true for "medium" or "high" risk.
    - false for "low" risk.
    - never false for "high" risk.
  5. Detections (3–6 items):
    - Each detection highlights a specific clue or pattern that supports your assessment.
    - Include a "description" thats a few words explaining what was noticed (e.g, "Suspicious contact number", "Urgent request for money", "Unusual link")
    - Include "details" that provides more context and explanation of the detection. This must be in easy to understand language, not overly technical.
    - Include a "severity" of "low", "medium", or "high" showing how you believe it contributes to the legitmacy. Low risk detections are things that positively influence the legitimacy, and vice versa.
    - Example:
      { "description": "Suspicious contact number", "details": "The phone number (+123 456 7890) appears to be from a different country to the content, and is not a legitimate contact number for the company.", "severity": "high" }
  6. Caution: When uncertain, lean toward treating the content as a potential scam, but explain your reasoning clearly through detections and confidence level.
  7. Success: If you are unable to properly assess the content (for example, due to poor image quality, unreadable text, or missing information), set "scan_successful" to false and include a short, user-readable explanation in "scan_failure_reason". If the scan is successful, set "scan_successful" to true and "scan_failure_reason" to null.
  8. Relevance: If a user provides an image that is not related to any form of online media communication (a selfie, a picture of a dog, explicit images of any form). Set "scan_successful" to false and set "scan_failure_reason" to "You have provided an image that is not related to detecting a scam." In this case also set the other data points to "error" 

  Guide and tips when analysing the image:
  1. When analysing grammar, focus on the overall structure of the message, not just individual words. Scammers may use correct grammar in a sentence but the sentence structure doesn't make sense.
  2. If a link is present, the domain is the most useful way to tell if it is a scam. Even if a message has a real link inside though, its important to know that scammers may put this in to distract from the actual scam (such as calling the phone number).
  3. Message history in a text message screenshot is an indicator of legitimacy, however it is not concrete. It should be considered, but when returning the description note to the user that scammers can spoof messages to apper inside legitimate conversations.
  4. When analysing a phone number, aim to match the relevacy of the content to the provided number. For example, if a user uploads a screenshot of an email/text from an australian organisation, and a phone number for a different country is provided, this can be considered a scam.
  5. When analysing a phone number, determine if the number is from the impersonated body using a web search. This may not always return a clear result, so if none can be found this can be considered a medium risk detection if the phone number matches country of the impersonated body, and a high risk if it does not.
  6. When analysing social media posts, aim to analyse the content of the post, as well as the user profile if provided in the screenshot. Be cautious of being confused between spoofed profile names and actual profile "@"s though. A scammer may set their name to a legitimate entity, but their @ is incorrect.
  7. When analysing emails, a similar guide applies to point 6. Ensure that the email address matches the sender via a valid domain but also analyse the content for what the user is being asked to do.
  8. Not every text message where a user is asked to click on a link, provide a code, or take a certain action is a scam. Some organisations will have legitimate reasons for asking users to do this. Therefore, its important to take a multifaceted approach to analysing the content.
  9. Message content is important when classifying a scam, but not as important as the sender, links, phonne numbers, email addresses, profile details, etc. Content may be identical to a real message but if it includes a false phone number, this is a scam.
  10. Consider psychological manipulation tactics, such as a demand for action within a timeframe, or threats of account closure or other negative consequences for non compliance. Also consider too good to be true offers, such as cheap prices for normally expensive items, or abnormal rates of returns on volatile or unpredictable investments.
  11. Note that real companies may have some form of urgency within a legitimate communication. For example, a notice from a bank to verify a payment. Banks do send these out, so its important to consider other factors of the message to determine the legitimacy.
  12. When analysing text messages, consider the platform the message is from. For example, if a message appears to be from whatsapp but is claiming to be a large company, this is likely a scam. It may not always be easy to tell the platform of the message, so don't rely on this. However if you can tell you should consider it in your assessment.
  13. No single factor should override others (a legitimate website domain does not excuse a fake phone number or suspicious urgency).
  14. Weight factors appropriately: Contact details/links (highest), urgency/content/message history (medium), grammar/platform (low).
  15. Consider whether the request in the screenshot matches standard process (banks will never ask someone for login details as an example).
  16. Do not use factors such as a recipients name to determine the legitimacy of the message. For example, a european sounding name receiving a message from a chinese bank is not something that can be considered in the assessment.

  It is possible that a user may provide an image that is in another language. This can still be analysed, but the response MUST be returned in english.

  It is not necessary to do a web search for every detection. This should only be used to confirm things such as links or phone number if you aren't already sure that it is legitimate or not.

  Output only valid data according to the provided schema. Do not include extra commentary, reasoning steps, or text outside the structured result.
`;

// This defines the JSON schema that the model will return. Do not adjust this.
const JSONSchema = {
  "type": "object",
  "properties": {
    "is_scam": {
      "type": "boolean",
      "description": "Whether the content is determined to be a scam or not."
    },
    "risk_level": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "description": "The assessed risk level based on the likelihood of a scam."
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Confidence score reflecting how certain the detection is."
    },
    "detections": {
      "type": "array",
      "minItems": 2,
      "maxItems": 6,
      "items": {
        "type": "object",
        "properties": {
          "description": {
            "type": "string",
            "description": "Description of each detection (e.g., Suspicious contact number, Urgent request for money, Unusual link)."
          },
          "details": {
            "type": "string",
            "description": "Short explanation of each detection. Must be in easy to understand language."
          },
          "severity": {
            "type": "string",
            "enum": ["low", "medium", "high"],
            "description": "Severity of the detection based on its influence on the scam likelihood."
          }
        },
        "required": ["description", "details", "severity"],
        "additionalProperties": false
      }
    },
    "scan_successful": {
      "type": "boolean",
      "description": "True if the scan was performed successfully; false if not enough information was available."
    },
    "scan_failure_reason": {
      "type": ["string", "null"],
      "description": "If scan_successful is false, provide a short reason; otherwise null."
    }
  },
  "required": [
    "is_scam",
    "risk_level",
    "confidence",
    "detections",
    "scan_successful",
    "scan_failure_reason"
  ],
  "additionalProperties": false
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get required environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_SCAN_API_KEY");
    // const googleApiKey = Deno.env.get("GOOGLE_GENAI_API_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      logError("Missing Supabase configuration");
      return errorResponse(
        "Server configuration error",
        "processing",
        "MISSING_SUPABASE_CONFIG",
        {},
        500
      );
    }

    /*
    if (!googleApiKey) {
      console.error("Missing Google GenAI API key");
      return errorResponse(
        "Server configuration error",
        "processing",
        "MISSING_GENAI_KEY",
        {},
        500
      );
    }
    */

    if (!openaiApiKey) {
      logError("Missing OpenAI API key");
      return errorResponse(
        "Server configuration error",
        "processing",
        "MISSING_OPENAI_KEY",
        {},
        500
      );
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "Authentication required",
        "auth",
        "AUTH_REQUIRED",
        {},
        401
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });


    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(
        "Authentication failed",
        "auth",
        "AUTH_FAILED",
        {},
        401
      );
    }

    const redis = new Redis({
      url: Deno.env.get("REDIS_URL")!,
      token: Deno.env.get("REDIS_TOKEN")!,
    })

    const rateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
    })

    const identifier = `${user.id}-(scan-image)`;
    const { success } = await rateLimit.limit(identifier);
    if (!success) {
      logWarn("Rate limit exceeded", { identifier });
      return errorResponse(
        "Rate limit exceeded",
        "rate_limit",
        "RATE_LIMIT_EXCEEDED",
        { identifier },
        429
      );
    }

    // Parse request body
    const body = await req.json();
    const { imageB64 } = body;

    if (!imageB64) {
      return errorResponse(
        "Missing required fields: imageB64 is required",
        "validation",
        "MISSING_FIELDS",
        { provided: { imageB64: !!imageB64 } },
        400
      );
    }

    console.log(`Processing scan for user ${user.id}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return errorResponse(
        "Failed to fetch user profile",
        "processing",
        "PROFILE_FETCH_ERROR",
        { error: profileError?.message },
        500
      );
    }

    // Check quota for free users
    const isPremium = profile.subscription_status === "active" || profile.subscription_status === "trialing";
    
    if (!isPremium) {
      const billingPeriod = getUserBillingPeriod(profile.created_at);
      
      const { count: scanCount, error: countError } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", billingPeriod.periodStart.toISOString())
        .lt("created_at", billingPeriod.nextPeriodStart.toISOString());

      if (countError) {
        console.error("Scan count error:", countError);
        return errorResponse(
          "Failed to check scan quota",
          "processing",
          "QUOTA_CHECK_ERROR",
          { error: countError.message },
          500
        );
      }

      if (scanCount !== null && scanCount >= FREE_TIER_SCAN_LIMIT) {
        console.error(`Quota exceeded for user ${user.id}: ${scanCount}/${FREE_TIER_SCAN_LIMIT}`);
        return errorResponse(
          "Free tier scan limit reached",
          "quota_exceeded",
          "QUOTA_EXCEEDED",
          { 
            currentCount: scanCount, 
            limit: FREE_TIER_SCAN_LIMIT,
            billingPeriod: {
              periodStart: billingPeriod.periodStart.toISOString(),
              nextPeriodStart: billingPeriod.nextPeriodStart.toISOString()
            }
          },
          403
        );
      }
    }

    // const genai = new GoogleGenAI({ apiKey: googleApiKey });
    const openai = new OpenAI({ apiKey: openaiApiKey });

    let scanResult: ScanResult;
    let inputTokens: number;
    let outputTokens: number;
    let openaiResponseId: string;

    try {
      // Google GenAI response
      /*
      const response = await genai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageB64,
            },
          },
          { text: "Scan this screenshot for scams according to the system instructions, return the result in JSON format accoridng to the provided Schema."}
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseJsonSchema: JSONSchema,
        }
      });
      */

      // Calculate time to scan
      const startTime = Date.now();

      // OpenAI response
      const response = await openai.responses.create({
        model: "gpt-5-mini",
        tools: [{ type: "web_search"}],
        reasoning: { effort: "low" },
        instructions: systemPrompt,
        input: [
          { role: "user",
            content: [
              {
                type: "input_image",
                image_url: `data:image/jpeg;base64,${imageB64}`,
                detail: "auto"
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "ScanResults",
            schema: JSONSchema,
            strict: true,
          }
        }
      })

      // Calculate time to scan
      const endTime = Date.now();
      const scanTime = endTime - startTime;
      console.log(`Scan completed in ${scanTime}ms`);

      if (!response ||!response.output_text) {
        throw new Error("Empty response from OpenAI");
      }

      scanResult = JSON.parse(response.output_text) as ScanResult;
      inputTokens = response.usage?.input_tokens ?? 0;
      outputTokens = response.usage?.output_tokens ?? 0;
      openaiResponseId = response.id;
    } catch (error) {
      console.error("AI error:", error);
      return errorResponse(
        "Failed to analyze image with AI",
        "processing",
        "AI_ERROR",
        { error: error instanceof Error ? error.message : "Unknown error" },
        502
      );
    }

    // Store scan result in database
    const { error: insertError } = await supabase.from("scans").insert({
      user_id: user.id,
      output: JSON.stringify(scanResult),
      created_at: new Date().toISOString(),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      openai_response_id: openaiResponseId,
    });

    if (insertError) {
      console.error("Failed to store scan result:", insertError);
      // Don't fail the request, just log - user still got their result
      console.warn("Continuing despite database insert error");
    }

    return successResponse(scanResult);

  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse(
      "An unexpected error occurred",
      "processing",
      "UNEXPECTED_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
