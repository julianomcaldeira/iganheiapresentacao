
-- 1. Migrar dados existentes para os 4 novos status
UPDATE public.licitacoes SET status = 'pendente_analise' WHERE status IN ('nova', 'em_analise');
UPDATE public.licitacoes SET status = 'em_andamento' WHERE status IN ('em_andamento', 'participando', 'rascunho');
UPDATE public.licitacoes SET status = 'finalizado' WHERE status IN ('ganha', 'concluida');
UPDATE public.licitacoes SET status = 'recusado' WHERE status IN ('perdida', 'cancelada');

-- Garantir status default para novas linhas
ALTER TABLE public.licitacoes ALTER COLUMN status SET DEFAULT 'pendente_analise';

-- Constraint para garantir apenas os 4 valores
ALTER TABLE public.licitacoes DROP CONSTRAINT IF EXISTS licitacoes_status_check;
ALTER TABLE public.licitacoes ADD CONSTRAINT licitacoes_status_check 
  CHECK (status IN ('pendente_analise', 'em_andamento', 'finalizado', 'recusado'));

-- Catch-all caso ainda exista algum valor antigo
UPDATE public.licitacoes SET status = 'pendente_analise' 
  WHERE status NOT IN ('pendente_analise', 'em_andamento', 'finalizado', 'recusado');

-- 2. Tabela de regras automáticas de status (admin configura)
CREATE TABLE IF NOT EXISTS public.licitacao_status_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  status_destino text NOT NULL CHECK (status_destino IN ('pendente_analise', 'em_andamento', 'finalizado', 'recusado')),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  -- condições (todas opcionais; combinadas com AND)
  condicao_sem_analise_ia boolean DEFAULT false,
  condicao_dias_sem_analise integer,
  condicao_etapa_workflow_id uuid,
  condicao_etapa_finalizada boolean DEFAULT false,
  condicao_dias_apos_encerramento integer,
  condicao_valor_minimo numeric,
  condicao_valor_maximo numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.licitacao_status_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all status rules"
  ON public.licitacao_status_regras FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their client status rules"
  ON public.licitacao_status_regras FOR SELECT
  USING (cliente_id IN (SELECT cliente_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can view all status rules"
  ON public.licitacao_status_regras FOR SELECT
  USING (public.has_role(auth.uid(), 'gerente'::app_role));

CREATE TRIGGER update_licitacao_status_regras_updated_at
  BEFORE UPDATE ON public.licitacao_status_regras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_licitacao_status_regras_cliente ON public.licitacao_status_regras(cliente_id, ordem) WHERE ativo = true;

-- 3. Expandir filtros do kanban de pendências
ALTER TABLE public.pendencias_kanban_config 
  ADD COLUMN IF NOT EXISTS filtros_avancados jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pendencias_kanban_config.filtros_avancados IS 
'Filtros combinados: { status_in: [], valor_min, valor_max, data_campo, data_de, data_ate, etapa_id, workflow_id }';
