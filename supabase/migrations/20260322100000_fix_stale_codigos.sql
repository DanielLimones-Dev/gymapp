-- Fix datos rotos: códigos que quedaron como unused=false pero cuyo coach
-- ya tiene clientes enlazados (el UPDATE falló silenciosamente antes del fix RLS).
-- Marca como usado el código más antiguo sin usar por cada cliente huérfano.

UPDATE codigos_invitacion ci
SET usado = true
WHERE ci.usado = false
  AND ci.cliente_id IS NULL
  AND EXISTS (
    SELECT 1 FROM perfiles p
    WHERE p.coach_id = ci.coach_id
      AND p.rol = 'cliente'
  )
  AND ci.id IN (
    -- Solo el código más antiguo sin usar por cada coach con clientes
    SELECT DISTINCT ON (ci2.coach_id) ci2.id
    FROM codigos_invitacion ci2
    WHERE ci2.usado = false
      AND ci2.cliente_id IS NULL
    ORDER BY ci2.coach_id, ci2.creado_en ASC
  );
