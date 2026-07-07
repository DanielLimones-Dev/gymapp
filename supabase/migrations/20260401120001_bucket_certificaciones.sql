-- Bucket público para certificaciones de coaches
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificaciones', 'certificaciones', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: coach sube sus archivos
CREATE POLICY "coach sube certificaciones"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certificaciones' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: cualquiera puede ver (bucket público)
CREATE POLICY "certificaciones publicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificaciones');

-- Policy: coach borra las suyas
CREATE POLICY "coach borra certificaciones"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'certificaciones' AND auth.uid()::text = (storage.foldername(name))[1]);
