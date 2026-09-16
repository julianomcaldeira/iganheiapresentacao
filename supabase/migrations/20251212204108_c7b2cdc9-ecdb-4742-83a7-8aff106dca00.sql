-- Create table for strategic analysis history
CREATE TABLE public.analise_estrategica_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  resultado JSONB NOT NULL,
  score_geral INTEGER,
  total_licitacoes INTEGER DEFAULT 0,
  taxa_sucesso NUMERIC DEFAULT 0,
  valor_total_ganho NUMERIC DEFAULT 0,
  valor_total_perdido NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_analise_estrategica_cliente ON public.analise_estrategica_historico(cliente_id);
CREATE INDEX idx_analise_estrategica_periodo ON public.analise_estrategica_historico(periodo_inicio, periodo_fim);

-- Enable RLS
ALTER TABLE public.analise_estrategica_historico ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all analysis history"
ON public.analise_estrategica_historico
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all analysis history"
ON public.analise_estrategica_historico
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their client analysis history"
ON public.analise_estrategica_historico
FOR SELECT
USING (cliente_id IN (
  SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;