-- Create webhook_logs table for tracking webhook history
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  evento TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  payload JSONB,
  status_code INTEGER,
  response_body TEXT,
  sucesso BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  tempo_resposta_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all webhook logs"
ON public.webhook_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their client webhook logs"
ON public.webhook_logs
FOR SELECT
USING (cliente_id IN (
  SELECT profiles.cliente_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_webhook_logs_cliente_id ON public.webhook_logs(cliente_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);