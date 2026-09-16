
-- Helper: returns the cliente_id for a given user without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_cliente_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM public.profiles WHERE id = _user_id
$$;

-- ===== profiles =====
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

CREATE POLICY "Managers can view profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gerente'::app_role)
  AND cliente_id IS NOT NULL
  AND cliente_id = public.get_user_cliente_id(auth.uid())
);

-- ===== clientes =====
DROP POLICY IF EXISTS "Managers can view all clients" ON public.clientes;

CREATE POLICY "Managers can view their assigned client"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gerente'::app_role)
  AND id = public.get_user_cliente_id(auth.uid())
);

-- ===== tarefas =====
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON public.tarefas;
DROP POLICY IF EXISTS "Users can update their own tasks or assigned tasks" ON public.tarefas;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tarefas;

CREATE POLICY "Users can view tasks in their organization"
ON public.tarefas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (cliente_id IS NULL OR cliente_id = public.get_user_cliente_id(auth.uid()))
    AND (
      auth.uid() = responsavel_id
      OR auth.uid() = criado_por
      OR auth.uid() = ANY (responsaveis_ids)
      OR (has_role(auth.uid(), 'gerente'::app_role) AND cliente_id = public.get_user_cliente_id(auth.uid()))
    )
  )
);

CREATE POLICY "Users can update tasks in their organization"
ON public.tarefas
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (cliente_id IS NULL OR cliente_id = public.get_user_cliente_id(auth.uid()))
    AND (
      auth.uid() = responsavel_id
      OR auth.uid() = criado_por
      OR auth.uid() = ANY (responsaveis_ids)
    )
  )
);

CREATE POLICY "Admins or creators can delete tasks in their organization"
ON public.tarefas
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    auth.uid() = criado_por
    AND (cliente_id IS NULL OR cliente_id = public.get_user_cliente_id(auth.uid()))
  )
);
