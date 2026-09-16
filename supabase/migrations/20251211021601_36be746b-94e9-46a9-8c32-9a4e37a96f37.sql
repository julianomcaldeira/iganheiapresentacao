-- Create produtos table
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'produto' CHECK (tipo IN ('produto', 'servico')),
  categoria TEXT,
  unidade TEXT DEFAULT 'UN',
  preco DECIMAL(12, 2) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, codigo)
);

-- Enable RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Admins can manage all products
CREATE POLICY "Admins can manage all products"
ON public.produtos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view all products
CREATE POLICY "Managers can view all products"
ON public.produtos
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

-- Users can view products of their client
CREATE POLICY "Users can view their client products"
ON public.produtos
FOR SELECT
USING (
  cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Users can insert products for their client
CREATE POLICY "Users can insert products for their client"
ON public.produtos
FOR INSERT
WITH CHECK (
  cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Users can update products of their client
CREATE POLICY "Users can update their client products"
ON public.produtos
FOR UPDATE
USING (
  cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Users can delete products of their client
CREATE POLICY "Users can delete their client products"
ON public.produtos
FOR DELETE
USING (
  cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_produtos_cliente_id ON public.produtos(cliente_id);
CREATE INDEX idx_produtos_tipo ON public.produtos(tipo);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria);