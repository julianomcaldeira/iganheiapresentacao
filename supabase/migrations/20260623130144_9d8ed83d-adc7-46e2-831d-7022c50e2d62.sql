
-- =========================================================
-- CONTRATOS — tabela principal
-- =========================================================
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  licitacao_id UUID REFERENCES public.licitacoes(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  objeto TEXT,
  orgao TEXT NOT NULL,
  uf TEXT,
  modalidade TEXT,
  fornecedor TEXT,
  valor_original NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_atual NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_executado NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_assinatura DATE,
  data_inicio_vigencia DATE,
  data_fim_vigencia DATE,
  fiscal_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fiscal_nome TEXT,
  gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  gestor_nome TEXT,
  indice_reajuste TEXT, -- IPCA, IGP-M, INPC, etc.
  permite_subcontratacao BOOLEAN NOT NULL DEFAULT false,
  percentual_subcontratacao_max NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'vigente', -- vigente, em_execucao, aditado, em_renovacao, encerrado, rescindido, suspenso
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam todos contratos" ON public.contratos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios veem contratos do seu cliente" ON public.contratos FOR SELECT TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Usuarios gerenciam contratos do seu cliente" ON public.contratos FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_contratos_cliente ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_licitacao ON public.contratos(licitacao_id);
CREATE INDEX idx_contratos_status ON public.contratos(status);
CREATE INDEX idx_contratos_fim_vigencia ON public.contratos(data_fim_vigencia);
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ADITIVOS
-- =========================================================
CREATE TABLE public.contrato_aditivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_termo TEXT NOT NULL,
  tipo TEXT NOT NULL, -- prazo, valor, acrescimo, supressao, qualitativo, misto
  data_assinatura DATE,
  data_publicacao DATE,
  valor_alteracao NUMERIC(15,2) DEFAULT 0, -- positivo ou negativo
  novo_valor_contrato NUMERIC(15,2),
  prazo_adicional_dias INTEGER DEFAULT 0,
  nova_data_fim_vigencia DATE,
  justificativa TEXT,
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'vigente',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_aditivos TO authenticated;
GRANT ALL ON public.contrato_aditivos TO service_role;
ALTER TABLE public.contrato_aditivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam aditivos" ON public.contrato_aditivos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam aditivos do seu cliente" ON public.contrato_aditivos FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_aditivos_contrato ON public.contrato_aditivos(contrato_id);
CREATE TRIGGER trg_aditivos_updated BEFORE UPDATE ON public.contrato_aditivos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- APOSTILAMENTOS
-- =========================================================
CREATE TABLE public.contrato_apostilamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'reajuste', -- reajuste, repactuacao, revisao
  indice TEXT, -- IPCA, IGP-M, INPC
  percentual NUMERIC(8,4),
  periodo_referencia_inicio DATE,
  periodo_referencia_fim DATE,
  valor_anterior NUMERIC(15,2),
  valor_novo NUMERIC(15,2),
  data_aplicacao DATE,
  justificativa TEXT,
  arquivo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_apostilamentos TO authenticated;
GRANT ALL ON public.contrato_apostilamentos TO service_role;
ALTER TABLE public.contrato_apostilamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam apostilamentos" ON public.contrato_apostilamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam apostilamentos do seu cliente" ON public.contrato_apostilamentos FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_apostilamentos_contrato ON public.contrato_apostilamentos(contrato_id);
CREATE TRIGGER trg_apostilamentos_updated BEFORE UPDATE ON public.contrato_apostilamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RESCISÕES
-- =========================================================
CREATE TABLE public.contrato_rescisoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- unilateral, amigavel, judicial
  motivo TEXT,
  data_rescisao DATE NOT NULL,
  saldo_remanescente NUMERIC(15,2) DEFAULT 0,
  multa_aplicada NUMERIC(15,2) DEFAULT 0,
  responsavel_orgao TEXT,
  documento_url TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_rescisoes TO authenticated;
GRANT ALL ON public.contrato_rescisoes TO service_role;
ALTER TABLE public.contrato_rescisoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam rescisoes" ON public.contrato_rescisoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam rescisoes do seu cliente" ON public.contrato_rescisoes FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_rescisoes_contrato ON public.contrato_rescisoes(contrato_id);
CREATE TRIGGER trg_rescisoes_updated BEFORE UPDATE ON public.contrato_rescisoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- GARANTIAS
-- =========================================================
CREATE TABLE public.contrato_garantias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- caucao_dinheiro, titulos_divida_publica, seguro_garantia, fianca_bancaria
  valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  percentual_contrato NUMERIC(5,2),
  emissor TEXT, -- nome da seguradora / banco
  numero_apolice TEXT,
  data_emissao DATE,
  data_vigencia_inicio DATE,
  data_vigencia_fim DATE,
  status TEXT NOT NULL DEFAULT 'ativa', -- ativa, vencida, executada, devolvida
  arquivo_url TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_garantias TO authenticated;
GRANT ALL ON public.contrato_garantias TO service_role;
ALTER TABLE public.contrato_garantias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam garantias" ON public.contrato_garantias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam garantias do seu cliente" ON public.contrato_garantias FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_garantias_contrato ON public.contrato_garantias(contrato_id);
CREATE INDEX idx_garantias_vigencia_fim ON public.contrato_garantias(data_vigencia_fim);
CREATE TRIGGER trg_garantias_updated BEFORE UPDATE ON public.contrato_garantias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- SUBCONTRATAÇÕES
-- =========================================================
CREATE TABLE public.contrato_subcontratacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  objeto_subcontratado TEXT,
  percentual NUMERIC(5,2),
  valor NUMERIC(15,2) DEFAULT 0,
  data_aprovacao DATE,
  data_inicio DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'ativa', -- ativa, encerrada, rejeitada
  documento_url TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_subcontratacoes TO authenticated;
GRANT ALL ON public.contrato_subcontratacoes TO service_role;
ALTER TABLE public.contrato_subcontratacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam subcontratacoes" ON public.contrato_subcontratacoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam subcontratacoes do seu cliente" ON public.contrato_subcontratacoes FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_subcontratacoes_contrato ON public.contrato_subcontratacoes(contrato_id);
CREATE TRIGGER trg_subcontratacoes_updated BEFORE UPDATE ON public.contrato_subcontratacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- MEDIÇÕES
-- =========================================================
CREATE TABLE public.contrato_medicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  valor_medido NUMERIC(15,2) NOT NULL DEFAULT 0,
  percentual_fisico NUMERIC(5,2) DEFAULT 0,
  percentual_acumulado NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho', -- rascunho, enviada, atestada, paga, glosada
  data_envio DATE,
  data_atesto DATE,
  fiscal_aprovador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fiscal_aprovador_nome TEXT,
  valor_glosa NUMERIC(15,2) DEFAULT 0,
  motivo_glosa TEXT,
  observacoes TEXT,
  arquivo_boletim_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_medicoes TO authenticated;
GRANT ALL ON public.contrato_medicoes TO service_role;
ALTER TABLE public.contrato_medicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam medicoes" ON public.contrato_medicoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam medicoes do seu cliente" ON public.contrato_medicoes FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_medicoes_contrato ON public.contrato_medicoes(contrato_id);
CREATE INDEX idx_medicoes_status ON public.contrato_medicoes(status);
CREATE TRIGGER trg_medicoes_updated BEFORE UPDATE ON public.contrato_medicoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- CRONOGRAMA FÍSICO-FINANCEIRO
-- =========================================================
CREATE TABLE public.contrato_cronograma (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  etapa TEXT NOT NULL,
  descricao TEXT,
  mes_referencia DATE NOT NULL,
  percentual_previsto NUMERIC(5,2) DEFAULT 0,
  percentual_realizado NUMERIC(5,2) DEFAULT 0,
  valor_previsto NUMERIC(15,2) DEFAULT 0,
  valor_realizado NUMERIC(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'previsto', -- previsto, em_andamento, concluido, atrasado
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_cronograma TO authenticated;
GRANT ALL ON public.contrato_cronograma TO service_role;
ALTER TABLE public.contrato_cronograma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam cronograma" ON public.contrato_cronograma FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam cronograma do seu cliente" ON public.contrato_cronograma FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_cronograma_contrato ON public.contrato_cronograma(contrato_id);
CREATE INDEX idx_cronograma_mes ON public.contrato_cronograma(mes_referencia);
CREATE TRIGGER trg_cronograma_updated BEFORE UPDATE ON public.contrato_cronograma
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- FATURAS / NOTAS FISCAIS
-- =========================================================
CREATE TABLE public.contrato_faturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  medicao_id UUID REFERENCES public.contrato_medicoes(id) ON DELETE SET NULL,
  empenho_id UUID REFERENCES public.empenhos(id) ON DELETE SET NULL,
  numero_nf TEXT NOT NULL,
  serie TEXT,
  data_emissao DATE NOT NULL,
  data_vencimento DATE,
  data_atesto DATE,
  data_pagamento DATE,
  valor_bruto NUMERIC(15,2) NOT NULL DEFAULT 0,
  retencao_iss NUMERIC(15,2) DEFAULT 0,
  retencao_inss NUMERIC(15,2) DEFAULT 0,
  retencao_ir NUMERIC(15,2) DEFAULT 0,
  retencao_pis_cofins_csll NUMERIC(15,2) DEFAULT 0,
  retencao_garantia NUMERIC(15,2) DEFAULT 0,
  outras_retencoes NUMERIC(15,2) DEFAULT 0,
  valor_liquido NUMERIC(15,2) GENERATED ALWAYS AS (
    valor_bruto
    - COALESCE(retencao_iss,0)
    - COALESCE(retencao_inss,0)
    - COALESCE(retencao_ir,0)
    - COALESCE(retencao_pis_cofins_csll,0)
    - COALESCE(retencao_garantia,0)
    - COALESCE(outras_retencoes,0)
  ) STORED,
  status TEXT NOT NULL DEFAULT 'emitida', -- emitida, atestada, paga, cancelada, glosada
  chave_acesso TEXT,
  arquivo_xml_url TEXT,
  arquivo_pdf_url TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_faturas TO authenticated;
GRANT ALL ON public.contrato_faturas TO service_role;
ALTER TABLE public.contrato_faturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam faturas" ON public.contrato_faturas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuarios gerenciam faturas do seu cliente" ON public.contrato_faturas FOR ALL TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()))
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE INDEX idx_faturas_contrato ON public.contrato_faturas(contrato_id);
CREATE INDEX idx_faturas_empenho ON public.contrato_faturas(empenho_id);
CREATE INDEX idx_faturas_status ON public.contrato_faturas(status);
CREATE TRIGGER trg_faturas_updated BEFORE UPDATE ON public.contrato_faturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
