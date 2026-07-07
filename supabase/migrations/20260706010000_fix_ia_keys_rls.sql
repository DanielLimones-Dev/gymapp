-- Separar API keys de IA a tabla restringida
-- configuracion_ia actual permite que cualquier usuario auth lea TODAS las filas (incluyendo keys)

-- 1. Crear tabla separada para keys (solo superadmin)
CREATE TABLE IF NOT EXISTS ia_keys (
  proveedor TEXT PRIMARY KEY,
  key_value TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ia_keys ENABLE ROW LEVEL SECURITY;

-- Solo superadmin puede leer/escribir keys
CREATE POLICY "ia_keys_superadmin_all" ON ia_keys
  FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin'));

-- 2. Migrar keys existentes desde configuracion_ia (si existen)
INSERT INTO ia_keys (proveedor, key_value, actualizado_en)
SELECT 
  substring(clave FROM 'ia_key_(.*)') as proveedor,
  valor,
  actualizado_en
FROM configuracion_ia
WHERE clave LIKE 'ia_key_%'
ON CONFLICT (proveedor) DO NOTHING;

-- 3. Eliminar keys de configuracion_ia (ya no deben estar accesibles públicamente)
DELETE FROM configuracion_ia WHERE clave LIKE 'ia_key_%';
