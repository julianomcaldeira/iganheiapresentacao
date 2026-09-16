-- Create storage bucket for rule attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('regras-anexos', 'regras-anexos', true);

-- Create storage policies for regras-anexos bucket
CREATE POLICY "Admins can upload rule attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'regras-anexos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update rule attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'regras-anexos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete rule attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'regras-anexos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view rule attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'regras-anexos');

-- Add anexo columns to cliente_regras table
ALTER TABLE public.cliente_regras
ADD COLUMN anexo_url TEXT,
ADD COLUMN anexo_nome TEXT;