# Panel de Proveedor (Eon)

Panel privado del desarrollador para controlar suscripciones de las apps vendidas a clientes.  
Primera app conectada: **Sistema para la Confección** (Luis) vía su endpoint `vendor-sync`.

Stack: React 19 · Vite · TypeScript estricto · Tailwind 4 · shadcn/ui · TanStack Query · HashRouter · zod · RHF · date-fns (`es`, `America/Bogota`) · Supabase (Auth + Postgres + Edge Functions + pg_cron) · GitHub Pages.

## Seguridad

GitHub Pages es estático: **ningún secreto HMAC llega al navegador**. El front solo habla con la Edge Function `panel-proxy` usando tu sesión Supabase (JWT + owner + AAL2). Esa función firma y llama a cada `vendor-sync`. Los secretos viven como secrets de Edge Functions: `APP_SECRET_<SLUG_EN_MAYUSCULAS>`.

## Requisitos locales

- Node 22+
- Cuenta Supabase (proyecto **nuevo** solo para este panel)
- `supabase` CLI

```bash
npm ci
cp .env.example .env.local   # rellenar tras crear el proyecto
npm run dev
```

Scripts:

```bash
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

---

## 1) Crear el proyecto Supabase del panel

**No ejecutes esto hasta confirmar.** Sustituye el nombre si quieres:

```bash
# Opción A — Dashboard: https://supabase.com/dashboard → New project
#   Name: eon-panel-proveedor
#   Region: la más cercana (ej. us-east-1)
#   Guarda el database password.

# Opción B — CLI (requiere login previo: supabase login)
supabase projects create eon-panel-proveedor --org-id <TU_ORG_ID> --db-password <PASSWORD> --region us-east-1
```

Anota el **project ref** (`<PANEL_REF>`) y las keys:

```bash
supabase projects api-keys --project-ref <PANEL_REF>
```

En `.env.local` / GitHub Actions secrets del repo:

```bash
VITE_SUPABASE_URL=https://<PANEL_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## 2) Aplicar migraciones

```bash
supabase link --project-ref <PANEL_REF>
supabase db push
# o: supabase migration up
```

Migraciones en `supabase/migrations/`:

1. `20260318000001_init.sql` — tablas
2. `20260318000002_rls.sql` — RLS solo owners
3. `20260318000003_cron_sync.sql` — pg_cron (schedule comentado)

## 3) Crear usuario owner + MFA

En Authentication → Providers:

- Email/password **ON**
- **Disable signup** (o deshabilitar “Allow new users to sign up”)

Crea el usuario (dashboard o Admin API) con correo:

`davidkaseo@hotmail.com`

Luego seed owner:

```bash
# SQL editor del proyecto panel:
insert into public.owners (user_id)
select id from auth.users where email = 'davidkaseo@hotmail.com'
on conflict (user_id) do nothing;
```

(Ver también `supabase/seed/owner_marker.sql`.)

En el front: login → enrolar TOTP → verificar (AAL2 obligatorio).

## 4) Secrets de Edge Functions

**No setees secrets sin confirmar.** Comandos exactos:

```bash
# Secret de Luis (mismo valor que VENDOR_SYNC_SECRET en la app del cliente)
supabase secrets set APP_SECRET_LUIS_CONFECCION=<VENDOR_SYNC_SECRET_DE_LUIS> --project-ref <PANEL_REF>

# Origen permitido del panel (GitHub Pages)
supabase secrets set PANEL_ORIGIN=https://<GITHUB_USER>.github.io --project-ref <PANEL_REF>

# Secret para sync-all / pg_cron
supabase secrets set CRON_SECRET=$(openssl rand -hex 32) --project-ref <PANEL_REF>
```

Si el Pages URL incluye el path del repo, usa el origin sin path:

`https://eonclothingmiami-create.github.io`

## 5) Desplegar Edge Functions

```bash
supabase functions deploy panel-proxy --project-ref <PANEL_REF>
supabase functions deploy sync-all --project-ref <PANEL_REF>
```

Activa el cron (SQL editor), reemplazando placeholders:

```sql
select cron.schedule(
  'panel-sync-all-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://<PANEL_REF>.supabase.co/functions/v1/sync-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 6) GitHub Pages

1. Settings → Pages → Source: **GitHub Actions**
2. Repo secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Push a `main` dispara `.github/workflows/deploy.yml`
4. URL: `https://<user>.github.io/eon-panel-proveedor/`

Vite `base` = `/eon-panel-proveedor/` · router = `HashRouter`.

## Contrato Luis (solo consumo)

- URL: `https://jspdpvvdbzexggktewgl.supabase.co/functions/v1/vendor-sync`
- `tenant_id`: `luis-confeccion`
- Headers: `X-Vendor-Timestamp`, `X-Vendor-Signature` (HMAC-SHA256)
- Firma en `supabase/functions/_shared/hmac.ts` (tests Vitest con vector fijo)

## Estructura

```
src/features/{auth,apps,clients,payments,layout}
src/lib/{supabase,panel-api,period,semaphore,format}
supabase/migrations
supabase/functions/{panel-proxy,sync-all,_shared}
```

## Nota

No toques el repo ni la base de Luis. Este panel solo consume su `vendor-sync`.
