-- Add ConLicitacao integration fields to licitacoes table
ALTER TABLE public.licitacoes 
ADD COLUMN IF NOT EXISTS conlicitacao_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS uasg TEXT,
ADD COLUMN IF NOT EXISTS cidade_orgao TEXT,
ADD COLUMN IF NOT EXISTS uf_orgao TEXT,
ADD COLUMN IF NOT EXISTS endereco_orgao TEXT,
ADD COLUMN IF NOT EXISTS telefone_orgao TEXT,
ADD COLUMN IF NOT EXISTS site_orgao TEXT,
ADD COLUMN IF NOT EXISTS situacao_conlicitacao TEXT,
ADD COLUMN IF NOT EXISTS edital_url TEXT,
ADD COLUMN IF NOT EXISTS processo TEXT,
ADD COLUMN IF NOT EXISTS preco_edital NUMERIC,
ADD COLUMN IF NOT EXISTS data_documento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_retirada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_visita TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_prazo TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS boletim_id INTEGER,
ADD COLUMN IF NOT EXISTS filtro_id INTEGER;

-- Create index for ConLicitacao ID lookup
CREATE INDEX IF NOT EXISTS idx_licitacoes_conlicitacao_id ON public.licitacoes(conlicitacao_id);

-- Create table for ConLicitacao integration settings per client
CREATE TABLE IF NOT EXISTS public.conlicitacao_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  filtro_id INTEGER,
  filtro_descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_boletim_id INTEGER,
  ultimo_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cliente_id)
);

-- Enable RLS on conlicitacao_config
ALTER TABLE public.conlicitacao_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for conlicitacao_config
CREATE POLICY "Admins can manage all conlicitacao configs"
ON public.conlicitacao_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their client conlicitacao config"
ON public.conlicitacao_config
FOR SELECT
USING (cliente_id IN (
  SELECT profiles.cliente_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

-- Create table for ConLicitacao webhook logs
CREATE TABLE IF NOT EXISTS public.conlicitacao_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id),
  boletim_id INTEGER,
  filtro_id INTEGER,
  tipo TEXT NOT NULL DEFAULT 'webhook',
  licitacoes_recebidas INTEGER DEFAULT 0,
  licitacoes_novas INTEGER DEFAULT 0,
  licitacoes_atualizadas INTEGER DEFAULT 0,
  acompanhamentos_recebidos INTEGER DEFAULT 0,
  sucesso BOOLEAN NOT NULL DEFAULT true,
  erro TEXT,
  dados_brutos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on conlicitacao_logs
ALTER TABLE public.conlicitacao_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for conlicitacao_logs
CREATE POLICY "Admins can manage all conlicitacao logs"
ON public.conlicitacao_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their client conlicitacao logs"
ON public.conlicitacao_logs
FOR SELECT
USING (cliente_id IN (
  SELECT profiles.cliente_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

-- Trigger for updated_at on conlicitacao_config
CREATE TRIGGER update_conlicitacao_config_updated_at
BEFORE UPDATE ON public.conlicitacao_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();