-- Mover push_token de perfiles a tabla separada con RLS estricta
-- Actualmente push_token está en perfiles, accesible por coaches que ven perfiles de sus clientes

-- 1. Crear tabla separada
CREATE TABLE IF NOT EXISTS push_tokens (
  user_id UUID PRIMARY KEY REFERENCES perfiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Solo el propio usuario puede leer/escribir su token
CREATE POLICY "push_tokens_self" ON push_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Migrar tokens existentes
INSERT INTO push_tokens (user_id, token, actualizado_en)
SELECT id, push_token, now()
FROM perfiles
WHERE push_token IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Eliminar dependencias de vistas y columna
DROP VIEW IF EXISTS public.vista_clientes;
DROP VIEW IF EXISTS public.vista_coaches;
ALTER TABLE perfiles DROP COLUMN IF EXISTS push_token;
