
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
ON public.user_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_user_feedback_content_hash_per_user ON public.user_feedback (user_id, content_hash);
