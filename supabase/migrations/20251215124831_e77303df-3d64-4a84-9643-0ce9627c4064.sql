-- Create table for client-specific rules
CREATE TABLE public.cliente_regras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cliente_regras ENABLE ROW LEVEL SECURITY;

-- Admins can manage all rules
CREATE POLICY "Admins can manage all client rules"
ON public.cliente_regras
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view all rules
CREATE POLICY "Managers can view all client rules"
ON public.cliente_regras
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

-- Users can view their client rules
CREATE POLICY "Users can view their client rules"
ON public.cliente_regras
FOR SELECT
USING (cliente_id IN (
  SELECT profiles.cliente_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_cliente_regras_updated_at
BEFORE UPDATE ON public.cliente_regras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger
CREATE TRIGGER audit_cliente_regras
AFTER INSERT OR UPDATE OR DELETE ON public.cliente_regras
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_function();