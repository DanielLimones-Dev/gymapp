-- RPC para que el superadmin guarde configuracion_ia sin depender del WITH CHECK de RLS
CREATE OR REPLACE FUNCTION guardar_config_ia(p_filas JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el llamante es superadmin
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO configuracion_ia (clave, valor, actualizado_en)
  SELECT
    elem->>'clave',
    elem->>'valor',
    (elem->>'actualizado_en')::TIMESTAMPTZ
  FROM jsonb_array_elements(p_filas) AS elem
  ON CONFLICT (clave) DO UPDATE
    SET valor        = EXCLUDED.valor,
        actualizado_en = EXCLUDED.actualizado_en;
END;
$$;
