// Types for the referral system

export interface ReferralStats {
  referralCode: string | null;
  referralCodeActive: boolean;
  subscriptionStatus: string;
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  pendingDiscountPercent: number;
  wasReferred: {
    codeUsed: string;
    converted: boolean;
  } | null;
}

export interface ValidateReferralResponse {
  valid: boolean;
  error?: string;
  referrerId?: string;
  code?: string;
}

export interface UpdateReferralCodeResponse {
  success: boolean;
  error?: string;
  referralCode?: string;
}
