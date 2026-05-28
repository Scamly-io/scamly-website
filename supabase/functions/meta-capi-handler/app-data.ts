/**
 * Meta Conversions API app_data for action_source "app".
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/app-data
 */

export const EXTINFO_FIELD_COUNT = 16;

/** extinfo[0] = version, extinfo[4] = os version (required); others may be "". */
export type MetaExtinfo = [
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

export interface MetaAppDataPayload {
  advertiser_tracking_enabled: 0 | 1;
  application_tracking_enabled: 0 | 1;
  campaign_ids: string | null;
  extinfo: MetaExtinfo;
}

function parseTrackingEnabled(value: unknown): 0 | 1 | undefined {
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return 1;
    if (normalized === "false") return 0;
  }
  return undefined;
}

function parseExtinfo(value: unknown): MetaExtinfo | { error: string } {
  if (!Array.isArray(value)) {
    return { error: "app_data.extinfo must be an array of 16 strings" };
  }

  if (value.length !== EXTINFO_FIELD_COUNT) {
    return {
      error: `app_data.extinfo must contain exactly ${EXTINFO_FIELD_COUNT} values`,
    };
  }

  const extinfo: string[] = [];
  for (let i = 0; i < EXTINFO_FIELD_COUNT; i++) {
    const item = value[i];
    if (item === null || item === undefined) {
      return { error: `app_data.extinfo[${i}] must be a string (use \"\" if unknown)` };
    }
    if (typeof item !== "string" && typeof item !== "number") {
      return { error: `app_data.extinfo[${i}] must be a string or number` };
    }
    extinfo.push(String(item));
  }

  if (!extinfo[0]?.trim()) {
    return { error: "app_data.extinfo[0] (extinfo version) is required" };
  }
  if (!extinfo[4]?.trim()) {
    return { error: "app_data.extinfo[4] (os version) is required" };
  }

  return extinfo as MetaExtinfo;
}

export function parseAppData(
  value: unknown,
): { data: MetaAppDataPayload } | { error: string } {
  if (value === null || value === undefined) {
    return { error: "app_data is required when action_source is app" };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { error: "app_data must be an object" };
  }

  const raw = value as Record<string, unknown>;

  const advertiserTracking = parseTrackingEnabled(raw.advertiser_tracking_enabled);
  if (advertiserTracking === undefined) {
    return { error: "app_data.advertiser_tracking_enabled must be a boolean or 0/1" };
  }

  const applicationTracking = parseTrackingEnabled(raw.application_tracking_enabled);
  if (applicationTracking === undefined) {
    return { error: "app_data.application_tracking_enabled must be a boolean or 0/1" };
  }

  let campaignIds: string | null = null;
  if (raw.campaign_ids !== null && raw.campaign_ids !== undefined) {
    if (typeof raw.campaign_ids !== "string") {
      return { error: "app_data.campaign_ids must be a string or null" };
    }
    const trimmed = raw.campaign_ids.trim();
    campaignIds = trimmed.length > 0 ? trimmed : null;
  }

  const extinfoResult = parseExtinfo(raw.extinfo);
  if ("error" in extinfoResult) {
    return extinfoResult;
  }

  return {
    data: {
      advertiser_tracking_enabled: advertiserTracking,
      application_tracking_enabled: applicationTracking,
      campaign_ids: campaignIds,
      extinfo: extinfoResult,
    },
  };
}
