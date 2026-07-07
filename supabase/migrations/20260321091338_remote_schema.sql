drop extension if exists "pg_net";


  create table "public"."codigos_invitacion" (
    "id" uuid not null default gen_random_uuid(),
    "codigo" text not null,
    "coach_id" uuid,
    "cliente_id" uuid,
    "usado" boolean default false,
    "creado_en" timestamp with time zone default now(),
    "expira_en" timestamp with time zone
      );


alter table "public"."codigos_invitacion" enable row level security;


  create table "public"."comunidad_comentarios" (
    "id" uuid not null default gen_random_uuid(),
    "publicacion_id" uuid,
    "autor_id" uuid,
    "texto" text not null,
    "creado_en" timestamp with time zone default now()
      );


alter table "public"."comunidad_comentarios" enable row level security;


  create table "public"."comunidad_likes" (
    "id" uuid not null default gen_random_uuid(),
    "publicacion_id" uuid,
    "usuario_id" uuid
      );


alter table "public"."comunidad_likes" enable row level security;


  create table "public"."comunidad_publicaciones" (
    "id" uuid not null default gen_random_uuid(),
    "autor_id" uuid,
    "texto" text not null,
    "tipo" text default 'aviso'::text,
    "publica" boolean default true,
    "creado_en" timestamp with time zone default now(),
    "media_url" text,
    "media_tipo" text
      );


alter table "public"."comunidad_publicaciones" enable row level security;


  create table "public"."feature_flags" (
    "id" text not null,
    "nombre" text not null,
    "descripcion" text,
    "habilitado" boolean not null default true,
    "actualizado_en" timestamp with time zone default now()
      );


alter table "public"."feature_flags" enable row level security;


  create table "public"."mensajes" (
    "id" uuid not null default gen_random_uuid(),
    "emisor_id" uuid,
    "receptor_id" uuid,
    "contenido" text not null,
    "leido" boolean default false,
    "creado_en" timestamp with time zone default now()
      );


alter table "public"."mensajes" enable row level security;


  create table "public"."perfiles" (
    "id" uuid not null,
    "nombre_completo" text,
    "fecha_nacimiento" date,
    "edad" integer,
    "peso" numeric,
    "estatura" numeric,
    "objetivo" text,
    "nivel" text,
    "dias_entrenamiento" integer[],
    "compite" boolean default false,
    "tiene_lesiones" boolean default false,
    "descripcion_lesiones" text,
    "estado_rutina" text,
    "rol" text default 'cliente'::text,
    "coach_id" uuid,
    "creado_en" timestamp with time zone default now(),
    "altura" numeric,
    "genero" text,
    "nivel_experiencia" text,
    "avatar_url" text,
    "estado_cliente" text default 'activo'::text,
    "especialidad" text,
    "ultima_sesion" timestamp with time zone
      );


alter table "public"."perfiles" enable row level security;


  create table "public"."programas" (
    "id" uuid not null default gen_random_uuid(),
    "usuario_id" uuid,
    "datos" jsonb not null,
    "actualizado_en" timestamp with time zone default now()
      );


alter table "public"."programas" enable row level security;


  create table "public"."programas_entrenamiento" (
    "id" uuid not null default gen_random_uuid(),
    "usuario_id" uuid,
    "nombre" text not null,
    "objetivo" text,
    "duracion_semanas" integer,
    "estado" text default 'activo'::text,
    "fecha_inicio" date,
    "fecha_fin" date,
    "creado_en" timestamp with time zone default now()
      );



  create table "public"."suscripciones" (
    "id" uuid not null default gen_random_uuid(),
    "usuario_id" uuid,
    "plan" text default 'Pro'::text,
    "precio" numeric default 9.99,
    "periodo" text default 'mes'::text,
    "activa" boolean default true,
    "fecha_inicio" timestamp with time zone default now(),
    "fecha_vencimiento" timestamp with time zone
      );


alter table "public"."suscripciones" enable row level security;

CREATE UNIQUE INDEX codigos_invitacion_codigo_key ON public.codigos_invitacion USING btree (codigo);

