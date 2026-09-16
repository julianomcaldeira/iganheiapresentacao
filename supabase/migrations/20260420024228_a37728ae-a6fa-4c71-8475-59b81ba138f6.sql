CREATE TABLE public.licitacao_monitoramento_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL DEFAULT 'sistema',
  autor_nome TEXT,
  mensagem TEXT NOT NULL,
  data_mensagem TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  origem TEXT NOT NULL DEFAULT 'portal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lic_monit_licitacao ON public.licitacao_monitoramento_mensagens(licitacao_id);
CREATE INDEX idx_lic_monit_data ON public.licitacao_monitoramento_mensagens(licitacao_id, data_mensagem DESC);

ALTER TABLE public.licitacao_monitoramento_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all monitoring messages"
ON public.licitacao_monitoramento_mensagens
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers view all monitoring messages"
ON public.licitacao_monitoramento_mensagens
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users view their client monitoring messages"
ON public.licitacao_monitoramento_mensagens
FOR SELECT
USING (
  licitacao_id IN (
    SELECT l.id FROM public.licitacoes l
    WHERE l.cliente_id IN (
      SELECT profiles.cliente_id FROM public.profiles WHERE profiles.id = auth.uid()
    )
  )
);

CREATE POLICY "Service role full access monitoring"
ON public.licitacao_monitoramento_mensagens
FOR ALL
TO service_role
USING (true) WITH CHECK (true);