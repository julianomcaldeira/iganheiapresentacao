-- Reordena a esteira padrão: Análise IA -> Aprovações -> Peças Jurídicas
-- (etapa esclarecimento_impugnacao passa a ser exibida como "Peças Jurídicas").
-- Apenas atualiza a coluna `ordem`; nenhum dado, status ou execução é alterado.
-- Etapas personalizadas (custom_*) mantêm sua ordem atual.

UPDATE public.licitacao_etapas_config
SET ordem = CASE etapa_codigo
  WHEN 'analise_edital' THEN 0
  WHEN 'aprovacoes' THEN 1
  WHEN 'esclarecimento_impugnacao' THEN 2
  WHEN 'impugnacao_contrarrazao' THEN 3
  WHEN 'concorrentes' THEN 4
  WHEN 'preparacao_documentos' THEN 5
  WHEN 'produtos' THEN 6
  WHEN 'proposta' THEN 7
  WHEN 'tarefas' THEN 8
  WHEN 'disputa_pregao' THEN 9
  WHEN 'resultado' THEN 10
  WHEN 'contratos' THEN 11
  WHEN 'empenhos' THEN 12
  ELSE ordem
END
WHERE etapa_codigo IN (
  'analise_edital',
  'aprovacoes',
  'esclarecimento_impugnacao',
  'impugnacao_contrarrazao',
  'concorrentes',
  'preparacao_documentos',
  'produtos',
  'proposta',
  'tarefas',
  'disputa_pregao',
  'resultado',
  'contratos',
  'empenhos'
);
