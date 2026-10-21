-- ============================================================
-- Migração: workflows legados + etapas config para todos os clientes
-- Objetivo: garantir que toda licitação tenha fluxo configurado,
--           tanto no sistema legado (licitacao_workflows) quanto
--           no novo (licitacao_etapas_config).
-- ============================================================

-- 1) Torna workflow_id opcional (novo modelo não depende dele)
ALTER TABLE public.licitacoes ALTER COLUMN workflow_id DROP NOT NULL;

-- 2) Cria workflow legado padrão para todo cliente que não tem nenhum
INSERT INTO public.licitacao_workflows (cliente_id, nome, descricao, ativo)
SELECT
  c.id,
  'Workflow Padrão',
  'Workflow padrão para gestão de licitações',
  true
FROM public.clientes c
WHERE c.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.licitacao_workflows w WHERE w.cliente_id = c.id
  );

-- 3) Cria as 8 etapas padrão para cada workflow criado acima
INSERT INTO public.workflow_etapas (workflow_id, nome, descricao, ordem, cor, icone, obrigatoria)
SELECT
  w.id,
  e.nome,
  e.descricao,
  e.ordem,
  e.cor,
  e.icone,
  true
FROM public.licitacao_workflows w
CROSS JOIN (VALUES
  ('Triagem',                  'Análise inicial da licitação',          1, '#3B82F6', 'circle'),
  ('Análise do Edital',        'Leitura e análise detalhada do edital', 2, '#8B5CF6', 'circle'),
  ('Preparação de Documentos', 'Preparação da documentação necessária', 3, '#F59E0B', 'circle'),
  ('Elaboração da Proposta',   'Elaboração da proposta comercial',      4, '#10B981', 'circle'),
  ('Revisão',                  'Revisão final antes do envio',          5, '#EF4444', 'circle'),
  ('Enviado',                  'Proposta enviada',                      6, '#06B6D4', 'circle'),
  ('Acompanhamento',           'Acompanhamento do resultado',           7, '#EC4899', 'circle'),
  ('Concluído',                'Processo finalizado',                   8, '#22C55E', 'circle')
) AS e(nome, descricao, ordem, cor, icone)
WHERE w.nome = 'Workflow Padrão'
  AND NOT EXISTS (
    SELECT 1 FROM public.workflow_etapas we WHERE we.workflow_id = w.id
  );

-- 4) Ativa as 7 etapas do novo modelo para todo cliente que não tem config
INSERT INTO public.licitacao_etapas_config (cliente_id, etapa_codigo, ativo, ordem)
SELECT
  c.id,
  ec.codigo,
  true,
  ec.ordem
FROM public.clientes c
CROSS JOIN (VALUES
  ('analise_edital'::public.etapa_licitacao_codigo,            1),
  ('esclarecimento_impugnacao'::public.etapa_licitacao_codigo, 2),
  ('aprovacoes'::public.etapa_licitacao_codigo,                3),
  ('preparacao_documentos'::public.etapa_licitacao_codigo,     4),
  ('proposta'::public.etapa_licitacao_codigo,                  5),
  ('resultado'::public.etapa_licitacao_codigo,                 6)
) AS ec(codigo, ordem)
WHERE c.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.licitacao_etapas_config cfg
    WHERE cfg.cliente_id = c.id AND cfg.etapa_codigo = ec.codigo
  );

-- 5) Inicializa execução de etapas para licitações existentes que não têm
SELECT public.inicializar_etapas_licitacao(l.id, l.cliente_id)
FROM public.licitacoes l
WHERE NOT EXISTS (
  SELECT 1 FROM public.licitacao_etapa_execucao ee WHERE ee.licitacao_id = l.id
);
