-- Revocar policy anterior (permitía UPDATE directo con riesgo de modificar otros campos)
drop policy if exists "cliente_puede_reclamar_codigo" on "public"."codigos_invitacion";

-- RPC segura: el cliente solo puede setear usado=true y cliente_id=auth.uid()
-- SECURITY DEFINER: corre con privilegios del owner, no del caller
-- El caller no tiene acceso directo a la tabla — no puede tocar coach_id ni otros campos
create or replace function reclamar_codigo(p_codigo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update codigos_invitacion
  set usado = true, cliente_id = auth.uid()
  where codigo = p_codigo
    and usado = false
    and cliente_id is null;

  if not found then
    raise exception 'Código inválido o ya usado';
  end if;
end;
$$;

grant execute on function reclamar_codigo(text) to authenticated;
