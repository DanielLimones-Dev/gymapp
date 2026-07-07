-- Tabla genérica para datos de usuario que antes solo vivían en AsyncStorage
-- Almacena: metricas, salud, historial_sesiones como arrays JSONB
CREATE TABLE IF NOT EXISTS datos_usuario (
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,
  datos      JSONB NOT NULL DEFAULT '[]',
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (usuario_id, tipo)
);

ALTER TABLE datos_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario accede a sus propios datos"
  ON datos_usuario FOR ALL
  USING (auth.uid() = usuario_id);
