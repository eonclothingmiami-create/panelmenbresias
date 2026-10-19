import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, RefreshCwIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { desarrolladorLabel } from '@/lib/desarrolladores'
import { formatBogotaDateTime, formatCop, formatDateOnly } from '@/lib/format'
import { mapAppToSemaphore, semaphoreLabel } from '@/lib/semaphore'
import { supabase } from '@/lib/supabase'
import type { AuditLog, Payment } from '@/types/database'
import { AppActions } from './AppActions'
import { AppBillingEditor } from './AppBillingEditor'
import { useApp, useSyncOne } from './useApps'

export function AppDetailPage() {
  const { appId } = useParams()
  const { data: app, isLoading, error } = useApp(appId)
  const syncOne = useSyncOne()

  const payments = useQuery({
    queryKey: ['payments', appId],
    enabled: Boolean(appId),
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('payments')
        .select('*')
        .eq('app_id', appId!)
        .order('fecha', { ascending: false })
      if (qErr) throw qErr
      return data as Payment[]
    },
  })

  const audit = useQuery({
    queryKey: ['audit', appId],
    enabled: Boolean(appId),
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('audit_log')
        .select('*')
        .eq('app_id', appId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (qErr) throw qErr
      return data as AuditLog[]
    },
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (error || !app) {
    return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'No encontrada'}</p>
  }

  const state = mapAppToSemaphore(app)
  const isLuis = app.slug === 'luis-confeccion'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Dashboard
          </Link>
          <h2 className="font-heading text-2xl">{app.nombre}</h2>
          <p className="text-sm text-muted-foreground">
            {app.clients?.nombre} · {app.slug} · tenant {app.tenant_id}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="w-fit">
              {semaphoreLabel(state)}
            </Badge>
            <Badge variant="secondary" className="w-fit">
              Dev: {desarrolladorLabel(app.desarrollado_por)}
            </Badge>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => syncOne.mutate(app.id)}
          disabled={syncOne.isPending}
        >
          <RefreshCwIcon
            data-icon="inline-start"
            className={syncOne.isPending ? 'animate-spin' : undefined}
          />
          Sincronizar
        </Button>
      </div>

      {isLuis ? (
        <Alert>
          <AlertTitle>Nota — Sistema para la Confección (Luis)</AlertTitle>
          <AlertDescription>
            El bloqueo real de escritura se activa cuando la app tenga aplicada su fase 3
            (migración 030000); antes de eso solo se muestran los banners.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Estado remoto" value={app.cached_status ?? '—'} />
        <Meta label="Effective" value={app.cached_effective_status ?? '—'} />
        <Meta label="Periodo hasta" value={formatDateOnly(app.cached_current_period_end)} />
        <Meta
          label={
            (app.cached_effective_status ?? app.cached_status) === 'past_due'
              ? 'En gracia hasta'
              : 'Gracia potencial hasta'
          }
          value={formatDateOnly(app.cached_grace_until)}
        />
        <Meta
          label="Días restantes"
          value={typeof app.cached_days_left === 'number' ? String(app.cached_days_left) : '—'}
        />
        <Meta
          label="Enforcement"
          value={app.cached_enforcement_enabled == null ? '—' : app.cached_enforcement_enabled ? 'ON' : 'OFF'}
        />
        <Meta label="Panel version" value={String(app.panel_version)} />
        <Meta label="Último sync" value={formatBogotaDateTime(app.last_check_at)} />
      </section>

      {app.cached_message ? (
        <p className="rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
          Mensaje al cliente: {app.cached_message}
        </p>
      ) : null}

      {app.last_check_ok === false ? (
        <Alert variant="destructive">
          <AlertTitle>Última conexión fallida</AlertTitle>
          <AlertDescription>{app.last_check_error ?? 'error'}</AlertDescription>
        </Alert>
      ) : null}

      <AppBillingEditor app={app} />

      <AppActions app={app} />

      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-lg">Historial de pagos</h3>
        <PaymentsTable rows={payments.data ?? []} loading={payments.isLoading} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-lg">Audit log</h3>
        <AuditTable rows={audit.data ?? []} loading={audit.isLoading} />
      </section>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/70 p-3">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium break-all">{value}</p>
    </div>
  )
}

function PaymentsTable({ rows, loading }: { rows: Payment[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-24" />
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sin pagos aún.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Periodo</TableHead>
          <TableHead>Medio</TableHead>
          <TableHead>Ref</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{formatDateOnly(p.fecha)}</TableCell>
            <TableCell>{formatCop(p.monto_cop)}</TableCell>
            <TableCell>
              {formatDateOnly(p.periodo_desde)} → {formatDateOnly(p.periodo_hasta)}
            </TableCell>
            <TableCell>{p.medio ?? '—'}</TableCell>
            <TableCell>{p.referencia ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function AuditTable({ rows, loading }: { rows: AuditLog[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-24" />
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sin eventos.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cuándo</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>HTTP</TableHead>
          <TableHead>Código</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{formatBogotaDateTime(r.created_at)}</TableCell>
            <TableCell>{r.accion}</TableCell>
            <TableCell>{r.http_status ?? '—'}</TableCell>
            <TableCell>{r.response_code ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
