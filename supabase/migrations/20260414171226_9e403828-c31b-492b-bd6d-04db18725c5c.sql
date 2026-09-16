
CREATE TABLE public.licitacao_fluxo_aprovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licitacao_id UUID REFERENCES public.licitacoes(id) ON DELETE CASCADE NOT NULL,
  nome_etapa TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  aprovador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  comentario TEXT,
  data_resposta TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.licitacao_fluxo_aprovacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval flows for their client bids"
ON public.licitacao_fluxo_aprovacao FOR SELECT TO authenticated
USING (
  licitacao_id IN (
    SELECT l.id FROM public.licitacoes l
    INNER JOIN public.profiles p ON p.cliente_id = l.cliente_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can create approval flows for their client bids"
ON public.licitacao_fluxo_aprovacao FOR INSERT TO authenticated
WITH CHECK (
  licitacao_id IN (
    SELECT l.id FROM public.licitacoes l
    INNER JOIN public.profiles p ON p.cliente_id = l.cliente_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can update approval flows for their client bids"
ON public.licitacao_fluxo_aprovacao FOR UPDATE TO authenticated
USING (
  licitacao_id IN (
    SELECT l.id FROM public.licitacoes l
    INNER JOIN public.profiles p ON p.cliente_id = l.cliente_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete approval flows for their client bids"
ON public.licitacao_fluxo_aprovacao FOR DELETE TO authenticated
USING (
  licitacao_id IN (
    SELECT l.id FROM public.licitacoes l
    INNER JOIN public.profiles p ON p.cliente_id = l.cliente_id
    WHERE p.id = auth.uid()
  )
);
