// Types for your profiles table
export interface Profile {
  id: string;
  first_name: string | null;
  dob: string | null;
  gender: string | null;
  country: string | null;
  stripe_customer_id: string | null;
  subscription_status: 'free' | 'pending' | 'active' | 'past_due' | 'cancelled' | 'trialing';
  subscription_id: string | null;
  subscription_plan: 'free' | 'premium-monthly' | 'premium-yearly';
  subscription_current_period_end: string | null;
  access_expires_at: string | null;
  created_at: string;
}

export type SubscriptionStatus = Profile['subscription_status'];
export type SubscriptionPlan = Profile['subscription_plan'];
