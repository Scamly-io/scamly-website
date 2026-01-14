-- =========================================================
-- VERSIONED POLICY ACCEPTANCE SYSTEM
-- =========================================================

-- 1. Create policies table to store versioned policy documents
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('privacy', 'terms')),
  version TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  content_hash TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one version per policy type
  UNIQUE (policy_type, version)
);

-- Add comment for documentation
COMMENT ON TABLE public.policies IS 'Versioned policy documents for Privacy Policy and Terms & Conditions';
COMMENT ON COLUMN public.policies.policy_type IS 'Type of policy: privacy or terms';
COMMENT ON COLUMN public.policies.version IS 'Version identifier (e.g., 2025-01-14)';
COMMENT ON COLUMN public.policies.published_at IS 'When this policy version was published';
COMMENT ON COLUMN public.policies.content_hash IS 'Optional SHA-256 hash of policy content for integrity verification';

-- Enable RLS on policies table
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Everyone can read policies (needed for displaying to users)
CREATE POLICY "Anyone can read policies"
  ON public.policies
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete policies (admin only via backend)
-- No INSERT/UPDATE/DELETE policies for regular users

-- 2. Create policy_acceptances table (append-only audit log)
CREATE TABLE public.policy_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('privacy', 'terms')),
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET NULL,
  user_agent TEXT NULL,
  
  -- Reference to the policy
  policy_id UUID NULL REFERENCES public.policies(id)
);

-- Add comment for documentation
COMMENT ON TABLE public.policy_acceptances IS 'Append-only audit log of user policy acceptances';
COMMENT ON COLUMN public.policy_acceptances.user_id IS 'User who accepted the policy';
COMMENT ON COLUMN public.policy_acceptances.policy_type IS 'Type of policy accepted: privacy or terms';
COMMENT ON COLUMN public.policy_acceptances.policy_version IS 'Exact version of policy that was accepted';
COMMENT ON COLUMN public.policy_acceptances.accepted_at IS 'Timestamp when acceptance occurred';
COMMENT ON COLUMN public.policy_acceptances.ip_address IS 'IP address at time of acceptance (for audit)';
COMMENT ON COLUMN public.policy_acceptances.user_agent IS 'Browser user agent at time of acceptance (for audit)';

-- Create index for efficient lookups
CREATE INDEX idx_policy_acceptances_user_id ON public.policy_acceptances(user_id);
CREATE INDEX idx_policy_acceptances_user_policy ON public.policy_acceptances(user_id, policy_type);

-- Enable RLS on policy_acceptances
ALTER TABLE public.policy_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can only read their own acceptances
CREATE POLICY "Users can read their own policy acceptances"
  ON public.policy_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own acceptances
CREATE POLICY "Users can insert their own policy acceptances"
  ON public.policy_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NO UPDATE or DELETE policies - this is an append-only table

-- 3. Create function to get the current (latest) policy version
CREATE OR REPLACE FUNCTION public.get_current_policy_version(p_policy_type TEXT)
RETURNS TABLE (
  id UUID,
  policy_type TEXT,
  version TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  content_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.policy_type,
    p.version,
    p.published_at,
    p.content_hash
  FROM public.policies p
  WHERE p.policy_type = p_policy_type
  ORDER BY p.published_at DESC
  LIMIT 1;
END;
$$;

-- 4. Create function to check if user has accepted the current policy version
CREATE OR REPLACE FUNCTION public.check_user_policy_compliance(p_user_id UUID)
RETURNS TABLE (
  policy_type TEXT,
  current_version TEXT,
  user_accepted_version TEXT,
  is_compliant BOOLEAN,
  accepted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH current_policies AS (
    SELECT DISTINCT ON (p.policy_type)
      p.policy_type,
      p.version as current_version
    FROM public.policies p
    ORDER BY p.policy_type, p.published_at DESC
  ),
  user_acceptances AS (
    SELECT DISTINCT ON (pa.policy_type)
      pa.policy_type,
      pa.policy_version as accepted_version,
      pa.accepted_at
    FROM public.policy_acceptances pa
    WHERE pa.user_id = p_user_id
    ORDER BY pa.policy_type, pa.accepted_at DESC
  )
  SELECT 
    cp.policy_type,
    cp.current_version,
    ua.accepted_version as user_accepted_version,
    (cp.current_version = ua.accepted_version) as is_compliant,
    ua.accepted_at
  FROM current_policies cp
  LEFT JOIN user_acceptances ua ON cp.policy_type = ua.policy_type;
END;
$$;

-- 5. Insert initial policy versions (current versions)
INSERT INTO public.policies (policy_type, version, published_at, content_hash)
VALUES 
  ('privacy', '2025-01-14', now(), NULL),
  ('terms', '2025-01-14', now(), NULL);

-- 6. Migrate existing terms_accepted_at to the new system
-- Create acceptance records for users who already accepted
INSERT INTO public.policy_acceptances (user_id, policy_type, policy_version, accepted_at, policy_id)
SELECT 
  p.id as user_id,
  'privacy' as policy_type,
  '2025-01-14' as policy_version,
  COALESCE(p.terms_accepted_at, p.created_at) as accepted_at,
  (SELECT pol.id FROM public.policies pol WHERE pol.policy_type = 'privacy' AND pol.version = '2025-01-14') as policy_id
FROM public.profiles p
WHERE p.terms_accepted_at IS NOT NULL;

INSERT INTO public.policy_acceptances (user_id, policy_type, policy_version, accepted_at, policy_id)
SELECT 
  p.id as user_id,
  'terms' as policy_type,
  '2025-01-14' as policy_version,
  COALESCE(p.terms_accepted_at, p.created_at) as accepted_at,
  (SELECT pol.id FROM public.policies pol WHERE pol.policy_type = 'terms' AND pol.version = '2025-01-14') as policy_id
FROM public.profiles p
WHERE p.terms_accepted_at IS NOT NULL;

-- 7. Remove the deprecated terms_accepted_at column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS terms_accepted_at;