CREATE UNIQUE INDEX codigos_invitacion_pkey ON public.codigos_invitacion USING btree (id);

CREATE UNIQUE INDEX comunidad_comentarios_pkey ON public.comunidad_comentarios USING btree (id);

CREATE UNIQUE INDEX comunidad_likes_pkey ON public.comunidad_likes USING btree (id);

CREATE UNIQUE INDEX comunidad_likes_publicacion_id_usuario_id_key ON public.comunidad_likes USING btree (publicacion_id, usuario_id);

CREATE UNIQUE INDEX comunidad_publicaciones_pkey ON public.comunidad_publicaciones USING btree (id);

CREATE UNIQUE INDEX feature_flags_pkey ON public.feature_flags USING btree (id);

CREATE INDEX mensajes_conv_idx ON public.mensajes USING btree (emisor_id, receptor_id, creado_en);

CREATE UNIQUE INDEX mensajes_pkey ON public.mensajes USING btree (id);

CREATE INDEX mensajes_receptor_idx ON public.mensajes USING btree (receptor_id, leido);

CREATE UNIQUE INDEX perfiles_pkey ON public.perfiles USING btree (id);

CREATE UNIQUE INDEX programas_entrenamiento_pkey ON public.programas_entrenamiento USING btree (id);

CREATE UNIQUE INDEX programas_pkey ON public.programas USING btree (id);

CREATE UNIQUE INDEX programas_usuario_id_key ON public.programas USING btree (usuario_id);

CREATE UNIQUE INDEX suscripciones_pkey ON public.suscripciones USING btree (id);

CREATE UNIQUE INDEX suscripciones_usuario_id_key ON public.suscripciones USING btree (usuario_id);

CREATE INDEX suscripciones_usuario_idx ON public.suscripciones USING btree (usuario_id);

alter table "public"."codigos_invitacion" add constraint "codigos_invitacion_pkey" PRIMARY KEY using index "codigos_invitacion_pkey";

alter table "public"."comunidad_comentarios" add constraint "comunidad_comentarios_pkey" PRIMARY KEY using index "comunidad_comentarios_pkey";

alter table "public"."comunidad_likes" add constraint "comunidad_likes_pkey" PRIMARY KEY using index "comunidad_likes_pkey";

alter table "public"."comunidad_publicaciones" add constraint "comunidad_publicaciones_pkey" PRIMARY KEY using index "comunidad_publicaciones_pkey";

alter table "public"."feature_flags" add constraint "feature_flags_pkey" PRIMARY KEY using index "feature_flags_pkey";

alter table "public"."mensajes" add constraint "mensajes_pkey" PRIMARY KEY using index "mensajes_pkey";

alter table "public"."perfiles" add constraint "perfiles_pkey" PRIMARY KEY using index "perfiles_pkey";

alter table "public"."programas" add constraint "programas_pkey" PRIMARY KEY using index "programas_pkey";

alter table "public"."programas_entrenamiento" add constraint "programas_entrenamiento_pkey" PRIMARY KEY using index "programas_entrenamiento_pkey";

alter table "public"."suscripciones" add constraint "suscripciones_pkey" PRIMARY KEY using index "suscripciones_pkey";

alter table "public"."codigos_invitacion" add constraint "codigos_invitacion_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES public.perfiles(id) not valid;

alter table "public"."codigos_invitacion" validate constraint "codigos_invitacion_cliente_id_fkey";

alter table "public"."codigos_invitacion" add constraint "codigos_invitacion_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.perfiles(id) ON DELETE CASCADE not valid;

alter table "public"."codigos_invitacion" validate constraint "codigos_invitacion_coach_id_fkey";

alter table "public"."codigos_invitacion" add constraint "codigos_invitacion_codigo_key" UNIQUE using index "codigos_invitacion_codigo_key";

alter table "public"."comunidad_comentarios" add constraint "comunidad_comentarios_autor_id_fkey" FOREIGN KEY (autor_id) REFERENCES public.perfiles(id) ON DELETE CASCADE not valid;

