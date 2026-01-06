// Types for the referral system
// Simplified model: 1 referral per billing period, flat 10% discount for both parties

export interface ReferralStats {
  referralCode: string | null;
  referralCodeActive: boolean;
  subscriptionStatus: string;
  subscriptionPlan: string;
  totalReferrals: number;
  convertedReferrals: number;
  // New simplified model fields
  canReferThisPeriod: boolean;
  hasRewardThisPeriod: boolean;
  currentRewardApplied: boolean;
  // Legacy fields (kept for backward compat)
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
