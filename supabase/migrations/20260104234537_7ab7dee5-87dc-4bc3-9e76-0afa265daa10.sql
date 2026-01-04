-- =============================================
-- REFERRAL SYSTEM DATABASE SCHEMA
-- =============================================

-- Extend profiles table with referral fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referral_code_active boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_code_updated_at timestamp with time zone;

-- Create index for referral code lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code_lower 
ON public.profiles (LOWER(referral_code)) WHERE referral_code IS NOT NULL;

-- =============================================
-- REFERRALS TABLE
-- Represents a one-time referral relationship
-- =============================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code_used text NOT NULL,
    converted boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    converted_at timestamp with time zone,
    
    -- Each user can only be referred once ever
    CONSTRAINT unique_referred_user UNIQUE (referred_user_id),
    -- Prevent self-referrals
    CONSTRAINT no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_converted ON public.referrals(referrer_user_id, converted);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
-- Users can view referrals where they are the referrer
CREATE POLICY "Users can view referrals they made"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Users can view their own referred record
CREATE POLICY "Users can view their own referral record"
ON public.referrals
FOR SELECT
USING (auth.uid() = referred_user_id);

-- Only backend (service role) can insert/update/delete referrals
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- =============================================
-- REFERRAL_REWARDS TABLE
-- Tracks earned billing discounts independently
-- =============================================
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    percent integer NOT NULL CHECK (percent IN (5, 10)),
    applied boolean NOT NULL DEFAULT false,
    stripe_coupon_id text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    applied_at timestamp with time zone,
    -- For idempotency: track which referral triggered this reward
    source_referral_id uuid,
    -- Prevent duplicate rewards for the same referral
    CONSTRAINT unique_reward_per_referral UNIQUE (user_id, source_referral_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_pending ON public.referral_rewards(user_id, applied) WHERE applied = false;

-- Enable RLS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_rewards
-- Users can only view their own rewards
CREATE POLICY "Users can view their own rewards"
ON public.referral_rewards
FOR SELECT
USING (auth.uid() = user_id);

-- Only backend (service role) can insert/update/delete rewards
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result text := '';
    i integer;
BEGIN
    -- Generate 8 character code
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Function to validate referral code format (alphanumeric + hyphens, 3-20 chars)
CREATE OR REPLACE FUNCTION public.is_valid_referral_code_format(code text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN code ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,18}[A-Za-z0-9]$' 
           OR code ~ '^[A-Za-z0-9]{3,20}$';
END;
$$;

-- Function to check if user has ever used a referral code
CREATE OR REPLACE FUNCTION public.has_used_referral_code(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.referrals
        WHERE referred_user_id = user_id
    );
$$;

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id uuid)
RETURNS TABLE (
    total_referrals bigint,
    pending_referrals bigint,
    converted_referrals bigint,
    pending_discount_percent bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = p_user_id),
        (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = p_user_id AND converted = false),
        (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = p_user_id AND converted = true),
        (SELECT COALESCE(SUM(percent), 0) FROM public.referral_rewards WHERE user_id = p_user_id AND applied = false);
$$;