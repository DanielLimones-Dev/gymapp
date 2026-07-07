-- Limpiar policies duplicadas/conflictivas

-- 1. codigos_invitacion — unificar
DROP POLICY IF EXISTS "Coach gestiona sus codigos" ON public.codigos_invitacion;
DROP POLICY IF EXISTS "coach_gestiona_sus_codigos" ON public.codigos_invitacion;
DROP POLICY IF EXISTS "codigos_coach" ON public.codigos_invitacion;
DROP POLICY IF EXISTS "Clientes ven codigos disponibles" ON public.codigos_invitacion;
DROP POLICY IF EXISTS "clientes_ven_codigos_disponibles" ON public.codigos_invitacion;

-- Policy unificada: coach ve/administra sus códigos
CREATE POLICY "codigos_coach_management" ON public.codigos_invitacion
  FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Clientes: solo ven códigos no usados (necesario para reclamar)
CREATE POLICY "codigos_cliente_select" ON public.codigos_invitacion
  FOR SELECT
  USING (usado = false);

-- 2. mensajes — unificar (identificar nombres exactos)
DROP POLICY IF EXISTS "mensajes_insert" ON public.mensajes;
DROP POLICY IF EXISTS "mensajes_select" ON public.mensajes;
DROP POLICY IF EXISTS "Usuarios pueden enviar mensajes" ON public.mensajes;
DROP POLICY IF EXISTS "Usuarios pueden leer sus mensajes" ON public.mensajes;

CREATE POLICY "mensajes_insert" ON public.mensajes
  FOR INSERT
  WITH CHECK (emisor_id = auth.uid());

CREATE POLICY "mensajes_select" ON public.mensajes
  FOR SELECT
  USING (emisor_id = auth.uid() OR receptor_id = auth.uid());
