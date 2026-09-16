ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS licitacao_id UUID REFERENCES public.licitacoes(id) ON DELETE SET NULL;