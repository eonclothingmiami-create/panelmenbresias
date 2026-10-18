import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { formatBogotaDateTime, formatCop, formatDateOnly } from '@/lib/format'
import { mapAppToSemaphore, semaphoreLabel, semaphoreTone } from '@/lib/semaphore'
import { cn } from '@/lib/utils'
import type { AppWithClient } from '@/types/database'

const toneClass = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-foreground border-warning/40',
  danger: 'bg-danger/15 text-danger border-danger/30',
  muted: 'bg-muted text-muted-foreground border-border',
} as const

export function AppCard({ app }: { app: AppWithClient }) {
  const state = mapAppToSemaphore(app)
  const tone = semaphoreTone(state)

  return (
    <Link
      to={`/apps/${app.id}`}
      className="block rounded-xl border border-border/70 bg-card/80 p-4 transition hover:border-primary/40 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg leading-tight">{app.nombre}</h2>
          <p className="text-sm text-muted-foreground">
            {app.clients?.nombre ?? 'Sin cliente'} · {app.slug}
          </p>
        </div>
        <Badge variant="outline" className={cn('shrink-0', toneClass[tone])}>
          {semaphoreLabel(state)}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Días restantes</dt>
          <dd className="font-medium">
            {typeof app.cached_days_left === 'number' ? app.cached_days_left : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Próximo cobro</dt>
          <dd className="font-medium">{formatCop(app.precio_mensual_cop)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Periodo hasta</dt>
          <dd className="font-medium">{formatDateOnly(app.cached_current_period_end)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Último sync</dt>
          <dd className="font-medium">{formatBogotaDateTime(app.last_check_at)}</dd>
        </div>
      </dl>
    </Link>
  )
}
