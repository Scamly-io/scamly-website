-- Fix search_path for referral helper functions

-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN code ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,18}[A-Za-z0-9]$' 
           OR code ~ '^[A-Za-z0-9]{3,20}$';
END;
$$;