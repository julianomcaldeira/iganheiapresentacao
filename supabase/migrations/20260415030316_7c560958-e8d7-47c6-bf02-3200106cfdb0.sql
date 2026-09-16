
-- Tabela para armazenar dados de inteligência iPesquisei
CREATE TABLE public.ipesquisei_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  cnpj text NOT NULL,
  tipo_entidade text NOT NULL DEFAULT 'cliente', -- 'cliente' ou 'concorrente'
  nome_entidade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Histórico de licitações do iPesquisei
CREATE TABLE public.ipesquisei_licitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipesquisei_dado_id uuid REFERENCES public.ipesquisei_dados(id) ON DELETE CASCADE NOT NULL,
  ipesquisei_id text,
  numero text,
  objeto text,
  orgao text,
  modalidade text,
  uf text,
  cidade text,
  valor_estimado numeric,
  data_abertura timestamptz,
  data_resultado timestamptz,
  vencedor_cnpj text,
  vencedor_nome text,
  valor_vencedor numeric,
  ganhou boolean,
  dados_completos jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sanções e impedimentos do iPesquisei
CREATE TABLE public.ipesquisei_sancoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipesquisei_dado_id uuid REFERENCES public.ipesquisei_dados(id) ON DELETE CASCADE NOT NULL,
  tipo_cadastro text, -- CEIS, CNEP
  orgao_sancionador text,
  tipo_sancao text,
  fundamentacao text,
  data_inicio timestamptz,
  data_fim timestamptz,
  vigente boolean DEFAULT true,
  dados_completos jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Logs de sincronização
CREATE TABLE public.ipesquisei_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL, -- 'manual', 'cron'
  sucesso boolean NOT NULL DEFAULT false,
  total_licitacoes integer DEFAULT 0,
  total_sancoes integer DEFAULT 0,
  erro text,
  dados_brutos jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint para evitar duplicatas
ALTER TABLE public.ipesquisei_dados ADD CONSTRAINT ipesquisei_dados_cliente_cnpj_unique UNIQUE (cliente_id, cnpj);

-- Índices
CREATE INDEX idx_ipesquisei_licitacoes_dado_id ON public.ipesquisei_licitacoes(ipesquisei_dado_id);
CREATE INDEX idx_ipesquisei_sancoes_dado_id ON public.ipesquisei_sancoes(ipesquisei_dado_id);
CREATE INDEX idx_ipesquisei_sync_logs_cliente_id ON public.ipesquisei_sync_logs(cliente_id);

-- RLS
ALTER TABLE public.ipesquisei_dados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipesquisei_licitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipesquisei_sancoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipesquisei_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read data from their client
CREATE POLICY "Users can view ipesquisei data for their client" ON public.ipesquisei_dados
  FOR SELECT TO authenticated
  USING (
    cliente_id IN (SELECT cliente_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can view ipesquisei licitacoes" ON public.ipesquisei_licitacoes
  FOR SELECT TO authenticated
  USING (
    ipesquisei_dado_id IN (
      SELECT id FROM public.ipesquisei_dados WHERE cliente_id IN (
        SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can view ipesquisei sancoes" ON public.ipesquisei_sancoes
  FOR SELECT TO authenticated
  USING (
    ipesquisei_dado_id IN (
      SELECT id FROM public.ipesquisei_dados WHERE cliente_id IN (
        SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can view ipesquisei sync logs" ON public.ipesquisei_sync_logs
  FOR SELECT TO authenticated
  USING (
    cliente_id IN (SELECT cliente_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Service role insert/update policies for edge functions
CREATE POLICY "Service can manage ipesquisei data" ON public.ipesquisei_dados
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage ipesquisei licitacoes" ON public.ipesquisei_licitacoes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage ipesquisei sancoes" ON public.ipesquisei_sancoes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage ipesquisei sync logs" ON public.ipesquisei_sync_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated at triggers
CREATE TRIGGER update_ipesquisei_dados_updated_at BEFORE UPDATE ON public.ipesquisei_dados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ipesquisei_licitacoes_updated_at BEFORE UPDATE ON public.ipesquisei_licitacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ipesquisei_sancoes_updated_at BEFORE UPDATE ON public.ipesquisei_sancoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
