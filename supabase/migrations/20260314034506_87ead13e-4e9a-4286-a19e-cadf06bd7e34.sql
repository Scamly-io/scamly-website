
-- Drop the existing overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a restricted UPDATE policy that only allows changes to safe columns
-- Sensitive columns (subscription, billing, referral management) must remain unchanged
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Ensure sensitive subscription/billing columns are not modified
  AND subscription_status IS NOT DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = id)
  AND subscription_plan IS NOT DISTINCT FROM (SELECT p.subscription_plan FROM public.profiles p WHERE p.id = id)
  AND subscription_id IS NOT DISTINCT FROM (SELECT p.subscription_id FROM public.profiles p WHERE p.id = id)
  AND subscription_current_period_end IS NOT DISTINCT FROM (SELECT p.subscription_current_period_end FROM public.profiles p WHERE p.id = id)
  AND access_expires_at IS NOT DISTINCT FROM (SELECT p.access_expires_at FROM public.profiles p WHERE p.id = id)
  AND stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = id)
  AND has_consumed_trial IS NOT DISTINCT FROM (SELECT p.has_consumed_trial FROM public.profiles p WHERE p.id = id)
  AND has_paid_first_invoice IS NOT DISTINCT FROM (SELECT p.has_paid_first_invoice FROM public.profiles p WHERE p.id = id)
  AND welcome_email_sent IS NOT DISTINCT FROM (SELECT p.welcome_email_sent FROM public.profiles p WHERE p.id = id)
  AND referred_user IS NOT DISTINCT FROM (SELECT p.referred_user FROM public.profiles p WHERE p.id = id)
  AND referral_code IS NOT DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = id)
  AND referral_code_active IS NOT DISTINCT FROM (SELECT p.referral_code_active FROM public.profiles p WHERE p.id = id)
  AND referral_code_updated_at IS NOT DISTINCT FROM (SELECT p.referral_code_updated_at FROM public.profiles p WHERE p.id = id)
  AND review_prompted IS NOT DISTINCT FROM (SELECT p.review_prompted FROM public.profiles p WHERE p.id = id)
  AND created_at IS NOT DISTINCT FROM (SELECT p.created_at FROM public.profiles p WHERE p.id = id)
);
