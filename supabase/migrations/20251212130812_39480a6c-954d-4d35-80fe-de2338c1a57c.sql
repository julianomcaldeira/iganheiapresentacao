-- Add terceirizacao and token fields to clientes table
ALTER TABLE public.clientes 
ADD COLUMN terceirizacao boolean NOT NULL DEFAULT false,
ADD COLUMN token text NULL;