-- Create table to track client onboarding progress
CREATE TABLE public.cliente_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  etapa_atual integer NOT NULL DEFAULT 1,
  etapas_concluidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  dados_coletados jsonb DEFAULT '{}'::jsonb,
  iniciado_por uuid REFERENCES public.profiles(id),
  iniciado_em timestamp with time zone NOT NULL DEFAULT now(),
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(cliente_id)
);

-- Enable RLS
ALTER TABLE public.cliente_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all onboarding" 
ON public.cliente_onboarding 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view onboarding" 
ON public.cliente_onboarding 
FOR SELECT 
USING (has_role(auth.uid(), 'gerente'::app_role));

-- Update trigger
CREATE TRIGGER update_cliente_onboarding_updated_at
BEFORE UPDATE ON public.cliente_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();