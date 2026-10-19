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

/** Miles con punto (es-CO), sin símbolo de moneda — para inputs. */
export function formatMilesCop(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)
}

/** Slug kebab-case a partir del nombre de la app. */
export function slugifyAppName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
}

export function slugToSecretName(slug: string): string {
  const clean = slug.replace(/-/g, '_').toUpperCase().replace(/[^A-Z0-9_]/g, '')
  return clean ? `APP_SECRET_${clean}` : ''
}

/**
 * Parsea monto COP desde input humano.
 * Acepta "150000", "150.000" (miles CO) o "150,000".
 * Rechaza vacíos, 0, negativos y decimales.
 */
export function parseMontoCop(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Si hay coma y punto, asume formato CO: 1.150.000,50 → no permitido (enteros)
  if (trimmed.includes(',') && trimmed.includes('.')) {
    const normalized = trimmed.replace(/\./g, '').replace(/,/g, '.')
    if (!/^\d+(\.\d+)?$/.test(normalized)) return null
    if (normalized.includes('.')) return null
    const n = Number(normalized)
    return Number.isInteger(n) && n > 0 ? n : null
  }
  if (trimmed.includes(',')) {
    // "150,000" miles US o "150,5" decimal → solo enteros sin parte decimal
    if (/^\d{1,3}(,\d{3})+$/.test(trimmed)) {
      const n = Number(trimmed.replace(/,/g, ''))
      return Number.isInteger(n) && n > 0 ? n : null
    }
    return null
  }
  if (trimmed.includes('.')) {
    // "150.000" miles CO, o "150.5" decimal (rechazar)
    if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
      const n = Number(trimmed.replace(/\./g, ''))
      return Number.isInteger(n) && n > 0 ? n : null
    }
    return null
  }
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  return Number.isInteger(n) && n > 0 ? n : null
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