alter table "public"."comunidad_comentarios" validate constraint "comunidad_comentarios_autor_id_fkey";

alter table "public"."comunidad_comentarios" add constraint "comunidad_comentarios_publicacion_id_fkey" FOREIGN KEY (publicacion_id) REFERENCES public.comunidad_publicaciones(id) ON DELETE CASCADE not valid;

alter table "public"."comunidad_comentarios" validate constraint "comunidad_comentarios_publicacion_id_fkey";

alter table "public"."comunidad_likes" add constraint "comunidad_likes_publicacion_id_fkey" FOREIGN KEY (publicacion_id) REFERENCES public.comunidad_publicaciones(id) ON DELETE CASCADE not valid;

alter table "public"."comunidad_likes" validate constraint "comunidad_likes_publicacion_id_fkey";

alter table "public"."comunidad_likes" add constraint "comunidad_likes_publicacion_id_usuario_id_key" UNIQUE using index "comunidad_likes_publicacion_id_usuario_id_key";

alter table "public"."comunidad_likes" add constraint "comunidad_likes_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) ON DELETE CASCADE not valid;

alter table "public"."comunidad_likes" validate constraint "comunidad_likes_usuario_id_fkey";

alter table "public"."comunidad_publicaciones" add constraint "comunidad_publicaciones_autor_id_fkey" FOREIGN KEY (autor_id) REFERENCES public.perfiles(id) ON DELETE CASCADE not valid;

alter table "public"."comunidad_publicaciones" validate constraint "comunidad_publicaciones_autor_id_fkey";

