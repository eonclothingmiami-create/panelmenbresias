/**
 * Calcula el próximo día de vencimiento a partir de una fecha ISO (YYYY-MM-DD)
 * y el día de cobro (1-31). Si el día no existe en el mes (ej. 31 en febrero),
 * se usa el último día del mes.
 */
export function nextDueDate(
  fromIsoDate: string,
  diaVencimiento: number,
  options?: { forceNextMonth?: boolean },
): string {
  if (diaVencimiento < 1 || diaVencimiento > 31) {
    throw new Error('dia_vencimiento debe estar entre 1 y 31')
  }

  const [y, m, d] = fromIsoDate.split('-').map(Number)
  if (!y || !m || !d) throw new Error(`fecha inválida: ${fromIsoDate}`)

  let year = y
  let monthIndex = m - 1 // 0-based

  const dayInMonth = clampDay(year, monthIndex, diaVencimiento)
  const forceNext = options?.forceNextMonth ?? false

  if (forceNext || d >= dayInMonth) {
    monthIndex += 1
    if (monthIndex > 11) {
      monthIndex = 0
      year += 1
    }
  }

  const targetDay = clampDay(year, monthIndex, diaVencimiento)
  return toIso(year, monthIndex + 1, targetDay)
}

export function addMonthsKeepingDueDay(
  fromIsoDate: string,
  diaVencimiento: number,
  months = 1,
): string {
  let cursor = fromIsoDate
  for (let i = 0; i < months; i += 1) {
    cursor = nextDueDate(cursor, diaVencimiento, { forceNextMonth: true })
  }
  return cursor
}

function clampDay(year: number, monthIndex: number, day: number): number {
  const last = lastDayOfMonth(year, monthIndex)
  return Math.min(day, last)
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function toIso(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}
