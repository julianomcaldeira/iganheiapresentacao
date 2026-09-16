
ALTER TABLE public.cliente_aprovacao_config
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS email_area text,
  ADD COLUMN IF NOT EXISTS anexo_url text,
  ADD COLUMN IF NOT EXISTS anexo_nome text;
