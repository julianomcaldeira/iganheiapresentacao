-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido', 'fechado');

-- Create enum for ticket priority
CREATE TYPE public.ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Create enum for ticket category
CREATE TYPE public.ticket_categoria AS ENUM ('duvida', 'erro', 'sugestao', 'outro');

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES public.profiles(id),
  atendente_id UUID REFERENCES public.profiles(id),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria ticket_categoria NOT NULL DEFAULT 'duvida',
  prioridade ticket_prioridade NOT NULL DEFAULT 'media',
  status ticket_status NOT NULL DEFAULT 'aberto',
  resolvido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket messages table
CREATE TABLE public.ticket_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES public.profiles(id),
  conteudo TEXT NOT NULL,
  is_ia BOOLEAN NOT NULL DEFAULT false,
  is_interno BOOLEAN NOT NULL DEFAULT false,
  sugestao_ia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets
CREATE POLICY "Users can view their own client tickets"
ON public.tickets FOR SELECT
USING (
  cliente_id IN (
    SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create tickets for their client"
ON public.tickets FOR INSERT
WITH CHECK (
  criado_por = auth.uid()
  AND cliente_id IN (
    SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Atendentes and admins can update tickets"
ON public.tickets FOR UPDATE
USING (
  atendente_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR criado_por = auth.uid()
);

-- RLS Policies for ticket messages
CREATE POLICY "Users can view messages of accessible tickets"
ON public.ticket_mensagens FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE cliente_id IN (
      SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  AND (is_interno = false OR public.has_role(auth.uid(), 'admin') OR autor_id = auth.uid())
);

CREATE POLICY "Users can create messages on accessible tickets"
ON public.ticket_mensagens FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE cliente_id IN (
      SELECT cliente_id FROM public.profiles WHERE id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Add 'atendente' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'atendente';

-- Create triggers for updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_mensagens;

-- Add audit triggers
CREATE TRIGGER audit_tickets
  AFTER INSERT OR UPDATE OR DELETE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_ticket_mensagens
  AFTER INSERT OR UPDATE OR DELETE ON public.ticket_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();