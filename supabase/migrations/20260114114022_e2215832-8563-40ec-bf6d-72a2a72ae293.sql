-- Add referral source and legal agreement columns to profiles table

-- Add referral_sources column as text array to store multiple sources
ALTER TABLE public.profiles 
ADD COLUMN referral_sources text[] NULL;

-- Add terms_accepted_at timestamp to track when user agreed to T&C and privacy policy
ALTER TABLE public.profiles 
ADD COLUMN terms_accepted_at timestamp with time zone NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.referral_sources IS 'How the user heard about us (multiselect options)';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp when user accepted Terms & Conditions and Privacy Policy';