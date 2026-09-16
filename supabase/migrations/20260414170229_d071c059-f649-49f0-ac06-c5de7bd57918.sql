CREATE TABLE public.licitacao_mensagens_internas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  mencoes UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_licitacao_mensagens_internas_licitacao ON public.licitacao_mensagens_internas(licitacao_id);
CREATE INDEX idx_licitacao_mensagens_internas_autor ON public.licitacao_mensagens_internas(autor_id);

ALTER TABLE public.licitacao_mensagens_internas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all internal messages"
ON public.licitacao_mensagens_internas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all internal messages"
ON public.licitacao_mensagens_internas
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their client internal messages"
ON public.licitacao_mensagens_internas
FOR SELECT
USING (
  licitacao_id IN (
    SELECT l.id FROM licitacoes l
    WHERE l.cliente_id IN (
      SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create internal messages for their client"
ON public.licitacao_mensagens_internas
FOR INSERT
WITH CHECK (
  auth.uid() = autor_id
  AND licitacao_id IN (
    SELECT l.id FROM licitacoes l
    WHERE l.cliente_id IN (
      SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own messages"
ON public.licitacao_mensagens_internas
FOR DELETE
USING (auth.uid() = autor_id);

CREATE TRIGGER update_licitacao_mensagens_internas_updated_at
  BEFORE UPDATE ON public.licitacao_mensagens_internas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.licitacao_mensagens_internas;