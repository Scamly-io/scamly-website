
-- 1. Create processed_revenuecat_events table for idempotency
CREATE TABLE public.processed_revenuecat_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS but no policies (service-role only access)
ALTER TABLE public.processed_revenuecat_events ENABLE ROW LEVEL SECURITY;

-- 2. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_store text,
  ADD COLUMN IF NOT EXISTS subscription_product_id text,
  ADD COLUMN IF NOT EXISTS billing_issue boolean NOT NULL DEFAULT false;

-- 3. Update the profiles UPDATE RLS policy to protect new columns
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  (auth.uid() = id)
  AND (NOT (subscription_status IS DISTINCT FROM (SELECT p.subscription_status FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (subscription_plan IS DISTINCT FROM (SELECT p.subscription_plan FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (subscription_id IS DISTINCT FROM (SELECT p.subscription_id FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (subscription_current_period_end IS DISTINCT FROM (SELECT p.subscription_current_period_end FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (access_expires_at IS DISTINCT FROM (SELECT p.access_expires_at FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (stripe_customer_id IS DISTINCT FROM (SELECT p.stripe_customer_id FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (has_consumed_trial IS DISTINCT FROM (SELECT p.has_consumed_trial FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (has_paid_first_invoice IS DISTINCT FROM (SELECT p.has_paid_first_invoice FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (welcome_email_sent IS DISTINCT FROM (SELECT p.welcome_email_sent FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (referred_user IS DISTINCT FROM (SELECT p.referred_user FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (referral_code_active IS DISTINCT FROM (SELECT p.referral_code_active FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (referral_code_updated_at IS DISTINCT FROM (SELECT p.referral_code_updated_at FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (review_prompted IS DISTINCT FROM (SELECT p.review_prompted FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (created_at IS DISTINCT FROM (SELECT p.created_at FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (subscription_store IS DISTINCT FROM (SELECT p.subscription_store FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (subscription_product_id IS DISTINCT FROM (SELECT p.subscription_product_id FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (billing_issue IS DISTINCT FROM (SELECT p.billing_issue FROM profiles p WHERE p.id = profiles.id)))
);
