import { RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { formatCop } from '@/lib/format'
import { isDueThisWeek, mapAppToSemaphore } from '@/lib/semaphore'
import { AppCard } from './AppCard'
import { useApps, useSyncAll } from './useApps'

export function DashboardPage() {
  const { data: apps, isLoading, error } = useApps()
  const syncAll = useSyncAll()

  const activeApps = apps?.filter((a) => a.activa_en_panel) ?? []
  const monthlyTotal = activeApps.reduce((sum, a) => sum + a.precio_mensual_cop, 0)
  const dueThisWeek = activeApps.filter(isDueThisWeek)
  const offline = activeApps.filter((a) => mapAppToSemaphore(a) === 'offline')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Semáforo de suscripciones · zona horaria America/Bogota · COP
          </p>
        </div>
        <Button
          type="button"
          onClick={() => syncAll.mutate(activeApps)}
          disabled={syncAll.isPending || activeApps.length === 0}
        >
          <RefreshCwIcon
            data-icon="inline-start"
            className={syncAll.isPending ? 'animate-spin' : undefined}
          />
          Sincronizar todo
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total mensual facturable" value={formatCop(monthlyTotal)} />
        <Stat label="Vencen esta semana" value={String(dueThisWeek.length)} />
        <Stat label="Alertas de conexión" value={String(offline.length)} />
      </section>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : !apps?.length ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Sin apps conectadas</EmptyTitle>
            <EmptyDescription>
              Usa Conectar app para registrar la primera (Luis / Confección).
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-heading text-2xl">{value}</p>
    </div>
  )
}
