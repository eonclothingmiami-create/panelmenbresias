-- Quién desarrolló el cliente/app: David, Santiago o ambos.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'desarrollador' and n.nspname = 'public'
  ) then
    create type public.desarrollador as enum ('david', 'santiago', 'ambos');
  end if;
end $$;

alter table public.clients
  add column if not exists desarrollado_por public.desarrollador not null default 'ambos';

alter table public.apps
  add column if not exists desarrollado_por public.desarrollador not null default 'ambos';

comment on column public.clients.desarrollado_por is
  'Desarrollador responsable del cliente: david | santiago | ambos.';

comment on column public.apps.desarrollado_por is
  'Quién desarrolló la app: david | santiago | ambos.';
