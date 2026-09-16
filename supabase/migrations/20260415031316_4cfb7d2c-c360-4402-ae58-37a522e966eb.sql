
CREATE TABLE public.pendencias_kanban_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  descricao text,
  secao text NOT NULL DEFAULT 'geral',
  icone text DEFAULT 'search',
  cor text DEFAULT 'blue',
  fonte_dados text NOT NULL DEFAULT 'licitacoes',
  filtro_status text,
  filtro_campo text,
  filtro_valor text,
  filtro_periodo_dias integer,
  filtro_responsavel_atual boolean DEFAULT false,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.pendencias_kanban_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kanban config for their client" ON public.pendencias_kanban_config
  FOR SELECT TO authenticated
  USING (
    cliente_id IN (SELECT cliente_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage kanban config" ON public.pendencias_kanban_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pendencias_kanban_config_updated_at BEFORE UPDATE ON public.pendencias_kanban_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
