-- Ampliar constraint de objetivo para incluir todos los valores del onboarding
alter table "public"."perfiles" drop constraint "perfiles_objetivo_check";

alter table "public"."perfiles" add constraint "perfiles_objetivo_check"
  check (objetivo = any (array[
    'hipertrofia'::text,
    'fuerza'::text,
    'definicion'::text,
    'competencia'::text,
    'recomposicion'::text,
    'resistencia'::text
  ])) not valid;

alter table "public"."perfiles" validate constraint "perfiles_objetivo_check";
