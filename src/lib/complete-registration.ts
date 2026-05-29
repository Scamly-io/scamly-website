import type { SignupReason } from "../constants/signup-reasons";
import { supabase } from "../integrations/supabase/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Meta app_data.extinfo — 16 slots; [0] version and [4] os version required. */
export type CompleteRegistrationExtinfo = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

/** Sent when action_source is "app". Website requests must omit this. */
export interface CompleteRegistrationAppData {
  advertiser_tracking_enabled: boolean | 0 | 1 | "true" | "false" | "True" | "False";
  application_tracking_enabled: boolean | 0 | 1 | "true" | "false" | "True" | "False";
  campaign_ids?: string | null;
  extinfo: CompleteRegistrationExtinfo;
}

export interface CompleteRegistrationPayload {
  first_name: string;
  country: string;
  /** Canonical format: yyyy-mm-dd */
  dob?: string;
  gender?: string;
  referral_source?: string;
  /** Stored on profile only; not sent to Meta. */
  signup_reason?: SignupReason;
  ip_address?: string;
  user_agent?: string;
  fbp?: string;
  fbc?: string;
  action_source?: "website" | "app";
  app_data?: CompleteRegistrationAppData;
}

export interface CompleteRegistrationResult {
  success: boolean;
  event_id?: string;
  error?: string | null;
}

export async function completeRegistration(
  payload: CompleteRegistrationPayload,
): Promise<CompleteRegistrationResult> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { success: false, error: "Not authenticated" };
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/meta-capi-handler/complete-registration`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        ...payload,
        action_source: payload.action_source ?? "website",
      }),
    },
  );

  const data = (await response.json()) as CompleteRegistrationResult;

  if (!response.ok) {
    return {
      success: false,
      error: data.error ?? `Request failed with status ${response.status}`,
    };
  }

  return data;
}
