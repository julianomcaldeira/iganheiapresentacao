-- Add column for AI analysis result in licitacoes table
ALTER TABLE public.licitacoes
ADD COLUMN IF NOT EXISTS analise_ia JSONB NULL,
ADD COLUMN IF NOT EXISTS analise_ia_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS analise_ia_data TIMESTAMP WITH TIME ZONE DEFAULT NULL;