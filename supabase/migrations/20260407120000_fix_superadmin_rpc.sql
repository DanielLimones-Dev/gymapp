-- Fix: RPC guardar_config_ia acepta superadmin por ID hardcodeado además de por rol
-- Y asegura que el perfil del superadmin tenga rol = 'superadmin'

-- 1. Actualizar rol en perfiles
UPDATE perfiles
SET rol = 'superadmin'
WHERE id = '7d381a03-17b2-4bbe-83a2-ab5c9a4f2fc7';

-- 2. Recrear RPC con verificación por ID hardcodeado además del rol
CREATE OR REPLACE FUNCTION guardar_config_ia(p_filas JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el llamante es superadmin (por rol O por ID hardcodeado)
  IF auth.uid() <> '7d381a03-17b2-4bbe-83a2-ab5c9a4f2fc7'
    AND NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin')
  THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO configuracion_ia (clave, valor, actualizado_en)
  SELECT
    elem->>'clave',
    elem->>'valor',
    (elem->>'actualizado_en')::TIMESTAMPTZ
  FROM jsonb_array_elements(p_filas) AS elem
  ON CONFLICT (clave) DO UPDATE
    SET valor          = EXCLUDED.valor,
        actualizado_en = EXCLUDED.actualizado_en;
END;
$$;
