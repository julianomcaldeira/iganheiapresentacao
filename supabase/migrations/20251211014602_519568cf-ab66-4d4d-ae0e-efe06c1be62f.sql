-- Add logo and keywords columns to clientes table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS palavras_positivas text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS palavras_negativas text[] DEFAULT '{}';

-- Create empresas table (companies linked to clients)
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  inscricao_estadual text,
  inscricao_municipal text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  telefone text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- RLS policies for empresas
CREATE POLICY "Admins can manage all empresas"
ON public.empresas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all empresas"
ON public.empresas
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view empresas of their client"
ON public.empresas
FOR SELECT
USING (
  cliente_id IN (
    SELECT cliente_id FROM profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();