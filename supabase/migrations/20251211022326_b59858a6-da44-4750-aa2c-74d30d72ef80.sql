-- Create table for AI prompts per client
CREATE TABLE public.ia_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('analise_edital', 'robo_lances', 'monitor_pregao', 'pecas_impugnacao', 'pecas_recurso', 'pecas_contrarrazoes', 'pecas_esclarecimento')),
  nome TEXT NOT NULL,
  descricao TEXT,
  prompt_sistema TEXT NOT NULL,
  prompt_usuario TEXT,
  modelo TEXT DEFAULT 'google/gemini-2.5-flash',
  temperatura DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(cliente_id, tipo, nome)
);

-- Create table for AI knowledge base
CREATE TABLE public.ia_conhecimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  assunto TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  fonte TEXT,
  tags TEXT[],
  relevancia INTEGER DEFAULT 0,
  uso_count INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for AI execution history
CREATE TABLE public.ia_execucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES public.ia_prompts(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  entrada TEXT NOT NULL,
  saida TEXT,
  tokens_entrada INTEGER,
  tokens_saida INTEGER,
  tempo_execucao_ms INTEGER,
  sucesso BOOLEAN DEFAULT true,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ia_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_execucoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for ia_prompts
CREATE POLICY "Admins can manage all ia_prompts"
ON public.ia_prompts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view ia_prompts"
ON public.ia_prompts FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their client ia_prompts"
ON public.ia_prompts FOR SELECT
USING (cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS policies for ia_conhecimento (global or per client)
CREATE POLICY "Admins can manage all ia_conhecimento"
ON public.ia_conhecimento FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view ia_conhecimento"
ON public.ia_conhecimento FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view global or their client ia_conhecimento"
ON public.ia_conhecimento FOR SELECT
USING (
  cliente_id IS NULL OR 
  cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid())
);

-- RLS policies for ia_execucoes
CREATE POLICY "Admins can view all ia_execucoes"
ON public.ia_execucoes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert ia_execucoes"
ON public.ia_execucoes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their client ia_execucoes"
ON public.ia_execucoes FOR SELECT
USING (cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert ia_execucoes for their client"
ON public.ia_execucoes FOR INSERT
WITH CHECK (cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_ia_prompts_updated_at
BEFORE UPDATE ON public.ia_prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ia_conhecimento_updated_at
BEFORE UPDATE ON public.ia_conhecimento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_ia_prompts_cliente_tipo ON public.ia_prompts(cliente_id, tipo);
CREATE INDEX idx_ia_conhecimento_cliente ON public.ia_conhecimento(cliente_id);
CREATE INDEX idx_ia_conhecimento_categoria ON public.ia_conhecimento(categoria);
CREATE INDEX idx_ia_conhecimento_tags ON public.ia_conhecimento USING GIN(tags);
CREATE INDEX idx_ia_execucoes_cliente ON public.ia_execucoes(cliente_id);
CREATE INDEX idx_ia_execucoes_tipo ON public.ia_execucoes(tipo);