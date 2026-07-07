-- Fix: infinite recursion en perfiles_superadmin_all
-- La policy anterior consultaba perfiles dentro de una policy de perfiles → loop infinito
-- Solución: función SECURITY DEFINER que bypasea RLS

-- 1. Crear función helper (bypasea RLS porque es SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'superadmin');
$$;

-- 2. Reemplazar policy con la versión corregida
DROP POLICY IF EXISTS "perfiles_superadmin_all" ON public.perfiles;

CREATE POLICY "perfiles_superadmin_all" ON public.perfiles
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
