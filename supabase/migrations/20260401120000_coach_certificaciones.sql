-- Tabla de certificaciones del coach (archivos/imágenes)
CREATE TABLE IF NOT EXISTS coach_certificaciones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre      TEXT NOT NULL,
  url         TEXT NOT NULL,
  creado_en   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cert_coach ON coach_certificaciones(coach_id);

ALTER TABLE coach_certificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach gestiona sus certificaciones"
  ON coach_certificaciones FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "clientes ven certificaciones de su coach"
  ON coach_certificaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND coach_id = coach_certificaciones.coach_id
    )
  );

-- Bucket certificaciones (ejecutar desde dashboard si el CLI no lo soporta)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificaciones', 'certificaciones', true)
-- ON CONFLICT (id) DO NOTHING;
