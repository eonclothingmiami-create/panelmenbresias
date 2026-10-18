import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { format, parseISO } from 'date-fns'

export const BOGOTA = 'America/Bogota'

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCop(value: number): string {
  return cop.format(value)
}

export function formatBogotaDate(
  value: string | Date | null | undefined,
  pattern = 'd MMM yyyy',
): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  return formatInTimeZone(date, BOGOTA, pattern, { locale: es })
}

export function formatBogotaDateTime(value: string | Date | null | undefined): string {
  return formatBogotaDate(value, "d MMM yyyy, HH:mm 'COT'")
}

export function todayBogotaIso(): string {
  return formatInTimeZone(new Date(), BOGOTA, 'yyyy-MM-dd')
}

export function bogotaNow(): Date {
  return toZonedTime(new Date(), BOGOTA)
}

/** Local date-only formatting without timezone shift surprises for YYYY-MM-DD. */
export function formatDateOnly(isoDate: string | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return format(new Date(y, m - 1, d), pattern, { locale: es })
}
