-- pg_cron: sync-all cada hora.
-- Requiere la extensión pg_cron (habilitar en el dashboard de Supabase).
-- La Edge Function sync-all se autentica con CRON_SECRET.

create extension if not exists pg_cron with schema extensions;

-- Placeholder: al desplegar, reemplaza PROJECT_REF y CRON_SECRET_VALUE
-- con los valores reales vía el SQL editor (o descomenta tras setear secrets).
--
-- select cron.schedule(
--   'panel-sync-all-hourly',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/sync-all',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer CRON_SECRET_VALUE'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

comment on extension pg_cron is
  'Programar sync-all horario; ver README para el schedule concreto con CRON_SECRET.';
