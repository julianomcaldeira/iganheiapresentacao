-- Create table for storing generated legal pieces per licitação
CREATE TABLE public.licitacao_pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  tipo TEXT NOT NULL, -- pecas_impugnacao, pecas_recurso, pecas_esclarecimento, pecas_contrarrazoes
  titulo TEXT NOT NULL,
  descricao_solicitacao TEXT NOT NULL, -- user's detailed description
  conteudo_gerado TEXT, -- AI generated content
  modelo_ia TEXT, -- AI model used
  status TEXT NOT NULL DEFAULT 'processando', -- processando, concluido, erro
  erro TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.licitacao_pecas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all pecas"
  ON public.licitacao_pecas
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all pecas"
  ON public.licitacao_pecas
  FOR SELECT
  USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client pecas"
  ON public.licitacao_pecas
  FOR ALL
  USING (cliente_id IN (
    SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
  ));

-- Create index for faster queries
CREATE INDEX idx_licitacao_pecas_licitacao_id ON public.licitacao_pecas(licitacao_id);
CREATE INDEX idx_licitacao_pecas_cliente_id ON public.licitacao_pecas(cliente_id);

-- Create trigger for updated_at
CREATE TRIGGER update_licitacao_pecas_updated_at
  BEFORE UPDATE ON public.licitacao_pecas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_licitacao_pecas
  AFTER INSERT OR UPDATE OR DELETE ON public.licitacao_pecas
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();