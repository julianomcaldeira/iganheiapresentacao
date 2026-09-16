INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Chat files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);