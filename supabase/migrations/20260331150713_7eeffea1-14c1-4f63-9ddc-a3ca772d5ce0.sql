
-- Table: empresa_news_config
CREATE TABLE public.empresa_news_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
  palavras_chave text[] DEFAULT '{}',
  tipos_evento text[] DEFAULT '{"trabalhista","operacional","regulatorio","financeiro","oportunidade"}',
  cnaes_prioritarios text[] DEFAULT '{}',
  ufs_monitoradas text[] DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_news_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all news configs" ON public.empresa_news_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their empresa news config" ON public.empresa_news_config FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
);

-- Table: empresa_news_events
CREATE TABLE public.empresa_news_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cnpj text,
  razao_social text,
  tipo_evento text NOT NULL DEFAULT 'outro',
  titulo_noticia text NOT NULL,
  descricao_noticia text,
  fonte text,
  url text,
  data_publicacao timestamptz,
  score_relevancia integer NOT NULL DEFAULT 0,
  cidade text,
  uf text,
  cnae text,
  palavras_chave_encontradas text[],
  entidades_extraidas jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_news_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all news events" ON public.empresa_news_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their empresa news events" ON public.empresa_news_events FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
);

-- Table: newsletter_agendamentos
CREATE TABLE public.newsletter_agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
  ativo boolean NOT NULL DEFAULT false,
  horario_envio time NOT NULL DEFAULT '08:00',
  criado_por uuid REFERENCES auth.users(id),
  ultimo_envio_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all newsletter schedules" ON public.newsletter_agendamentos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their empresa newsletter schedules" ON public.newsletter_agendamentos FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
);

-- Table: newsletter_envios
CREATE TABLE public.newsletter_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  enviado_por uuid REFERENCES auth.users(id),
  total_destinatarios integer NOT NULL DEFAULT 0,
  total_noticias integer NOT NULL DEFAULT 0,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  enviado_em timestamptz,
  erro_mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all newsletter sends" ON public.newsletter_envios FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their empresa newsletter sends" ON public.newsletter_envios FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE cliente_id IN (SELECT cliente_id FROM profiles WHERE id = auth.uid()))
);

-- Triggers for updated_at
CREATE TRIGGER update_empresa_news_config_updated_at BEFORE UPDATE ON public.empresa_news_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_empresa_news_events_updated_at BEFORE UPDATE ON public.empresa_news_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_newsletter_agendamentos_updated_at BEFORE UPDATE ON public.newsletter_agendamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
