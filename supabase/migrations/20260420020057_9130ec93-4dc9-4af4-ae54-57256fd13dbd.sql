ALTER TABLE public.pendencias_kanban_config 
  ADD COLUMN IF NOT EXISTS filtro_data_inicio_offset_dias INTEGER,
  ADD COLUMN IF NOT EXISTS filtro_data_fim_offset_dias INTEGER,
  ADD COLUMN IF NOT EXISTS filtro_data_campo TEXT DEFAULT 'data_abertura';

UPDATE public.pendencias_kanban_config SET secao = 'licitacoes' WHERE secao = 'avisos';