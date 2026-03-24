CREATE OR REPLACE FUNCTION public.get_user_email_by_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM authenticated;