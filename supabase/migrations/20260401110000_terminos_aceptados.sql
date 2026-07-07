-- Tabla de evidencia de aceptación de Términos y Condiciones
CREATE TABLE IF NOT EXISTS terminos_aceptados (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version      TEXT NOT NULL DEFAULT '1.0',
  plataforma   TEXT,                          -- 'ios' | 'android'
  aceptado_en  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS idx_terminos_usuario ON terminos_aceptados(usuario_id);

-- RLS
ALTER TABLE terminos_aceptados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario inserta sus propios terminos"
  ON terminos_aceptados FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "usuario ve sus propios terminos"
  ON terminos_aceptados FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "superadmin ve todos los terminos"
  ON terminos_aceptados FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin')
  );
