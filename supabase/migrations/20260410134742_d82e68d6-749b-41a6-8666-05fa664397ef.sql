
-- Create enum for the 7 predefined stages
CREATE TYPE public.etapa_licitacao_codigo AS ENUM (
  'analise_edital',
  'esclarecimento_impugnacao',
  'aprovacoes',
  'preparacao_documentos',
  'proposta',
  'disputa_pregao',
  'resultado'
);

-- Create enum for stage statuses
CREATE TYPE public.etapa_licitacao_status AS ENUM (
  -- analise_edital
  'edital_pendente_analise',
  'edital_analisado',
  -- esclarecimento_impugnacao
  'pendente',
  'elaborando_peca',
  'peca_enviada',
  'finalizada',
  -- aprovacoes
  'aguardando_aprovacoes',
  'concluido',
  -- preparacao_documentos
  'em_analise',
  'documentos_analisados',
  -- proposta
  'elaborando_proposta',
  'proposta_finalizada',
  -- disputa_pregao
  'em_disputa',
  'recurso_contrarrazao',
  'disputa_finalizada',
  -- resultado
  'aguardando_resultado',
  'resultado_finalizado',
  -- common
  'nao_iniciada'
);

-- Table: Client-level stage configuration
CREATE TABLE public.licitacao_etapas_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  etapa_codigo etapa_licitacao_codigo NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, etapa_codigo)
);

ALTER TABLE public.licitacao_etapas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all etapas config"
  ON public.licitacao_etapas_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view etapas config"
  ON public.licitacao_etapas_config FOR SELECT
  USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their client etapas config"
  ON public.licitacao_etapas_config FOR SELECT
  USING (cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE TRIGGER update_licitacao_etapas_config_updated_at
  BEFORE UPDATE ON public.licitacao_etapas_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: Per-licitacao stage execution tracking
CREATE TABLE public.licitacao_etapa_execucao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  etapa_codigo etapa_licitacao_codigo NOT NULL,
  status etapa_licitacao_status NOT NULL DEFAULT 'nao_iniciada',
  dados JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  responsavel_id UUID REFERENCES public.profiles(id),
  data_inicio TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(licitacao_id, etapa_codigo)
);

ALTER TABLE public.licitacao_etapa_execucao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all etapa execucao"
  ON public.licitacao_etapa_execucao FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all etapa execucao"
  ON public.licitacao_etapa_execucao FOR SELECT
  USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client etapa execucao"
  ON public.licitacao_etapa_execucao FOR ALL
  USING (licitacao_id IN (
    SELECT l.id FROM licitacoes l
    WHERE l.cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid())
  ));

CREATE TRIGGER update_licitacao_etapa_execucao_updated_at
  BEFORE UPDATE ON public.licitacao_etapa_execucao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: Document checklist per licitacao
CREATE TABLE public.licitacao_documentos_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL DEFAULT 'outro',
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  data_validade TIMESTAMPTZ,
  verificado_por UUID REFERENCES public.profiles(id),
  verificado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.licitacao_documentos_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all doc checklist"
  ON public.licitacao_documentos_checklist FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all doc checklist"
  ON public.licitacao_documentos_checklist FOR SELECT
  USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client doc checklist"
  ON public.licitacao_documentos_checklist FOR ALL
  USING (licitacao_id IN (
    SELECT l.id FROM licitacoes l
    WHERE l.cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid())
  ));

CREATE TRIGGER update_licitacao_documentos_checklist_updated_at
  BEFORE UPDATE ON public.licitacao_documentos_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: Result per item
CREATE TABLE public.licitacao_resultado_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  item_numero INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  resultado TEXT NOT NULL DEFAULT 'pendente',
  valor_proposta NUMERIC,
  valor_vencedor NUMERIC,
  vencedor_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.licitacao_resultado_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all resultado itens"
  ON public.licitacao_resultado_itens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all resultado itens"
  ON public.licitacao_resultado_itens FOR SELECT
  USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client resultado itens"
  ON public.licitacao_resultado_itens FOR ALL
  USING (licitacao_id IN (
    SELECT l.id FROM licitacoes l
    WHERE l.cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid())
  ));

CREATE TRIGGER update_licitacao_resultado_itens_updated_at
  BEFORE UPDATE ON public.licitacao_resultado_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add etapa_atual_codigo to licitacoes for quick reference
ALTER TABLE public.licitacoes ADD COLUMN IF NOT EXISTS etapa_atual_codigo etapa_licitacao_codigo;

-- Function to initialize etapas for a licitacao based on client config
CREATE OR REPLACE FUNCTION public.inicializar_etapas_licitacao(p_licitacao_id UUID, p_cliente_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO licitacao_etapa_execucao (licitacao_id, etapa_codigo, status)
  SELECT p_licitacao_id, etapa_codigo, 'nao_iniciada'
  FROM licitacao_etapas_config
  WHERE cliente_id = p_cliente_id AND ativo = true
  ON CONFLICT (licitacao_id, etapa_codigo) DO NOTHING;
END;
$$;
