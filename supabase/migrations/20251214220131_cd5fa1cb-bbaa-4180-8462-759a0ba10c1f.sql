-- Adicionar coluna taskgi_id para mapeamento com TaskGI
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS taskgi_id text UNIQUE;

-- Criar índice para busca rápida por taskgi_id
CREATE INDEX IF NOT EXISTS idx_tarefas_taskgi_id ON public.tarefas(taskgi_id);

-- Habilitar realtime para tarefas (para sync bidirecional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tarefas;