// Types for your profiles table
export interface Profile {
  id: string;
  first_name: string | null;
  dob: string | null;
  gender: string | null;
  country: string | null;
  subscription_status: 'free' | 'pending' | 'active' | 'past_due' | 'cancelled' | 'trialing';
  subscription_id: string | null;
  subscription_plan: 'free' | 'premium-monthly' | 'premium-yearly';
  subscription_current_period_end: string | null;
  subscription_product_id: string | null;
  subscription_store: string | null;
  access_expires_at: string | null;
  billing_issue: boolean;
  welcome_email_sent: boolean;
  created_at: string;
  referral_source: string | null;
  onboarding_completed: boolean | null;
  data_sharing_consent: boolean;
  review_prompted: boolean | null;
  fbp: string | null;
  fbq: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export type SubscriptionStatus = Profile['subscription_status'];
export type SubscriptionPlan = Profile['subscription_plan'];
