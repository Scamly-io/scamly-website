import { createClient } from '@supabase/supabase-js';

// These will be populated when you connect your Supabase project
// Go to Project Settings > API to find your URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please connect your Supabase project.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Types for your profiles table
export interface Profile {
  id: string;
  first_name: string | null;
  dob: string | null;
  gender: string | null;
  country: string | null;
  stripe_customer_id: string | null;
  subscription_status: 'free' | 'pending' | 'active' | 'past_due' | 'cancelled';
  subscription_id: string | null;
  subscription_plan: 'free' | 'premium-monthly' | 'premium-yearly';
  subscription_current_period_end: string | null;
  access_expires_at: string | null;
  created_at: string;
}

export type SubscriptionStatus = Profile['subscription_status'];
export type SubscriptionPlan = Profile['subscription_plan'];
