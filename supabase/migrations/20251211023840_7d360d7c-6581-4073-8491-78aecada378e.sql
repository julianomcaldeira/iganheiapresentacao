
-- Workflow templates per client
CREATE TABLE public.licitacao_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow steps
CREATE TABLE public.workflow_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.licitacao_workflows(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  cor TEXT DEFAULT '#3b82f6',
  icone TEXT DEFAULT 'circle',
  obrigatoria BOOLEAN NOT NULL DEFAULT true,
  prazo_dias INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Custom fields for steps (with calculation support)
CREATE TABLE public.workflow_campos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.workflow_etapas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto', -- texto, numero, data, selecao, arquivo, calculado, moeda, percentual
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  opcoes JSONB, -- for select fields
  formula TEXT, -- for calculated fields (e.g., "{campo1} * {campo2}")
  campos_referencia TEXT[], -- fields used in formula
  valor_padrao TEXT,
  mascara TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approval workflow configuration
CREATE TABLE public.workflow_aprovacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.workflow_etapas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'simples', -- simples, sequencial, paralelo
  aprovadores_minimos INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approvers for each approval step
CREATE TABLE public.workflow_aprovadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aprovacao_id UUID NOT NULL REFERENCES public.workflow_aprovacoes(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES public.perfis_acesso(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Declaration templates per client
CREATE TABLE public.declaracoes_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  variaveis TEXT[], -- available variables like {empresa_nome}, {cnpj}, {data}
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Proposal configuration per client
CREATE TABLE public.propostas_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  modelo_cabecalho TEXT,
  modelo_rodape TEXT,
  campos_obrigatorios TEXT[],
  incluir_logo BOOLEAN DEFAULT true,
  incluir_assinatura BOOLEAN DEFAULT true,
  formato_preco TEXT DEFAULT 'unitario_total', -- unitario, total, unitario_total
  casas_decimais INTEGER DEFAULT 2,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Actual bidding instances
CREATE TABLE public.licitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  workflow_id UUID NOT NULL REFERENCES public.licitacao_workflows(id),
  numero TEXT NOT NULL,
  objeto TEXT NOT NULL,
  orgao TEXT NOT NULL,
  modalidade TEXT,
  portal TEXT,
  valor_estimado NUMERIC(15,2),
  data_abertura TIMESTAMP WITH TIME ZONE,
  data_encerramento TIMESTAMP WITH TIME ZONE,
  etapa_atual_id UUID REFERENCES public.workflow_etapas(id),
  status TEXT NOT NULL DEFAULT 'rascunho', -- rascunho, em_andamento, aguardando_aprovacao, concluida, cancelada, ganha, perdida
  relevancia TEXT DEFAULT 'media', -- alta, media, baixa
  observacoes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step progress for each bidding
CREATE TABLE public.licitacao_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES public.workflow_etapas(id),
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, aguardando_aprovacao, concluida, pulada
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  responsavel_id UUID REFERENCES public.profiles(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Field values for each bidding step
CREATE TABLE public.licitacao_campos_valores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_etapa_id UUID NOT NULL REFERENCES public.licitacao_etapas(id) ON DELETE CASCADE,
  campo_id UUID NOT NULL REFERENCES public.workflow_campos(id),
  valor TEXT,
  valor_calculado TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products in bidding
CREATE TABLE public.licitacao_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  item_numero INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'UN',
  quantidade NUMERIC(15,4) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(15,4),
  valor_total NUMERIC(15,2),
  marca TEXT,
  modelo TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approval instances
CREATE TABLE public.licitacao_aprovacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_etapa_id UUID NOT NULL REFERENCES public.licitacao_etapas(id) ON DELETE CASCADE,
  aprovacao_config_id UUID NOT NULL REFERENCES public.workflow_aprovacoes(id),
  aprovador_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovado, rejeitado
  comentario TEXT,
  data_resposta TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.licitacao_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_aprovacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_aprovadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaracoes_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacao_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacao_campos_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacao_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacao_aprovacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for licitacao_workflows
CREATE POLICY "Admins can manage all workflows" ON public.licitacao_workflows FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view workflows" ON public.licitacao_workflows FOR SELECT USING (has_role(auth.uid(), 'gerente'));
CREATE POLICY "Users can view their client workflows" ON public.licitacao_workflows FOR SELECT USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for workflow_etapas
CREATE POLICY "Admins can manage all workflow steps" ON public.workflow_etapas FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view workflow steps" ON public.workflow_etapas FOR SELECT USING (
  workflow_id IN (SELECT id FROM licitacao_workflows WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR has_role(auth.uid(), 'gerente')
);

-- RLS Policies for workflow_campos
CREATE POLICY "Admins can manage all workflow fields" ON public.workflow_campos FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view workflow fields" ON public.workflow_campos FOR SELECT USING (
  etapa_id IN (SELECT we.id FROM workflow_etapas we JOIN licitacao_workflows lw ON we.workflow_id = lw.id WHERE lw.cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR has_role(auth.uid(), 'gerente')
);

-- RLS Policies for workflow_aprovacoes
CREATE POLICY "Admins can manage all approval configs" ON public.workflow_aprovacoes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view approval configs" ON public.workflow_aprovacoes FOR SELECT USING (
  etapa_id IN (SELECT we.id FROM workflow_etapas we JOIN licitacao_workflows lw ON we.workflow_id = lw.id WHERE lw.cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR has_role(auth.uid(), 'gerente')
);

-- RLS Policies for workflow_aprovadores
CREATE POLICY "Admins can manage all approvers" ON public.workflow_aprovadores FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view approvers" ON public.workflow_aprovadores FOR SELECT USING (
  aprovacao_id IN (SELECT wa.id FROM workflow_aprovacoes wa JOIN workflow_etapas we ON wa.etapa_id = we.id JOIN licitacao_workflows lw ON we.workflow_id = lw.id WHERE lw.cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR has_role(auth.uid(), 'gerente')
);

-- RLS Policies for declaracoes_templates
CREATE POLICY "Admins can manage all declaration templates" ON public.declaracoes_templates FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view declaration templates" ON public.declaracoes_templates FOR SELECT USING (has_role(auth.uid(), 'gerente'));
CREATE POLICY "Users can view their client declaration templates" ON public.declaracoes_templates FOR SELECT USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for propostas_config
CREATE POLICY "Admins can manage all proposal configs" ON public.propostas_config FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view proposal configs" ON public.propostas_config FOR SELECT USING (has_role(auth.uid(), 'gerente'));
CREATE POLICY "Users can view their client proposal configs" ON public.propostas_config FOR SELECT USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for licitacoes
CREATE POLICY "Admins can manage all licitacoes" ON public.licitacoes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view all licitacoes" ON public.licitacoes FOR SELECT USING (has_role(auth.uid(), 'gerente'));
CREATE POLICY "Users can manage their client licitacoes" ON public.licitacoes FOR ALL USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for licitacao_etapas
CREATE POLICY "Admins can manage all licitacao steps" ON public.licitacao_etapas FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage their licitacao steps" ON public.licitacao_etapas FOR ALL USING (
  licitacao_id IN (SELECT id FROM licitacoes WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR has_role(auth.uid(), 'gerente')
);

-- RLS Policies for licitacao_campos_valores
CREATE POLICY "Admins can manage all field values" ON public.licitacao_campos_valores FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage their field values" ON public.licitacao_campos_valores FOR ALL USING (
  licitacao_etapa_id IN (SELECT le.id FROM licitacao_etapas le JOIN licitacoes l ON le.licitacao_id = l.id WHERE l.cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR has_role(auth.uid(), 'gerente')
);

-- RLS Policies for licitacao_produtos
CREATE POLICY "Admins can manage all licitacao products" ON public.licitacao_produtos FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage their licitacao products" ON public.licitacao_produtos FOR ALL USING (
  licitacao_id IN (SELECT id FROM licitacoes WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR has_role(auth.uid(), 'gerente')
);

-- RLS Policies for licitacao_aprovacoes
CREATE POLICY "Admins can manage all approvals" ON public.licitacao_aprovacoes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their approvals" ON public.licitacao_aprovacoes FOR SELECT USING (
  licitacao_etapa_id IN (SELECT le.id FROM licitacao_etapas le JOIN licitacoes l ON le.licitacao_id = l.id WHERE l.cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
  OR aprovador_id = auth.uid()
  OR has_role(auth.uid(), 'gerente')
);
CREATE POLICY "Approvers can update their approvals" ON public.licitacao_aprovacoes FOR UPDATE USING (aprovador_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_licitacao_workflows_cliente ON public.licitacao_workflows(cliente_id);
CREATE INDEX idx_workflow_etapas_workflow ON public.workflow_etapas(workflow_id);
CREATE INDEX idx_workflow_campos_etapa ON public.workflow_campos(etapa_id);
CREATE INDEX idx_licitacoes_cliente ON public.licitacoes(cliente_id);
CREATE INDEX idx_licitacoes_status ON public.licitacoes(status);
CREATE INDEX idx_licitacao_etapas_licitacao ON public.licitacao_etapas(licitacao_id);
CREATE INDEX idx_licitacao_produtos_licitacao ON public.licitacao_produtos(licitacao_id);

-- Triggers for updated_at
CREATE TRIGGER update_licitacao_workflows_updated_at BEFORE UPDATE ON public.licitacao_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_declaracoes_templates_updated_at BEFORE UPDATE ON public.declaracoes_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_propostas_config_updated_at BEFORE UPDATE ON public.propostas_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licitacoes_updated_at BEFORE UPDATE ON public.licitacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licitacao_etapas_updated_at BEFORE UPDATE ON public.licitacao_etapas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licitacao_campos_valores_updated_at BEFORE UPDATE ON public.licitacao_campos_valores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licitacao_produtos_updated_at BEFORE UPDATE ON public.licitacao_produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_licitacao_workflows AFTER INSERT OR UPDATE OR DELETE ON public.licitacao_workflows FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_workflow_etapas AFTER INSERT OR UPDATE OR DELETE ON public.workflow_etapas FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_workflow_campos AFTER INSERT OR UPDATE OR DELETE ON public.workflow_campos FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_licitacoes AFTER INSERT OR UPDATE OR DELETE ON public.licitacoes FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_licitacao_aprovacoes AFTER INSERT OR UPDATE OR DELETE ON public.licitacao_aprovacoes FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_declaracoes_templates AFTER INSERT OR UPDATE OR DELETE ON public.declaracoes_templates FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_propostas_config AFTER INSERT OR UPDATE OR DELETE ON public.propostas_config FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.licitacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.licitacao_etapas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.licitacao_aprovacoes;
