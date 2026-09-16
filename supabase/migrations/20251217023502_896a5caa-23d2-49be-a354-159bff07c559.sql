-- Canais de mensagens (grupos, conversas diretas)
CREATE TABLE public.mensageria_canais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'grupo' CHECK (tipo IN ('grupo', 'direto', 'anuncio')),
  icone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Membros dos canais
CREATE TABLE public.mensageria_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canal_id UUID NOT NULL REFERENCES public.mensageria_canais(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'membro' CHECK (role IN ('admin', 'membro')),
  notificacoes_ativas BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(canal_id, user_id)
);

-- Mensagens nos canais
CREATE TABLE public.mensageria_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canal_id UUID NOT NULL REFERENCES public.mensageria_canais(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES public.profiles(id),
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'arquivo', 'imagem', 'sistema')),
  arquivo_url TEXT,
  arquivo_nome TEXT,
  editado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notificações do sistema
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'alerta', 'sucesso', 'erro')),
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Templates de email por cliente/evento
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  assunto TEXT NOT NULL,
  conteudo_html TEXT NOT NULL,
  conteudo_texto TEXT,
  evento TEXT NOT NULL,
  variaveis TEXT[] DEFAULT '{}',
  cta_texto TEXT,
  cta_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Histórico de envios de email
CREATE TABLE public.email_envios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id),
  destinatario_email TEXT NOT NULL,
  destinatario_nome TEXT,
  assunto TEXT NOT NULL,
  conteudo_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falha', 'entregue', 'aberto', 'clicado')),
  erro TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações de integração por cliente (WhatsApp, SMS)
CREATE TABLE public.integracao_mensageria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('whatsapp', 'sms', 'email')),
  provedor TEXT,
  api_key_encrypted TEXT,
  webhook_url TEXT,
  numero_telefone TEXT,
  email_remetente TEXT,
  configuracoes JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, tipo)
);

-- Enable RLS on all tables
ALTER TABLE public.mensageria_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensageria_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensageria_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integracao_mensageria ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mensageria_canais
CREATE POLICY "Admins can manage all channels" ON public.mensageria_canais FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their client channels" ON public.mensageria_canais FOR SELECT USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for mensageria_membros
CREATE POLICY "Admins can manage all members" ON public.mensageria_membros FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view members of their channels" ON public.mensageria_membros FOR SELECT USING (canal_id IN (SELECT id FROM mensageria_canais WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Users can manage their own membership" ON public.mensageria_membros FOR ALL USING (user_id = auth.uid());

-- RLS Policies for mensageria_mensagens
CREATE POLICY "Admins can manage all messages" ON public.mensageria_mensagens FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view messages in their channels" ON public.mensageria_mensagens FOR SELECT USING (canal_id IN (SELECT canal_id FROM mensageria_membros WHERE user_id = auth.uid()));
CREATE POLICY "Users can send messages to their channels" ON public.mensageria_mensagens FOR INSERT WITH CHECK (canal_id IN (SELECT canal_id FROM mensageria_membros WHERE user_id = auth.uid()));
CREATE POLICY "Users can edit their own messages" ON public.mensageria_mensagens FOR UPDATE USING (autor_id = auth.uid());

-- RLS Policies for notificacoes
CREATE POLICY "Admins can manage all notifications" ON public.notificacoes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own notifications" ON public.notificacoes FOR SELECT USING (user_id = auth.uid() OR (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()) AND user_id IS NULL));
CREATE POLICY "Users can update their own notifications" ON public.notificacoes FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage all email templates" ON public.email_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view email templates" ON public.email_templates FOR SELECT USING (has_role(auth.uid(), 'gerente'::app_role));
CREATE POLICY "Users can view their client email templates" ON public.email_templates FOR SELECT USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for email_envios
CREATE POLICY "Admins can manage all email sends" ON public.email_envios FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their client email sends" ON public.email_envios FOR SELECT USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for integracao_mensageria
CREATE POLICY "Admins can manage all integrations" ON public.integracao_mensageria FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their client integrations" ON public.integracao_mensageria FOR SELECT USING (cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()));

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensageria_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- Create triggers for updated_at
CREATE TRIGGER update_mensageria_canais_updated_at BEFORE UPDATE ON public.mensageria_canais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mensageria_mensagens_updated_at BEFORE UPDATE ON public.mensageria_mensagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_integracao_mensageria_updated_at BEFORE UPDATE ON public.integracao_mensageria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();