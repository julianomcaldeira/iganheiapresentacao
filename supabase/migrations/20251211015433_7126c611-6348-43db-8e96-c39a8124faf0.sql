-- Create table to store dashboard configurations per client
CREATE TABLE public.dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  data_source TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'small',
  position INTEGER NOT NULL DEFAULT 0,
  navigation_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all dashboard widgets"
ON public.dashboard_widgets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view dashboard widgets"
ON public.dashboard_widgets
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their client dashboard widgets"
ON public.dashboard_widgets
FOR SELECT
USING (cliente_id IN (
  SELECT profiles.cliente_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_widgets_updated_at
BEFORE UPDATE ON public.dashboard_widgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();