ALTER TABLE public.licitacao_mensagens_internas
ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
ADD COLUMN IF NOT EXISTS arquivo_nome TEXT;