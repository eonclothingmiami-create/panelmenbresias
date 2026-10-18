-- RLS: solo owners leen/escriben. Nada para anon.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.owners o
    where o.user_id = auth.uid()
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

alter table public.owners enable row level security;
alter table public.clients enable row level security;
alter table public.apps enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

-- owners: solo lectura de la propia fila (para el front); inserts vía service role / seed
create policy owners_select_self
  on public.owners
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_owner());

create policy clients_all_owners
  on public.clients
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy apps_all_owners
  on public.apps
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy payments_all_owners
  on public.payments
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy audit_log_select_owners
  on public.audit_log
  for select
  to authenticated
  using (public.is_owner());

create policy audit_log_insert_owners
  on public.audit_log
  for insert
  to authenticated
  with check (public.is_owner());

-- Sin policies para anon → denegado por defecto con RLS activo
revoke all on public.owners from anon;
revoke all on public.clients from anon;
revoke all on public.apps from anon;
revoke all on public.payments from anon;
revoke all on public.audit_log from anon;

grant select on public.owners to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.apps to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert on public.audit_log to authenticated;
