-- Add cliente_id to profiles first
ALTER TABLE public.profiles ADD COLUMN cliente_id UUID;

-- Create clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Policies for clientes
CREATE POLICY "Admins can manage all clients"
ON public.clientes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all clients"
ON public.clientes
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their assigned client"
ON public.clientes
FOR SELECT
USING (
  id IN (
    SELECT cliente_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();