import type { App, SemaphoreState, SubscriptionStatus } from '@/types/database'

export interface SemaphoreInput {
  cached_status: string | null
  cached_effective_status: string | null
  cached_days_left: number | null
  cached_grace_until: string | null
  last_check_ok: boolean | null
  last_check_at: string | null
}

const DUE_SOON_DAYS = 3

export function mapAppToSemaphore(app: SemaphoreInput): SemaphoreState {
  if (app.last_check_ok === false) return 'offline'

  const status = (app.cached_effective_status ?? app.cached_status ?? '').toLowerCase()

  if (status === 'suspended') return 'suspended'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'past_due' || app.cached_grace_until) return 'in_grace'

  if (status === 'active') {
    const days = app.cached_days_left
    if (typeof days === 'number' && days <= DUE_SOON_DAYS) return 'due_soon'
    return 'active'
  }

  if (!app.last_check_at) return 'unknown'
  return 'unknown'
}

export function semaphoreLabel(state: SemaphoreState): string {
  switch (state) {
    case 'active':
      return 'Activa'
    case 'due_soon':
      return 'Vence pronto'
    case 'in_grace':
      return 'En gracia'
    case 'suspended':
      return 'Suspendida'
    case 'offline':
      return 'Sin conexión'
    case 'cancelled':
      return 'Cancelada'
    default:
      return 'Sin datos'
  }
}

export function semaphoreTone(
  state: SemaphoreState,
): 'success' | 'warning' | 'danger' | 'muted' {
  switch (state) {
    case 'active':
      return 'success'
    case 'due_soon':
    case 'in_grace':
      return 'warning'
    case 'suspended':
    case 'offline':
      return 'danger'
    default:
      return 'muted'
  }
}

export function isDueThisWeek(app: Pick<App, 'cached_days_left' | 'cached_status'>): boolean {
  const status = (app.cached_status ?? '').toLowerCase() as SubscriptionStatus | ''
  if (status === 'suspended' || status === 'cancelled') return false
  const days = app.cached_days_left
  return typeof days === 'number' && days >= 0 && days <= 7
}
