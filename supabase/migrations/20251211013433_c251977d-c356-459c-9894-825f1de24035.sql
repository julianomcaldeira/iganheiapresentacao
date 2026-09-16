-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clientes;

-- Create separate policies for each operation
CREATE POLICY "Admins can view all clients"
ON public.clientes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert clients"
ON public.clientes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update clients"
ON public.clientes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clients"
ON public.clientes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create tasks table
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  data_vencimento TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  criado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Policies for tarefas
CREATE POLICY "Users can view tasks assigned to them"
ON public.tarefas
FOR SELECT
USING (
  auth.uid() = responsavel_id OR 
  auth.uid() = criado_por OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'gerente'::app_role)
);

CREATE POLICY "Users can create tasks"
ON public.tarefas
FOR INSERT
WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Users can update their own tasks or assigned tasks"
ON public.tarefas
FOR UPDATE
USING (
  auth.uid() = responsavel_id OR 
  auth.uid() = criado_por OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete tasks"
ON public.tarefas
FOR DELETE
USING (
  auth.uid() = criado_por OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create imports history table
CREATE TABLE public.importacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  total_registros INTEGER DEFAULT 0,
  registros_sucesso INTEGER DEFAULT 0,
  registros_erro INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro', 'cancelado')),
  erros JSONB,
  importado_por UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

-- Policies for importacoes
CREATE POLICY "Admins can manage imports"
ON public.importacoes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));