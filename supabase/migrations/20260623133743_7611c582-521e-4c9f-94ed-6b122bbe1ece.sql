
-- Tabela única para anexos de contratos e empenhos
CREATE TABLE public.contrato_empenho_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('contrato','empenho','aditivo','apostilamento','garantia','medicao','fatura','rescisao','subcontratacao')),
  parent_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  arquivo_url TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  arquivo_tamanho BIGINT,
  arquivo_tipo TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cea_parent ON public.contrato_empenho_anexos(parent_type, parent_id);
CREATE INDEX idx_cea_cliente ON public.contrato_empenho_anexos(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_empenho_anexos TO authenticated;
GRANT ALL ON public.contrato_empenho_anexos TO service_role;

ALTER TABLE public.contrato_empenho_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all anexos" ON public.contrato_empenho_anexos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users see own client anexos" ON public.contrato_empenho_anexos
  FOR SELECT TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()));

CREATE POLICY "Users insert own client anexos" ON public.contrato_empenho_anexos
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id = public.get_user_cliente_id(auth.uid()));

CREATE POLICY "Users update own client anexos" ON public.contrato_empenho_anexos
  FOR UPDATE TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()));

CREATE POLICY "Users delete own client anexos" ON public.contrato_empenho_anexos
  FOR DELETE TO authenticated
  USING (cliente_id = public.get_user_cliente_id(auth.uid()));

CREATE TRIGGER trg_cea_updated_at
  BEFORE UPDATE ON public.contrato_empenho_anexos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
