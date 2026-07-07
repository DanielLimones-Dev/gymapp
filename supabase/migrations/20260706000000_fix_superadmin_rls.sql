-- Reemplazar superadmin por email hardcodeado con verificación por rol
-- La policy actual usa: auth.jwt() ->> 'email' = 'daniel@live.com'
-- La nueva policy usa: auth.uid() contra perfiles.rol = 'superadmin'

-- 1. Eliminar policy antigua (nombre exacto del schema original)
DROP POLICY IF EXISTS "perfiles_admin_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_superadmin_all" ON public.perfiles;

-- 2. Crear policy nueva basada en rol
CREATE POLICY "perfiles_superadmin_all" ON public.perfiles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'superadmin')
  );

-- 3. Asegurar que el perfil del superadmin tenga rol correcto (por si acaso)
-- Reemplazar con el UUID real de tu usuario
-- UPDATE public.perfiles SET rol = 'superadmin' WHERE email = 'daniel@live.com';

-- 4. Verificar que el RPC guardar_config_ia ya usa rol (migración 20260407120000)
