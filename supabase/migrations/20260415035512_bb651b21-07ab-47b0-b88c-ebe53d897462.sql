
-- Config table for i-Documentei integration per client
CREATE TABLE public.idocumentei_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cliente_id)
);

ALTER TABLE public.idocumentei_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all idocumentei config" ON public.idocumentei_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their client idocumentei config" ON public.idocumentei_config FOR SELECT USING (cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()));

-- Mapping between local empresas and i-Documentei IDs
CREATE TABLE public.idocumentei_empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  idocumentei_id TEXT NOT NULL,
  status_sync TEXT NOT NULL DEFAULT 'pendente',
  ultimo_processamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id),
  UNIQUE(idocumentei_id)
);

ALTER TABLE public.idocumentei_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all idocumentei empresas" ON public.idocumentei_empresas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their idocumentei empresas" ON public.idocumentei_empresas FOR SELECT USING (
  empresa_id IN (
    SELECT e.id FROM empresas e
    WHERE e.cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid())
  )
);

-- Documents/CNDs from i-Documentei
CREATE TABLE public.idocumentei_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  idocumentei_empresa_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_emissao TIMESTAMP WITH TIME ZONE,
  data_validade TIMESTAMP WITH TIME ZONE,
  arquivo_url TEXT,
  dados_raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.idocumentei_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all idocumentei docs" ON public.idocumentei_documentos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view all idocumentei docs" ON public.idocumentei_documentos FOR SELECT USING (has_role(auth.uid(), 'gerente'::app_role));
CREATE POLICY "Users can view their idocumentei docs" ON public.idocumentei_documentos FOR SELECT USING (
  empresa_id IN (
    SELECT e.id FROM empresas e
    WHERE e.cliente_id IN (SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid())
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_idocumentei_config_updated_at BEFORE UPDATE ON public.idocumentei_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_idocumentei_empresas_updated_at BEFORE UPDATE ON public.idocumentei_empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_idocumentei_documentos_updated_at BEFORE UPDATE ON public.idocumentei_documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_idocumentei_documentos_empresa ON public.idocumentei_documentos(empresa_id);
CREATE INDEX idx_idocumentei_documentos_tipo ON public.idocumentei_documentos(tipo);
CREATE INDEX idx_idocumentei_documentos_validade ON public.idocumentei_documentos(data_validade);
