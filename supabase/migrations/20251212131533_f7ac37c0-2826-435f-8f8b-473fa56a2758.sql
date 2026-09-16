-- Add concorrentes field to clientes table
ALTER TABLE public.clientes 
ADD COLUMN concorrentes text[] DEFAULT '{}'::text[];