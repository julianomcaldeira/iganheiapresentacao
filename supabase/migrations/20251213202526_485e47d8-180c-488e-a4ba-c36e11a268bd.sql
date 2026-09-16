-- Drop existing INSERT policy for tickets
DROP POLICY IF EXISTS "Users can create tickets for their client" ON public.tickets;

-- Create new INSERT policy that allows admins and atendentes to create for any client
CREATE POLICY "Users can create tickets"
ON public.tickets FOR INSERT
WITH CHECK (
  criado_por = auth.uid()
  AND (
    -- Admins and atendentes can create for any client
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'atendente')
    -- Regular users can only create for their own client
    OR cliente_id IN (
      SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Also add policy for atendentes to view and update tickets
DROP POLICY IF EXISTS "Users can view their own client tickets" ON public.tickets;
CREATE POLICY "Users can view tickets"
ON public.tickets FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'atendente')
  OR cliente_id IN (
    SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Atendentes and admins can update tickets" ON public.tickets;
CREATE POLICY "Users can update tickets"
ON public.tickets FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'atendente')
  OR atendente_id = auth.uid()
  OR criado_por = auth.uid()
);

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete tickets"
ON public.tickets FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));