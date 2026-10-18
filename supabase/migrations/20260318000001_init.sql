-- Panel de Proveedor — schema inicial
-- Proyecto Supabase NUEVO y dedicado (no reutilizar proyectos de clientes).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- owners: allowlist de usuarios del panel
-- ---------------------------------------------------------------------------
create table public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.owners is 'Usuarios autorizados a operar el panel (solo owners).';

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto text,
  telefono text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_nombre_idx on public.clients (nombre);

-- ---------------------------------------------------------------------------
-- apps
-- ---------------------------------------------------------------------------
create table public.apps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  slug text not null unique,
  nombre text not null,
  url_publica text,
  vendor_sync_url text not null,
  secret_name text not null,
  tenant_id text not null,
  precio_mensual_cop integer not null check (precio_mensual_cop >= 0),
  dia_vencimiento integer not null check (dia_vencimiento between 1 and 31),
  activa_en_panel boolean not null default true,
  panel_version integer not null default 0,
  -- caché del último vendor-sync
  cached_status text,
  cached_effective_status text,
  cached_current_period_end date,
  cached_grace_until date,
  cached_days_left integer,
  cached_days_left_in_grace integer,
  cached_enforcement_enabled boolean,
  cached_message text,
  cached_source text,
  cached_last_synced_at timestamptz,
  last_check_at timestamptz,
  last_check_ok boolean,
  last_check_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apps_secret_name_format check (secret_name ~ '^APP_SECRET_[A-Z0-9_]+$')
);

create index apps_client_id_idx on public.apps (client_id);
create index apps_activa_idx on public.apps (activa_en_panel);
create index apps_tenant_id_idx on public.apps (tenant_id);

comment on column public.apps.secret_name is
  'Nombre del secret en Edge Functions (ej. APP_SECRET_LUIS_CONFECCION). Nunca el valor.';

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps (id) on delete cascade,
  fecha date not null,
  monto_cop integer not null check (monto_cop >= 0),
  periodo_desde date not null,
  periodo_hasta date not null,
  medio text,
  referencia text,
  notas text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint payments_periodo_ok check (periodo_hasta >= periodo_desde)
);

create index payments_app_id_idx on public.payments (app_id);
create index payments_fecha_idx on public.payments (fecha desc);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  app_id uuid references public.apps (id) on delete set null,
  accion text not null,
  payload jsonb,
  http_status integer,
  response_code text,
  response_body jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_app_id_idx on public.audit_log (app_id, created_at desc);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger apps_set_updated_at
  before update on public.apps
  for each row execute function public.set_updated_at();
