-- Create empenhos table for tracking financial commitments in public bidding
CREATE TABLE public.empenhos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  licitacao_id UUID REFERENCES public.licitacoes(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES public.licitacoes(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  orgao_emissor TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ordinario', -- ordinario, global, estimativo
  valor_empenhado NUMERIC NOT NULL DEFAULT 0,
  valor_utilizado NUMERIC NOT NULL DEFAULT 0,
  saldo_disponivel NUMERIC GENERATED ALWAYS AS (valor_empenhado - valor_utilizado) STORED,
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_vencimento TIMESTAMP WITH TIME ZONE,
  objeto TEXT,
  fonte_recurso TEXT,
  programa_trabalho TEXT,
  natureza_despesa TEXT,
  unidade_gestora TEXT,
  status TEXT NOT NULL DEFAULT 'ativo', -- ativo, utilizado, cancelado, anulado
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.empenhos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all empenhos"
ON public.empenhos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all empenhos"
ON public.empenhos
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client empenhos"
ON public.empenhos
FOR ALL
USING (cliente_id IN (
  SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_empenhos_cliente_id ON public.empenhos(cliente_id);
CREATE INDEX idx_empenhos_licitacao_id ON public.empenhos(licitacao_id);
CREATE INDEX idx_empenhos_status ON public.empenhos(status);
CREATE INDEX idx_empenhos_data_emissao ON public.empenhos(data_emissao);

-- Create trigger for updated_at
CREATE TRIGGER update_empenhos_updated_at
BEFORE UPDATE ON public.empenhos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_empenhos
AFTER INSERT OR UPDATE OR DELETE ON public.empenhos
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_function();