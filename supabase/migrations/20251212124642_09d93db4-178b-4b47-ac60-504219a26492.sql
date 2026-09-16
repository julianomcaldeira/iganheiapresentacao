-- Create table for AI analysis history
CREATE TABLE public.licitacao_analises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  arquivo_nome TEXT,
  arquivo_url TEXT,
  arquivos_analisados TEXT[] DEFAULT '{}',
  resultado JSONB,
  status TEXT NOT NULL DEFAULT 'processando',
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.licitacao_analises ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all analyses"
ON public.licitacao_analises
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all analyses"
ON public.licitacao_analises
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can manage their client analyses"
ON public.licitacao_analises
FOR ALL
USING (
  licitacao_id IN (
    SELECT l.id FROM licitacoes l
    WHERE l.cliente_id IN (
      SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
);

-- Create storage bucket for edital files
INSERT INTO storage.buckets (id, name, public) VALUES ('editais', 'editais', false);

-- Storage policies for editais bucket
CREATE POLICY "Authenticated users can upload editais"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'editais' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view editais"
ON storage.objects
FOR SELECT
USING (bucket_id = 'editais' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete editais"
ON storage.objects
FOR DELETE
USING (bucket_id = 'editais' AND has_role(auth.uid(), 'admin'::app_role));