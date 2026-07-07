-- Tabla de configuración IA global (gestionada por superadmin)
CREATE TABLE IF NOT EXISTS configuracion_ia (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE configuracion_ia ENABLE ROW LEVEL SECURITY;

-- Superadmin: lectura y escritura total
CREATE POLICY "superadmin_all" ON configuracion_ia
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin'));

-- Usuarios autenticados: solo lectura (necesitan el modelo y key para llamar a la IA)
CREATE POLICY "authenticated_select" ON configuracion_ia
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Valores por defecto
INSERT INTO configuracion_ia (clave, valor) VALUES
  ('ia_modelo',    'claude-sonnet-4-6'),
  ('ia_proveedor', 'anthropic')
ON CONFLICT (clave) DO NOTHING;
