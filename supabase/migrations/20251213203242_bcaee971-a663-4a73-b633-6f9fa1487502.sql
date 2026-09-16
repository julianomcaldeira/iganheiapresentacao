-- Add fields to track Lovable corrections on tickets
ALTER TABLE public.tickets
ADD COLUMN correcao_aplicada boolean DEFAULT false,
ADD COLUMN correcao_data timestamp with time zone,
ADD COLUMN correcao_aplicada_por uuid REFERENCES public.profiles(id),
ADD COLUMN correcao_link text,
ADD COLUMN correcao_descricao text;

-- Add comment for documentation
COMMENT ON COLUMN public.tickets.correcao_aplicada IS 'Indica se uma correção foi aplicada via Lovable';
COMMENT ON COLUMN public.tickets.correcao_data IS 'Data/hora em que a correção foi aplicada';
COMMENT ON COLUMN public.tickets.correcao_aplicada_por IS 'ID do usuário que aplicou a correção';
COMMENT ON COLUMN public.tickets.correcao_link IS 'Link para o commit/versão no Lovable';
COMMENT ON COLUMN public.tickets.correcao_descricao IS 'Descrição da correção aplicada';