alter table "public"."mensajes" add constraint "mensajes_emisor_id_fkey" FOREIGN KEY (emisor_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."mensajes" validate constraint "mensajes_emisor_id_fkey";

alter table "public"."mensajes" add constraint "mensajes_receptor_id_fkey" FOREIGN KEY (receptor_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."mensajes" validate constraint "mensajes_receptor_id_fkey";

alter table "public"."perfiles" add constraint "perfiles_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.perfiles(id) not valid;

alter table "public"."perfiles" validate constraint "perfiles_coach_id_fkey";

alter table "public"."perfiles" add constraint "perfiles_estado_rutina_check" CHECK ((estado_rutina = ANY (ARRAY['generada_ia'::text, 'manual'::text, 'existente'::text]))) not valid;

alter table "public"."perfiles" validate constraint "perfiles_estado_rutina_check";

alter table "public"."perfiles" add constraint "perfiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."perfiles" validate constraint "perfiles_id_fkey";

alter table "public"."perfiles" add constraint "perfiles_nivel_check" CHECK ((nivel = ANY (ARRAY['principiante'::text, 'intermedio'::text, 'avanzado'::text]))) not valid;

alter table "public"."perfiles" validate constraint "perfiles_nivel_check";

alter table "public"."perfiles" add constraint "perfiles_objetivo_check" CHECK ((objetivo = ANY (ARRAY['hipertrofia'::text, 'fuerza'::text, 'definicion'::text, 'competencia'::text]))) not valid;

alter table "public"."perfiles" validate constraint "perfiles_objetivo_check";

alter table "public"."perfiles" add constraint "perfiles_rol_check" CHECK ((rol = ANY (ARRAY['superadmin'::text, 'coach'::text, 'cliente'::text]))) not valid;

alter table "public"."perfiles" validate constraint "perfiles_rol_check";

alter table "public"."programas" add constraint "programas_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."programas" validate constraint "programas_usuario_id_fkey";

alter table "public"."programas" add constraint "programas_usuario_id_key" UNIQUE using index "programas_usuario_id_key";

alter table "public"."programas_entrenamiento" add constraint "programas_entrenamiento_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."programas_entrenamiento" validate constraint "programas_entrenamiento_usuario_id_fkey";

alter table "public"."suscripciones" add constraint "suscripciones_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."suscripciones" validate constraint "suscripciones_usuario_id_fkey";

alter table "public"."suscripciones" add constraint "suscripciones_usuario_id_key" UNIQUE using index "suscripciones_usuario_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calcular_edad()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.edad = DATE_PART('year', AGE(NEW.fecha_nacimiento));
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."codigos_invitacion" to "anon";

grant insert on table "public"."codigos_invitacion" to "anon";

grant references on table "public"."codigos_invitacion" to "anon";

grant select on table "public"."codigos_invitacion" to "anon";

grant trigger on table "public"."codigos_invitacion" to "anon";

grant truncate on table "public"."codigos_invitacion" to "anon";

grant update on table "public"."codigos_invitacion" to "anon";

grant delete on table "public"."codigos_invitacion" to "authenticated";

grant insert on table "public"."codigos_invitacion" to "authenticated";

grant references on table "public"."codigos_invitacion" to "authenticated";

grant select on table "public"."codigos_invitacion" to "authenticated";

grant trigger on table "public"."codigos_invitacion" to "authenticated";

grant truncate on table "public"."codigos_invitacion" to "authenticated";

grant update on table "public"."codigos_invitacion" to "authenticated";

grant delete on table "public"."codigos_invitacion" to "service_role";

grant insert on table "public"."codigos_invitacion" to "service_role";

grant references on table "public"."codigos_invitacion" to "service_role";

grant select on table "public"."codigos_invitacion" to "service_role";

grant trigger on table "public"."codigos_invitacion" to "service_role";

grant truncate on table "public"."codigos_invitacion" to "service_role";

grant update on table "public"."codigos_invitacion" to "service_role";

grant delete on table "public"."comunidad_comentarios" to "anon";

grant insert on table "public"."comunidad_comentarios" to "anon";

grant references on table "public"."comunidad_comentarios" to "anon";

grant select on table "public"."comunidad_comentarios" to "anon";

grant trigger on table "public"."comunidad_comentarios" to "anon";

grant truncate on table "public"."comunidad_comentarios" to "anon";

grant update on table "public"."comunidad_comentarios" to "anon";

grant delete on table "public"."comunidad_comentarios" to "authenticated";

grant insert on table "public"."comunidad_comentarios" to "authenticated";

grant references on table "public"."comunidad_comentarios" to "authenticated";

grant select on table "public"."comunidad_comentarios" to "authenticated";

grant trigger on table "public"."comunidad_comentarios" to "authenticated";

grant truncate on table "public"."comunidad_comentarios" to "authenticated";

grant update on table "public"."comunidad_comentarios" to "authenticated";

grant delete on table "public"."comunidad_comentarios" to "service_role";

grant insert on table "public"."comunidad_comentarios" to "service_role";

grant references on table "public"."comunidad_comentarios" to "service_role";

grant select on table "public"."comunidad_comentarios" to "service_role";

grant trigger on table "public"."comunidad_comentarios" to "service_role";

grant truncate on table "public"."comunidad_comentarios" to "service_role";

grant update on table "public"."comunidad_comentarios" to "service_role";

grant delete on table "public"."comunidad_likes" to "anon";

grant insert on table "public"."comunidad_likes" to "anon";

grant references on table "public"."comunidad_likes" to "anon";

grant select on table "public"."comunidad_likes" to "anon";

grant trigger on table "public"."comunidad_likes" to "anon";

grant truncate on table "public"."comunidad_likes" to "anon";

grant update on table "public"."comunidad_likes" to "anon";

grant delete on table "public"."comunidad_likes" to "authenticated";

grant insert on table "public"."comunidad_likes" to "authenticated";

grant references on table "public"."comunidad_likes" to "authenticated";

grant select on table "public"."comunidad_likes" to "authenticated";

grant trigger on table "public"."comunidad_likes" to "authenticated";

grant truncate on table "public"."comunidad_likes" to "authenticated";

grant update on table "public"."comunidad_likes" to "authenticated";

grant delete on table "public"."comunidad_likes" to "service_role";

grant insert on table "public"."comunidad_likes" to "service_role";

grant references on table "public"."comunidad_likes" to "service_role";

grant select on table "public"."comunidad_likes" to "service_role";

grant trigger on table "public"."comunidad_likes" to "service_role";

grant truncate on table "public"."comunidad_likes" to "service_role";

grant update on table "public"."comunidad_likes" to "service_role";

grant delete on table "public"."comunidad_publicaciones" to "anon";

grant insert on table "public"."comunidad_publicaciones" to "anon";

grant references on table "public"."comunidad_publicaciones" to "anon";

grant select on table "public"."comunidad_publicaciones" to "anon";

grant trigger on table "public"."comunidad_publicaciones" to "anon";

grant truncate on table "public"."comunidad_publicaciones" to "anon";

grant update on table "public"."comunidad_publicaciones" to "anon";

grant delete on table "public"."comunidad_publicaciones" to "authenticated";

grant insert on table "public"."comunidad_publicaciones" to "authenticated";

grant references on table "public"."comunidad_publicaciones" to "authenticated";

grant select on table "public"."comunidad_publicaciones" to "authenticated";

grant trigger on table "public"."comunidad_publicaciones" to "authenticated";

grant truncate on table "public"."comunidad_publicaciones" to "authenticated";

grant update on table "public"."comunidad_publicaciones" to "authenticated";

grant delete on table "public"."comunidad_publicaciones" to "service_role";

grant insert on table "public"."comunidad_publicaciones" to "service_role";

grant references on table "public"."comunidad_publicaciones" to "service_role";

grant select on table "public"."comunidad_publicaciones" to "service_role";

grant trigger on table "public"."comunidad_publicaciones" to "service_role";

grant truncate on table "public"."comunidad_publicaciones" to "service_role";

grant update on table "public"."comunidad_publicaciones" to "service_role";

grant delete on table "public"."feature_flags" to "anon";

grant insert on table "public"."feature_flags" to "anon";

grant references on table "public"."feature_flags" to "anon";

grant select on table "public"."feature_flags" to "anon";

grant trigger on table "public"."feature_flags" to "anon";

grant truncate on table "public"."feature_flags" to "anon";

grant update on table "public"."feature_flags" to "anon";

grant delete on table "public"."feature_flags" to "authenticated";

grant insert on table "public"."feature_flags" to "authenticated";

grant references on table "public"."feature_flags" to "authenticated";

grant select on table "public"."feature_flags" to "authenticated";

grant trigger on table "public"."feature_flags" to "authenticated";

grant truncate on table "public"."feature_flags" to "authenticated";

grant update on table "public"."feature_flags" to "authenticated";

grant delete on table "public"."feature_flags" to "service_role";

grant insert on table "public"."feature_flags" to "service_role";

grant references on table "public"."feature_flags" to "service_role";

grant select on table "public"."feature_flags" to "service_role";

grant trigger on table "public"."feature_flags" to "service_role";

grant truncate on table "public"."feature_flags" to "service_role";

grant update on table "public"."feature_flags" to "service_role";

grant delete on table "public"."mensajes" to "anon";

grant insert on table "public"."mensajes" to "anon";

grant references on table "public"."mensajes" to "anon";

grant select on table "public"."mensajes" to "anon";

grant trigger on table "public"."mensajes" to "anon";

grant truncate on table "public"."mensajes" to "anon";

grant update on table "public"."mensajes" to "anon";

grant delete on table "public"."mensajes" to "authenticated";

grant insert on table "public"."mensajes" to "authenticated";

grant references on table "public"."mensajes" to "authenticated";

grant select on table "public"."mensajes" to "authenticated";

grant trigger on table "public"."mensajes" to "authenticated";

grant truncate on table "public"."mensajes" to "authenticated";

grant update on table "public"."mensajes" to "authenticated";

grant delete on table "public"."mensajes" to "service_role";

grant insert on table "public"."mensajes" to "service_role";

grant references on table "public"."mensajes" to "service_role";

grant select on table "public"."mensajes" to "service_role";

grant trigger on table "public"."mensajes" to "service_role";

grant truncate on table "public"."mensajes" to "service_role";

grant update on table "public"."mensajes" to "service_role";

grant delete on table "public"."perfiles" to "anon";

grant insert on table "public"."perfiles" to "anon";

grant references on table "public"."perfiles" to "anon";

grant select on table "public"."perfiles" to "anon";

grant trigger on table "public"."perfiles" to "anon";

grant truncate on table "public"."perfiles" to "anon";

grant update on table "public"."perfiles" to "anon";

grant delete on table "public"."perfiles" to "authenticated";

grant insert on table "public"."perfiles" to "authenticated";

grant references on table "public"."perfiles" to "authenticated";

grant select on table "public"."perfiles" to "authenticated";

grant trigger on table "public"."perfiles" to "authenticated";

grant truncate on table "public"."perfiles" to "authenticated";

grant update on table "public"."perfiles" to "authenticated";

grant delete on table "public"."perfiles" to "service_role";

grant insert on table "public"."perfiles" to "service_role";

grant references on table "public"."perfiles" to "service_role";

grant select on table "public"."perfiles" to "service_role";

grant trigger on table "public"."perfiles" to "service_role";

grant truncate on table "public"."perfiles" to "service_role";

grant update on table "public"."perfiles" to "service_role";

grant delete on table "public"."programas" to "anon";

grant insert on table "public"."programas" to "anon";

grant references on table "public"."programas" to "anon";

grant select on table "public"."programas" to "anon";

grant trigger on table "public"."programas" to "anon";

grant truncate on table "public"."programas" to "anon";

grant update on table "public"."programas" to "anon";

grant delete on table "public"."programas" to "authenticated";

grant insert on table "public"."programas" to "authenticated";

grant references on table "public"."programas" to "authenticated";

grant select on table "public"."programas" to "authenticated";

grant trigger on table "public"."programas" to "authenticated";

grant truncate on table "public"."programas" to "authenticated";

grant update on table "public"."programas" to "authenticated";

grant delete on table "public"."programas" to "service_role";

grant insert on table "public"."programas" to "service_role";

grant references on table "public"."programas" to "service_role";

grant select on table "public"."programas" to "service_role";

grant trigger on table "public"."programas" to "service_role";

grant truncate on table "public"."programas" to "service_role";

grant update on table "public"."programas" to "service_role";

grant delete on table "public"."programas_entrenamiento" to "anon";

grant insert on table "public"."programas_entrenamiento" to "anon";

grant references on table "public"."programas_entrenamiento" to "anon";

grant select on table "public"."programas_entrenamiento" to "anon";

grant trigger on table "public"."programas_entrenamiento" to "anon";

grant truncate on table "public"."programas_entrenamiento" to "anon";

grant update on table "public"."programas_entrenamiento" to "anon";

grant delete on table "public"."programas_entrenamiento" to "authenticated";

grant insert on table "public"."programas_entrenamiento" to "authenticated";

grant references on table "public"."programas_entrenamiento" to "authenticated";

grant select on table "public"."programas_entrenamiento" to "authenticated";

grant trigger on table "public"."programas_entrenamiento" to "authenticated";

grant truncate on table "public"."programas_entrenamiento" to "authenticated";

grant update on table "public"."programas_entrenamiento" to "authenticated";

grant delete on table "public"."programas_entrenamiento" to "service_role";

grant insert on table "public"."programas_entrenamiento" to "service_role";

grant references on table "public"."programas_entrenamiento" to "service_role";

grant select on table "public"."programas_entrenamiento" to "service_role";

grant trigger on table "public"."programas_entrenamiento" to "service_role";

grant truncate on table "public"."programas_entrenamiento" to "service_role";

grant update on table "public"."programas_entrenamiento" to "service_role";

grant delete on table "public"."suscripciones" to "anon";

grant insert on table "public"."suscripciones" to "anon";

grant references on table "public"."suscripciones" to "anon";

grant select on table "public"."suscripciones" to "anon";

grant trigger on table "public"."suscripciones" to "anon";

grant truncate on table "public"."suscripciones" to "anon";

grant update on table "public"."suscripciones" to "anon";

grant delete on table "public"."suscripciones" to "authenticated";

grant insert on table "public"."suscripciones" to "authenticated";

grant references on table "public"."suscripciones" to "authenticated";

grant select on table "public"."suscripciones" to "authenticated";

grant trigger on table "public"."suscripciones" to "authenticated";

grant truncate on table "public"."suscripciones" to "authenticated";

grant update on table "public"."suscripciones" to "authenticated";

grant delete on table "public"."suscripciones" to "service_role";

grant insert on table "public"."suscripciones" to "service_role";

grant references on table "public"."suscripciones" to "service_role";

grant select on table "public"."suscripciones" to "service_role";

grant trigger on table "public"."suscripciones" to "service_role";

grant truncate on table "public"."suscripciones" to "service_role";

grant update on table "public"."suscripciones" to "service_role";


  create policy "Coach gestiona sus codigos"
  on "public"."codigos_invitacion"
  as permissive
  for all
  to authenticated
using ((coach_id = auth.uid()))
with check ((coach_id = auth.uid()));



  create policy "Todos leen codigos disponibles"
  on "public"."codigos_invitacion"
  as permissive
  for select
  to authenticated
using (((NOT usado) OR (cliente_id = auth.uid())));



  create policy "cliente_puede_leer_codigo"
  on "public"."codigos_invitacion"
  as permissive
  for select
  to public
using ((usado = false));



  create policy "coach_gestiona_sus_codigos"
  on "public"."codigos_invitacion"
  as permissive
  for all
  to public
using ((coach_id = auth.uid()));



  create policy "codigos_coach"
  on "public"."codigos_invitacion"
  as permissive
  for all
  to public
using (((coach_id = auth.uid()) OR (cliente_id = auth.uid())));



  create policy "Comentarios todos"
  on "public"."comunidad_comentarios"
  as permissive
  for all
  to authenticated
using (true)
with check ((autor_id = auth.uid()));



  create policy "Usuarios comentan y ven"
  on "public"."comunidad_comentarios"
  as permissive
  for all
  to authenticated
using (true)
with check ((autor_id = auth.uid()));



  create policy "comentarios_acceso"
  on "public"."comunidad_comentarios"
  as permissive
  for all
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Likes usuarios"
  on "public"."comunidad_likes"
  as permissive
  for all
  to authenticated
using ((usuario_id = auth.uid()))
with check ((usuario_id = auth.uid()));



  create policy "Usuarios dan likes"
  on "public"."comunidad_likes"
  as permissive
  for all
  to authenticated
using ((usuario_id = auth.uid()))
with check ((usuario_id = auth.uid()));



  create policy "likes_acceso"
  on "public"."comunidad_likes"
  as permissive
  for all
  to public
using ((usuario_id = auth.uid()));



  create policy "Coach publica y gestiona"
  on "public"."comunidad_publicaciones"
  as permissive
  for all
  to authenticated
using ((autor_id = auth.uid()))
with check ((autor_id = auth.uid()));



  create policy "Coaches publican"
  on "public"."comunidad_publicaciones"
  as permissive
  for all
  to authenticated
using ((autor_id = auth.uid()))
with check ((autor_id = auth.uid()));



  create policy "Todos ven publicas"
  on "public"."comunidad_publicaciones"
  as permissive
  for select
  to authenticated
using (((publica = true) OR (autor_id = auth.uid())));



  create policy "pubs_acceso"
  on "public"."comunidad_publicaciones"
  as permissive
  for select
  to public
using (((publica = true) OR (autor_id = auth.uid()) OR (autor_id IN ( SELECT perfiles.id
   FROM public.perfiles
  WHERE (perfiles.coach_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = auth.uid()) AND (perfiles.coach_id = comunidad_publicaciones.autor_id))))));



  create policy "pubs_delete"
  on "public"."comunidad_publicaciones"
  as permissive
  for delete
  to public
using ((autor_id = auth.uid()));



  create policy "pubs_insert"
  on "public"."comunidad_publicaciones"
  as permissive
  for insert
  to public
with check ((autor_id = auth.uid()));



  create policy "pubs_update"
  on "public"."comunidad_publicaciones"
  as permissive
  for update
  to public
using ((autor_id = auth.uid()));



  create policy "flags_select"
  on "public"."feature_flags"
  as permissive
  for select
  to authenticated
using (true);



  create policy "flags_update_superadmin"
  on "public"."feature_flags"
  as permissive
  for update
  to authenticated
using (((auth.jwt() ->> 'email'::text) = 'daniel@live.com'::text))
with check (((auth.jwt() ->> 'email'::text) = 'daniel@live.com'::text));



  create policy "Enviar mensajes"
  on "public"."mensajes"
  as permissive
  for insert
  to authenticated
with check ((emisor_id = auth.uid()));



  create policy "Marcar como leido"
  on "public"."mensajes"
  as permissive
  for update
  to authenticated
using ((receptor_id = auth.uid()));



  create policy "Usuarios envian mensajes"
  on "public"."mensajes"
  as permissive
  for insert
  to authenticated
with check ((emisor_id = auth.uid()));



  create policy "Usuarios marcan leido"
  on "public"."mensajes"
  as permissive
  for update
  to authenticated
using ((receptor_id = auth.uid()));



  create policy "Usuarios ven sus mensajes"
  on "public"."mensajes"
  as permissive
  for select
  to authenticated
using (((emisor_id = auth.uid()) OR (receptor_id = auth.uid())));



  create policy "Ver mis mensajes"
  on "public"."mensajes"
  as permissive
  for select
  to authenticated
using (((emisor_id = auth.uid()) OR (receptor_id = auth.uid())));



  create policy "mensajes_acceso"
  on "public"."mensajes"
  as permissive
  for all
  to public
using (((emisor_id = auth.uid()) OR (receptor_id = auth.uid())));



  create policy "Cualquier usuario puede ver perfiles básicos"
  on "public"."perfiles"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "coach_ve_sus_clientes"
  on "public"."perfiles"
  as permissive
  for select
  to public
using (((coach_id = auth.uid()) OR (auth.uid() = id)));



  create policy "perfiles_insert_propio"
  on "public"."perfiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "perfiles_select_general"
  on "public"."perfiles"
  as permissive
  for select
  to authenticated
using (((id = auth.uid()) OR (coach_id = auth.uid()) OR (rol = 'coach'::text)));



  create policy "perfiles_update_propio"
  on "public"."perfiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id));



  create policy "usuario_actualiza_su_perfil"
  on "public"."perfiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "usuario_inserta_su_perfil"
  on "public"."perfiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "usuario_ve_su_perfil"
  on "public"."perfiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Coaches pueden actualizar programas de sus clientes"
  on "public"."programas"
  as permissive
  for update
  to public
using ((usuario_id IN ( SELECT perfiles.id
   FROM public.perfiles
  WHERE (perfiles.coach_id = auth.uid()))));



  create policy "Coaches pueden insertar programas para sus clientes"
  on "public"."programas"
  as permissive
  for insert
  to public
with check ((usuario_id IN ( SELECT perfiles.id
   FROM public.perfiles
  WHERE (perfiles.coach_id = auth.uid()))));



  create policy "usuario_gestiona_su_programa"
  on "public"."programas"
  as permissive
  for all
  to public
using ((auth.uid() = usuario_id));



  create policy "suscripciones_acceso"
  on "public"."suscripciones"
  as permissive
  for all
  to public
using ((usuario_id = auth.uid()));


CREATE TRIGGER trigger_feature_flags_updated BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER actualizar_edad BEFORE INSERT OR UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.calcular_edad();


  create policy "Avatars are public"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Avatars publicos lectura"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Coaches eliminan su media"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'comunidad'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Coaches suben media"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'comunidad'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Comunidad publica lectura"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'comunidad'::text));



  create policy "Media comunidad publica"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'comunidad'::text));



  create policy "Users can delete own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));



  create policy "Users can update own avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));



  create policy "Users can upload own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));



  create policy "Usuarios actualizan avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Usuarios eliminan avatar"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Usuarios suben su avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatars_public"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "avatars_upload"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "comunidad_public"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'comunidad'::text));



  create policy "comunidad_upload"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'comunidad'::text) AND (auth.uid() IS NOT NULL)));



  create policy "update own avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "upload own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



