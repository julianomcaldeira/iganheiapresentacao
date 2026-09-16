-- Add webhook_url field to clientes table for external integrations
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_ativo boolean DEFAULT false;