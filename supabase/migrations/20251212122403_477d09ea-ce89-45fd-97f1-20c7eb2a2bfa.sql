-- Create storage bucket for workflow files
INSERT INTO storage.buckets (id, name, public)
VALUES ('workflow-files', 'workflow-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for workflow files bucket
CREATE POLICY "Authenticated users can upload workflow files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'workflow-files');

CREATE POLICY "Authenticated users can view workflow files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'workflow-files');

CREATE POLICY "Authenticated users can update their workflow files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'workflow-files');

CREATE POLICY "Authenticated users can delete their workflow files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'workflow-files');