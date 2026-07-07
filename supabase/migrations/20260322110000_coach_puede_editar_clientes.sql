-- Permite al coach actualizar el perfil de sus propios clientes
create policy "coach_edita_sus_clientes"
on "public"."perfiles"
as permissive
for update
to authenticated
using (coach_id = auth.uid())
with check (coach_id = auth.uid());
