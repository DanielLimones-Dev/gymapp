-- Permite que cualquier usuario autenticado reclame un código no usado.
-- USING: el código debe estar libre (unused + sin cliente)
-- WITH CHECK: el usuario solo puede asignarse a sí mismo y marcar como usado
create policy "cliente_puede_reclamar_codigo"
on "public"."codigos_invitacion"
as permissive
for update
to authenticated
using (usado = false and cliente_id is null)
with check (cliente_id = auth.uid() and usado = true);
