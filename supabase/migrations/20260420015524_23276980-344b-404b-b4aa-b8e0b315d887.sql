
-- Tabela de versões/histórico de licitações
CREATE TABLE IF NOT EXISTS public.licitacao_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licitacao_id uuid NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  conlicitacao_id integer,
  boletim_id integer,
  situacao_conlicitacao text,
  snapshot jsonb NOT NULL,
  campos_alterados jsonb DEFAULT '[]'::jsonb,
  total_mudancas integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(licitacao_id, versao)
);

ALTER TABLE public.licitacao_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all licitacao versoes"
  ON public.licitacao_versoes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers view all licitacao versoes"
  ON public.licitacao_versoes FOR SELECT
  USING (public.has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users view their client licitacao versoes"
  ON public.licitacao_versoes FOR SELECT
  USING (
    licitacao_id IN (
      SELECT l.id FROM public.licitacoes l
      WHERE l.cliente_id IN (SELECT cliente_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE INDEX idx_licitacao_versoes_licitacao ON public.licitacao_versoes(licitacao_id, versao DESC);

-- Campos de tracking na tabela licitacoes
ALTER TABLE public.licitacoes
  ADD COLUMN IF NOT EXISTS versao_atual integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ultima_atualizacao_conlicitacao timestamptz,
  ADD COLUMN IF NOT EXISTS ultimas_mudancas jsonb DEFAULT '[]'::jsonb;
