ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS responsaveis_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_tarefas_responsaveis_ids
  ON public.tarefas USING GIN (responsaveis_ids);

-- Permitir que qualquer um dos responsáveis (lista) possa ver e atualizar
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON public.tarefas;
CREATE POLICY "Users can view tasks assigned to them"
ON public.tarefas FOR SELECT
USING (
  auth.uid() = responsavel_id
  OR auth.uid() = criado_por
  OR auth.uid() = ANY (responsaveis_ids)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerente'::app_role)
);

DROP POLICY IF EXISTS "Users can update their own tasks or assigned tasks" ON public.tarefas;
CREATE POLICY "Users can update their own tasks or assigned tasks"
ON public.tarefas FOR UPDATE
USING (
  auth.uid() = responsavel_id
  OR auth.uid() = criado_por
  OR auth.uid() = ANY (responsaveis_ids)
  OR has_role(auth.uid(), 'admin'::app_role)
);