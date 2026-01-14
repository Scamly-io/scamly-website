-- Change referral_sources from text array to single text value
ALTER TABLE public.profiles 
DROP COLUMN referral_sources;

ALTER TABLE public.profiles 
ADD COLUMN referral_source text NULL;

COMMENT ON COLUMN public.profiles.referral_source IS 'How the user heard about us (single selection)';