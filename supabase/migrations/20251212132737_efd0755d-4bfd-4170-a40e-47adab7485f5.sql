-- Create table for competitor participation history
CREATE TABLE public.licitacao_concorrentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_concorrente TEXT NOT NULL,
  participou BOOLEAN NOT NULL DEFAULT true,
  ganhou BOOLEAN DEFAULT false,
  valor_proposta NUMERIC DEFAULT NULL,
  observacoes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.licitacao_concorrentes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all competitor records"
ON public.licitacao_concorrentes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all competitor records"
ON public.licitacao_concorrentes
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client competitor records"
ON public.licitacao_concorrentes
FOR ALL
USING (cliente_id IN (
  SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_licitacao_concorrentes_cliente ON public.licitacao_concorrentes(cliente_id);
CREATE INDEX idx_licitacao_concorrentes_nome ON public.licitacao_concorrentes(nome_concorrente);

-- Trigger for updated_at
CREATE TRIGGER update_licitacao_concorrentes_updated_at
BEFORE UPDATE ON public.licitacao_concorrentes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();