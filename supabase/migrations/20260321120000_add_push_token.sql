-- Agregar push token para notificaciones push (expo-notifications)
alter table "public"."perfiles" add column if not exists "push_token" text;
