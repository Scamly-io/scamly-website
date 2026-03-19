
-- Step 1: Drop the existing update policy that references the columns we want to remove
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Step 2: Drop unused profile columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS has_consumed_trial;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS has_paid_first_invoice;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referred_user;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code_active;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code_updated_at;

-- Step 3: Recreate update policy without references to dropped columns
-- Still protects server-managed fields from client-side modification
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
  AND (NOT (welcome_email_sent IS DISTINCT FROM (SELECT p.welcome_email_sent FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (review_prompted IS DISTINCT FROM (SELECT p.review_prompted FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (created_at IS DISTINCT FROM (SELECT p.created_at FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (subscription_store IS DISTINCT FROM (SELECT p.subscription_store FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (subscription_product_id IS DISTINCT FROM (SELECT p.subscription_product_id FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (billing_issue IS DISTINCT FROM (SELECT p.billing_issue FROM profiles p WHERE p.id = profiles.id)))
);

-- Step 4: Drop unused tables
DROP TABLE IF EXISTS public.payment_fingerprints CASCADE;
DROP TABLE IF EXISTS public.processed_stripe_events CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.referral_rewards CASCADE;

-- Step 5: Drop unused database functions
DROP FUNCTION IF EXISTS public.generate_referral_code();
DROP FUNCTION IF EXISTS public.has_used_referral_code(uuid);
DROP FUNCTION IF EXISTS public.is_valid_referral_code_format(text);
DROP FUNCTION IF EXISTS public.get_referral_stats(uuid);
