-- Explicitly deny anonymous access to profiles
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles AS RESTRICTIVE FOR SELECT
TO anon
USING (false);

-- Explicitly deny anonymous access to chats (same issue)
CREATE POLICY "Deny anonymous access to chats"
ON public.chats AS RESTRICTIVE FOR SELECT
TO anon
USING (false);