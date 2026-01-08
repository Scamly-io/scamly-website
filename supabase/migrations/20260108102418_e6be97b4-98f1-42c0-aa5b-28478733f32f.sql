-- Add welcome_email_sent column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false;