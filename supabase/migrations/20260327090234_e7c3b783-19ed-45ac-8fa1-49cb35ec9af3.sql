DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  (auth.uid() = id)
  AND (NOT (is_admin IS DISTINCT FROM (SELECT p.is_admin FROM profiles p WHERE p.id = profiles.id)))
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