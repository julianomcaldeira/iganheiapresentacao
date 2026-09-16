
-- Add admin full access to licitacao_fluxo_aprovacao
CREATE POLICY "Admins can manage all approval flows"
ON public.licitacao_fluxo_aprovacao
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
