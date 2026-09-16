-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id UUID,
  acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
  dados_antigos JSONB,
  dados_novos JSONB,
  user_id UUID,
  user_email TEXT,
  cliente_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (using service role)
CREATE POLICY "System can insert audit_logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_audit_logs_tabela ON public.audit_logs(tabela);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_acao ON public.audit_logs(acao);
CREATE INDEX idx_audit_logs_cliente_id ON public.audit_logs(cliente_id);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  record_id UUID;
  cliente_id_value UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    record_id := OLD.id;
    cliente_id_value := CASE WHEN OLD ? 'cliente_id' THEN (OLD.cliente_id)::UUID ELSE NULL END;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    record_id := NEW.id;
    cliente_id_value := CASE WHEN NEW ? 'cliente_id' THEN (NEW.cliente_id)::UUID ELSE NULL END;
  ELSIF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
    record_id := NEW.id;
    cliente_id_value := CASE WHEN NEW ? 'cliente_id' THEN (NEW.cliente_id)::UUID ELSE NULL END;
  END IF;

  INSERT INTO public.audit_logs (
    tabela,
    registro_id,
    acao,
    dados_antigos,
    dados_novos,
    user_id,
    cliente_id
  ) VALUES (
    TG_TABLE_NAME,
    record_id,
    TG_OP,
    old_data,
    new_data,
    auth.uid(),
    cliente_id_value
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers to all relevant tables
CREATE TRIGGER audit_clientes
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_produtos
  AFTER INSERT OR UPDATE OR DELETE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_tarefas
  AFTER INSERT OR UPDATE OR DELETE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_perfis_acesso
  AFTER INSERT OR UPDATE OR DELETE ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_perfil_permissoes
  AFTER INSERT OR UPDATE OR DELETE ON public.perfil_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_dashboard_widgets
  AFTER INSERT OR UPDATE OR DELETE ON public.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_ia_prompts
  AFTER INSERT OR UPDATE OR DELETE ON public.ia_prompts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_ia_conhecimento
  AFTER INSERT OR UPDATE OR DELETE ON public.ia_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_importacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.importacoes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();