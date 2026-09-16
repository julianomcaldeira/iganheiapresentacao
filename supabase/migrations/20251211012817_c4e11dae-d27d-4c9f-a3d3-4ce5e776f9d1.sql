-- Add ativo field to profiles
ALTER TABLE public.profiles ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;