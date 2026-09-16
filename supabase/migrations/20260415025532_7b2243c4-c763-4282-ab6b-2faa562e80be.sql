
ALTER TABLE public.cliente_aprovacao_config
  ADD COLUMN IF NOT EXISTS aprovadores_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS emails_area text[] DEFAULT '{}';

-- Migrate existing single values to arrays
UPDATE public.cliente_aprovacao_config
SET aprovadores_ids = ARRAY[aprovador_id]
WHERE aprovador_id IS NOT NULL AND (aprovadores_ids IS NULL OR aprovadores_ids = '{}');

UPDATE public.cliente_aprovacao_config
SET emails_area = ARRAY[email_area]
WHERE email_area IS NOT NULL AND email_area != '' AND (emails_area IS NULL OR emails_area = '{}');
