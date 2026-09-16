
ALTER TABLE public.produtos ADD COLUMN imagem_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('produtos-imagens', 'produtos-imagens', true);

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'produtos-imagens');

CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos-imagens');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'produtos-imagens');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'produtos-imagens');
