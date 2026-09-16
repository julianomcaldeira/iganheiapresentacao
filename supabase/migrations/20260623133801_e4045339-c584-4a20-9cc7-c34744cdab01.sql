
CREATE POLICY "Authenticated read contrato-empenho-anexos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contrato-empenho-anexos');

CREATE POLICY "Authenticated upload contrato-empenho-anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contrato-empenho-anexos');

CREATE POLICY "Authenticated update contrato-empenho-anexos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contrato-empenho-anexos');

CREATE POLICY "Authenticated delete contrato-empenho-anexos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contrato-empenho-anexos');
