import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@0.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
function getUserBillingPeriod(createdAt: string): { start: Date; end: Date } {
  const accountCreatedAt = new Date(createdAt);
  const now = new Date();

  // Get the day of month the account was created (1-31)
  const billingDay = accountCreatedAt.getDate();

  // Start with current month
  let periodStart = new Date(now.getFullYear(), now.getMonth(), billingDay);

  // If we haven't reached the billing day this month yet, go back one month
  if (now < periodStart) {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
  }

  // Period end is one month after start
  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, billingDay);

  return { start: periodStart, end: periodEnd };
}

// System prompt (preserved exactly from original)
const systemPrompt = `You are a scam detection assistant. Analyze the image for scam indicators.

ALWAYS attempt to scan the image - even if content is:
- Blurry, low quality, or partially visible
- In any language (translate and analyze)
- Missing some context
- A screenshot of social media, email, messages, websites, apps
- Containing financial requests, urgent warnings, prizes, or unusual offers

Only set scan_successful: false if:
- The image is completely black/white/empty
- Contains no readable content whatsoever
- Is corrupted or cannot be processed

For ALL other images, set scan_successful: true and provide your best analysis.

Analyze for these scam categories:
- Phishing (fake login pages, credential harvesting)
- Financial scams (fake invoices, payment requests, cryptocurrency)
- Impersonation (fake brands, government agencies, people)
- Romance/relationship scams
- Tech support scams
- Prize/lottery scams
- Investment scams
- Job/employment scams
- Charity scams
- Urgency/fear tactics

Provide detection results even with limited information - users need protection.`;

// JSON schema for structured output (preserved exactly from original)
const scanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    scan_successful: {
      type: Type.BOOLEAN,
      description: "Whether the scan was able to analyze the image content",
    },
    scan_failure_reason: {
      type: Type.STRING,
      nullable: true,
      description: "If scan failed, the reason why",
    },
    is_scam: {
      type: Type.BOOLEAN,
      description: "Whether the image contains scam indicators",
    },
    risk_level: {
      type: Type.STRING,
      enum: ["low", "medium", "high"],
      description: "Overall risk level of the content",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score from 0 to 100",
    },
    detections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: "Category of scam detected",
          },
          description: {
            type: Type.STRING,
            description: "Description of the scam indicator",
          },
          severity: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
            description: "Severity of this particular indicator",
          },
        },
        required: ["category", "description", "severity"],
      },
      description: "List of detected scam indicators",
    },
  },
  required: ["scan_successful", "is_scam", "risk_level", "confidence", "detections"],
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
    const { imageUrl, imageBlob, fileName, freeTierScanLimit = 5 } = body;

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
        .gte("created_at", billingPeriod.start.toISOString())
        .lt("created_at", billingPeriod.end.toISOString());

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
              start: billingPeriod.start.toISOString(),
              end: billingPeriod.end.toISOString()
            }
          },
          403
        );
      }
    }

    // Upload to S3 via Lambda (main bucket)
    console.log("Uploading to S3 main bucket...");
    const mainUploadResponse = await fetch(
      "https://0i3wpw1lxk.execute-api.ap-southeast-2.amazonaws.com/dev/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          image_data: imageBlob,
          file_name: fileName,
        }),
      }
    );

    if (!mainUploadResponse.ok) {
      const errorText = await mainUploadResponse.text();
      console.error("Main S3 upload failed:", errorText);
      return errorResponse(
        "Failed to upload image to storage",
        "upload",
        "S3_MAIN_UPLOAD_FAILED",
        { status: mainUploadResponse.status, response: errorText },
        502
      );
    }

    // Upload to S3 via Lambda (temp bucket)
    console.log("Uploading to S3 temp bucket...");
    const tempUploadResponse = await fetch(
      "https://0i3wpw1lxk.execute-api.ap-southeast-2.amazonaws.com/dev/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          image_data: imageBlob,
          file_name: fileName,
          temp: true,
        }),
      }
    );

    if (!tempUploadResponse.ok) {
      const errorText = await tempUploadResponse.text();
      console.error("Temp S3 upload failed:", errorText);
      return errorResponse(
        "Failed to upload image to temporary storage",
        "upload",
        "S3_TEMP_UPLOAD_FAILED",
        { status: tempUploadResponse.status, response: errorText },
        502
      );
    }

    // Call Google GenAI
    console.log("Calling Google GenAI...");
    const genai = new GoogleGenAI({ apiKey: googleApiKey });

    let scanResult;
    try {
      const response = await genai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: "Analyze this image for scam indicators:" },
              {
                fileData: {
                  fileUri: imageUrl,
                  mimeType: "image/jpeg",
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: scanResponseSchema,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from GenAI");
      }

      scanResult = JSON.parse(responseText);
      console.log("GenAI scan result:", JSON.stringify(scanResult));
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
    console.log("Storing scan result...");
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
