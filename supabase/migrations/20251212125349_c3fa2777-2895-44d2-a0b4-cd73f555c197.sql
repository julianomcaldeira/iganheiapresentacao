-- Create table for edital chat history
CREATE TABLE public.licitacao_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  resposta TEXT,
  favorita BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'processando',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.licitacao_chat ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all chat"
ON public.licitacao_chat
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all chat"
ON public.licitacao_chat
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client chat"
ON public.licitacao_chat
FOR ALL
USING (
  licitacao_id IN (
    SELECT l.id FROM licitacoes l
    WHERE l.cliente_id IN (
      SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
);