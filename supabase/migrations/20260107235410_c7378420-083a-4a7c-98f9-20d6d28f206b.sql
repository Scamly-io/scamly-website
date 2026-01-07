-- Add has_consumed_trial to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_consumed_trial boolean NOT NULL DEFAULT false;

-- Create payment_fingerprints table for tracking trial abuse
CREATE TABLE public.payment_fingerprints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint text NOT NULL,
  fingerprint_type text NOT NULL CHECK (fingerprint_type IN ('card', 'link')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_fingerprint UNIQUE (fingerprint)
);

-- Create index for fast fingerprint lookups
CREATE INDEX idx_payment_fingerprints_fingerprint ON public.payment_fingerprints(fingerprint);
CREATE INDEX idx_payment_fingerprints_user_id ON public.payment_fingerprints(user_id);

-- Enable RLS
ALTER TABLE public.payment_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS policies - only allow users to view their own fingerprints (for transparency)
-- But no insert/update/delete from client - only service role can manage these
CREATE POLICY "Users can view their own payment fingerprints"
ON public.payment_fingerprints
FOR SELECT
USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.payment_fingerprints IS 'Tracks payment method fingerprints to prevent free trial abuse. One trial per payment method.';
COMMENT ON COLUMN public.payment_fingerprints.fingerprint IS 'For cards: card fingerprint. For Link: email address.';
COMMENT ON COLUMN public.payment_fingerprints.fingerprint_type IS 'Type of payment method: card or link';