
CREATE TABLE public.cliente_aprovacao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  nome_etapa TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  aprovador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cliente_aprovacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval config for their client"
ON public.cliente_aprovacao_config FOR SELECT TO authenticated
USING (
  cliente_id IN (
    SELECT p.cliente_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can insert approval config for their client"
ON public.cliente_aprovacao_config FOR INSERT TO authenticated
WITH CHECK (
  cliente_id IN (
    SELECT p.cliente_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can update approval config for their client"
ON public.cliente_aprovacao_config FOR UPDATE TO authenticated
USING (
  cliente_id IN (
    SELECT p.cliente_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete approval config for their client"
ON public.cliente_aprovacao_config FOR DELETE TO authenticated
USING (
  cliente_id IN (
    SELECT p.cliente_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);
