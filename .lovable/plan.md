
## Scan Image Edge Function Implementation

This plan migrates your existing scan image functionality from the frontend to a Supabase Edge Function, allowing your backend to securely process image scans while keeping sensitive API keys server-side.

---

### Prerequisites: Google GenAI API Key

A new secret needs to be added to Supabase for the Google GenAI API key. I'll prompt you to add this before proceeding with the implementation.

**Secret Name:** `GOOGLE_GENAI_API_KEY`

---

### New Edge Function: `scan-image`

**File:** `supabase/functions/scan-image/index.ts`

This function will:

1. **Accept requests with:**
   - `imageUrl` - The public URL of the image (for GenAI)
   - `imageBlob` - Base64-encoded image data (for S3 upload)
   - `fileName` - Original file name
   - `freeTierScanLimit` - The scan limit for free users

2. **Authentication:**
   - Require a valid JWT token via Authorization header
   - Extract user ID from the authenticated session

3. **Processing Pipeline (preserving your existing logic):**
   - Upload image to S3 via your Lambda function (main + temp buckets)
   - Check user quota based on subscription plan and billing period
   - Call Google GenAI (Gemini 3 Flash Preview) with your exact system prompt and JSON schema
   - Store scan result in the `scans` table

4. **Error Handling (replacing Sentry/PostHog with detailed responses):**
   - Return structured error responses with:
     - `error`: Human-readable error message
     - `stage`: `'upload' | 'processing' | 'quota_exceeded'`
     - `details`: Additional context for frontend logging
   - Use appropriate HTTP status codes:
     - `400` for validation errors
     - `401` for authentication errors
     - `403` for quota exceeded
     - `500` for processing errors
     - `502` for external service errors (S3, GenAI)

---

### Error Response Structure

```typescript
// Success (200)
{
  success: true,
  data: {
    is_scam: boolean,
    risk_level: "low" | "medium" | "high",
    confidence: number,
    detections: Array<{ category, description, severity }>,
    scan_successful: boolean,
    scan_failure_reason: string | null
  }
}

// Error (4xx/5xx)
{
  success: false,
  error: {
    message: "Human-readable error message",
    stage: "upload" | "processing" | "quota_exceeded",
    code: "ERROR_CODE",
    details: { /* additional context for logging */ }
  }
}
```

---

### Configuration Updates

**File:** `supabase/config.toml`

Add the new function configuration:
```toml
[functions.scan-image]
verify_jwt = false
```

(JWT verification is disabled in config but handled in code for better error messages)

---

### Key Technical Details

| Aspect | Implementation |
|--------|---------------|
| **Google GenAI SDK** | Use `npm:@google/genai` in Deno |
| **Image Upload** | Use your existing Lambda endpoint at `https://0i3wpw1lxk.execute-api.ap-southeast-2.amazonaws.com/dev/upload` |
| **Model** | `gemini-3-flash-preview` (as specified in your code) |
| **System Prompt** | Exact copy from your original file |
| **JSON Schema** | Exact copy from your original file |
| **Billing Period Logic** | `getUserBillingPeriod()` function preserved exactly |
| **Quota Check** | Free users checked against their billing period |

---

### What Gets Preserved

- ✅ Your exact system prompt for scam detection
- ✅ Your JSON schema for structured output
- ✅ S3 upload to both main and temp buckets
- ✅ User billing period calculation logic
- ✅ Free tier quota checking
- ✅ Scan result storage in database
- ✅ All error stages (`upload`, `processing`, `quota_exceeded`)

---

### What Changes

| Original (Frontend) | New (Edge Function) |
|---------------------|---------------------|
| Sentry error capture | Returns error details in response |
| PostHog analytics | Returns event info for frontend to track |
| Direct API key usage | Uses Supabase secret |
| Local image blob | Base64-encoded in request |

---

### Frontend Integration

After deployment, call the function like this:

```typescript
const { data, error } = await supabase.functions.invoke('scan-image', {
  body: {
    imageUrl: 'https://...',
    imageBlob: base64EncodedImage,
    fileName: 'screenshot.jpg',
    freeTierScanLimit: 5
  }
});

if (error || !data.success) {
  // Log to Sentry/PostHog on frontend
  captureError(data.error);
  trackScanFailed(data.error.code, data.error.stage);
}
```

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/scan-image/index.ts` | **Create** - Main edge function |
| `supabase/config.toml` | **Modify** - Add function config |

---

### Next Steps After Approval

1. I'll prompt you to add the `GOOGLE_GENAI_API_KEY` secret
2. Create the edge function with your exact scanning logic
3. Update the config.toml
4. The function will be automatically deployed
