
-- 1. audit_logs: restrict INSERT
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert their own audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 2. integracao_mensageria: restrict SELECT to admin/manager
DROP POLICY IF EXISTS "Users can view their client integrations" ON public.integracao_mensageria;
CREATE POLICY "Admins and managers can view integrations"
ON public.integracao_mensageria FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'gerente'::app_role) AND cliente_id = get_user_cliente_id(auth.uid()))
);

-- 3. conlicitacao_config: restrict SELECT to admin/manager (contains token)
DROP POLICY IF EXISTS "Users can view their client conlicitacao config" ON public.conlicitacao_config;
CREATE POLICY "Admins and managers can view conlicitacao config"
ON public.conlicitacao_config FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'gerente'::app_role) AND cliente_id = get_user_cliente_id(auth.uid()))
);

-- 4. importacoes: add user-scoped SELECT
CREATE POLICY "Users can view their own imports"
ON public.importacoes FOR SELECT TO authenticated
USING (importado_por = auth.uid());

-- 5. cliente_onboarding: add user-scoped SELECT
CREATE POLICY "Users can view their client onboarding"
ON public.cliente_onboarding FOR SELECT TO authenticated
USING (cliente_id = get_user_cliente_id(auth.uid()));

-- 6. Storage: editais bucket — tighten by cliente_id (path) or licitacao membership
DROP POLICY IF EXISTS "Authenticated users can upload editais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view editais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update editais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete editais" ON storage.objects;

CREATE POLICY "Editais: scoped read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'editais' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.licitacoes l
      WHERE l.id::text = (storage.foldername(name))[1]
        AND l.cliente_id = get_user_cliente_id(auth.uid())
    )
  )
);

CREATE POLICY "Editais: scoped insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'editais' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.licitacoes l
      WHERE l.id::text = (storage.foldername(name))[1]
        AND l.cliente_id = get_user_cliente_id(auth.uid())
    )
  )
);

CREATE POLICY "Editais: scoped delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'editais' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
  )
);

-- 7. Storage: workflow-files bucket — restrict writes by cliente_id (first folder)
DROP POLICY IF EXISTS "Authenticated users can upload workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view workflow files" ON storage.objects;

CREATE POLICY "Workflow files: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'workflow-files');

CREATE POLICY "Workflow files: scoped insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workflow-files' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
  )
);

CREATE POLICY "Workflow files: scoped update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'workflow-files' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
  )
);

CREATE POLICY "Workflow files: scoped delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'workflow-files' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
  )
);

-- 8. Storage: produtos-imagens bucket — restrict writes by cliente_id (first folder)
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

CREATE POLICY "Product images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos-imagens');

CREATE POLICY "Product images: scoped insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'produtos-imagens' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
  )
);

CREATE POLICY "Product images: scoped update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'produtos-imagens' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
  )
);

CREATE POLICY "Product images: scoped delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'produtos-imagens' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_cliente_id(auth.uid())::text
  )
);

-- 9. realtime.messages: require authentication for channel subscriptions
DROP POLICY IF EXISTS "Authenticated users can subscribe to realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can broadcast" ON realtime.messages;
CREATE POLICY "Authenticated users can broadcast"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (true);
