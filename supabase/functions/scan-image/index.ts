import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI, createPartFromUri } from "https://esm.sh/@google/genai@0.14.0";

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

// Error response helper
function errorResponse(
  message: string,
  stage: "upload" | "processing" | "quota_exceeded" | "validation" | "auth",
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

const systemPrompt = `
  You are an AI scam detection tool. Your role is to analyze screenshots of text messages, emails, social media posts, advertisements, or other online media to determine if they are scams. Generate an output according to the provided schema.

  Your output must reflect careful reasoning and cautious judgment, as users may trust your assessment. You should analyze tone, urgency, language patterns, sender identity, formatting, links, and overall message structure to decide if the content is fraudulent, suspicious, or safe.

  Rules:
  1. Purpose: Identify potential scams and assess their likelihood and risk level based on scam indicators such as requests for money, urgency, impersonation, links, or poor grammar.
  2. Confidence: Provide a confidence score representing how certain you are in your judgment (in whole numbers 0 to 99). It must never be 100%. Base this on the strength of your evidence and clarity of the scam indicators, not randomness.
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
    - Include a "category" (e.g., Grammar, Tone, Sender, Link, Offer, Format, Credibility),
      a short descriptive "description" explaining what was noticed,
      and a "severity" of "low", "medium", or "high" showing how you believe it contributes to the legitmacy. Low risk detections are things that positively influence the legitimacy, and vice versa.
    - Example:
      { "category": "Urgency", "description": "Message pressures user to act immediately or lose access", "severity": "high" }
  6. Caution: When uncertain, lean toward treating the content as a potential scam, but explain your reasoning clearly through detections and confidence level.
  7. Success: If you are unable to properly assess the content (for example, due to poor image quality, unreadable text, or missing information), set "scan_successful" to false and include a short, user-readable explanation in "scan_failure_reason". If the scan is successful, set "scan_successful" to true and "scan_failure_reason" to null.
  8. Relevance: If a user provides an image that is not related to any form of online media communication (a selfie, a picture of a dog, explicit images). Set "scan_successful" to false and set "scan_failure_reason" to "You have provided an image that is not related to detecting a scam." 

  Output only valid data according to the provided schema. Do not include extra commentary, reasoning steps, or text outside the structured result.
`;

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
      "maximum": 99,
      "description": "Confidence score (never 100) reflecting how certain the detection is."
    },
    "detections": {
      "type": "array",
      "minItems": 2,
      "maxItems": 6,
      "items": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string",
            "description": "Category of the finding (e.g., grammar, link, tone, sender, urgency)."
          },
          "description": {
            "type": "string",
            "description": "Short explanation of what was detected."
          },
          "severity": {
            "type": "string",
            "enum": ["low", "medium", "high"],
            "description": "Severity of the detection based on its influence on the scam likelihood."
          }
        },
        "required": ["category", "description", "severity"],
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const googleApiKey = Deno.env.get("GOOGLE_GENAI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return errorResponse(
        "Server configuration error",
        "processing",
        "MISSING_SUPABASE_CONFIG",
        { missing: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(k => !Deno.env.get(k)) },
        500
      );
    }

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

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "Authentication required",
        "auth",
        "NO_AUTH_HEADER",
        {},
        401
      );
    }

    // Create Supabase clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return errorResponse(
        "Invalid or expired authentication token",
        "auth",
        "INVALID_TOKEN",
        { error: userError?.message },
        401
      );
    }

    // Parse request body
    const body = await req.json();
    const { imageUrl, imageBlob, fileName, freeTierScanLimit = 6 } = body;

    if (!imageUrl || !imageBlob || !fileName) {
      return errorResponse(
        "Missing required fields: imageUrl, imageBlob, and fileName are required",
        "validation",
        "MISSING_FIELDS",
        { provided: { imageUrl: !!imageUrl, imageBlob: !!imageBlob, fileName: !!fileName } },
        400
      );
    }

    console.log(`Processing scan for user ${user.id}, file: ${fileName}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
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
      
      const { count: scanCount, error: countError } = await supabaseAdmin
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

      if (scanCount !== null && scanCount >= freeTierScanLimit) {
        console.log(`Quota exceeded for user ${user.id}: ${scanCount}/${freeTierScanLimit}`);
        return errorResponse(
          "Free tier scan limit reached",
          "quota_exceeded",
          "QUOTA_EXCEEDED",
          { 
            currentCount: scanCount, 
            limit: freeTierScanLimit,
            billingPeriod: {
              start: billingPeriod.periodStart.toISOString(),
              end: billingPeriod.nextPeriodStart.toISOString()
            }
          },
          403
        );
      }
    }

    let mainUploadUrl = "";
    let tempUploadUrl = "";

    const response = await fetch(
      "https://0i3wpw1lxk.execute-api.ap-southeast-2.amazonaws.com/dev/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return errorResponse(
        "Failed to fetch the upload URLs",
        "upload",
        "S3_UPLOAD_URL_FETCH_FAILED",
        { status: response.status, response: errorText },
        502
      )
    }

    const data = await response.json();
    mainUploadUrl = data.mainUploadUrl;
    tempUploadUrl = data.tempUploadUrl;

    const [uploadMainResponse, uploadTempResponse] = await Promise.all([
      fetch(mainUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: imageBlob,
      }),
      fetch(tempUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: imageBlob,
      }),
    ]);

    if (!uploadMainResponse.ok) {
      const errorText = await uploadMainResponse.text();
      return errorResponse(
        "Failed to upload image to storage",
        "upload",
        "S3_MAIN_UPLOAD_FAILED",
        { status: uploadMainResponse.status, response: errorText },
        502
      );
    }

    if (!uploadTempResponse.ok) {
      const errorText = await uploadTempResponse.text();
      return errorResponse(
        "Failed to upload image to temporary storage",
        "upload",
        "S3_TEMP_UPLOAD_FAILED",
        { status: uploadTempResponse.status, response: errorText },
        502
      );
    }

    // Call Google GenAI
    const genai = new GoogleGenAI({ apiKey: googleApiKey });

    let scanResult: ScanResult;

    try {
      const response = await genai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          createPartFromUri(imageUrl, "image/jpeg"),
          "Scan this screenshot for scams according to the system instructions, return the result in JSON format accoridng to the provided Schema."
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseJsonSchema: JSONSchema,
        }
      });

      if (!response ||!response.text) {
        throw new Error("Empty response from GenAI");
      }

      scanResult = JSON.parse(response.text) as ScanResult;
    } catch (genaiError) {
      console.error("GenAI error:", genaiError);
      return errorResponse(
        "Failed to analyze image with AI",
        "processing",
        "GENAI_ERROR",
        { error: genaiError instanceof Error ? genaiError.message : "Unknown error" },
        502
      );
    }

    // Store scan result in database
    const { error: insertError } = await supabaseAdmin.from("scans").insert({
      user_id: user.id,
      output: JSON.stringify(scanResult),
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Failed to store scan result:", insertError);
      // Don't fail the request, just log - user still got their result
      console.warn("Continuing despite database insert error");
    }

    console.log(`Scan completed successfully for user ${user.id}`);
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
