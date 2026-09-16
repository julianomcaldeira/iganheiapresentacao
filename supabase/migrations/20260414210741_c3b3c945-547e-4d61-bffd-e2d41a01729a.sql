-- Add new step codes to the enum
ALTER TYPE public.etapa_licitacao_codigo ADD VALUE IF NOT EXISTS 'concorrentes';
ALTER TYPE public.etapa_licitacao_codigo ADD VALUE IF NOT EXISTS 'produtos';
ALTER TYPE public.etapa_licitacao_codigo ADD VALUE IF NOT EXISTS 'tarefas';
ALTER TYPE public.etapa_licitacao_codigo ADD VALUE IF NOT EXISTS 'contratos';
ALTER TYPE public.etapa_licitacao_codigo ADD VALUE IF NOT EXISTS 'empenhos';
ALTER TYPE public.etapa_licitacao_codigo ADD VALUE IF NOT EXISTS 'impugnacao_contrarrazao';

-- Add new status values
ALTER TYPE public.etapa_licitacao_status ADD VALUE IF NOT EXISTS 'nao_iniciada';
ALTER TYPE public.etapa_licitacao_status ADD VALUE IF NOT EXISTS 'em_andamento';