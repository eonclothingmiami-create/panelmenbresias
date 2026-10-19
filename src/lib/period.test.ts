import { describe, expect, it } from 'vitest'
import { addMonthsKeepingDueDay, nextDueDate, renewPeriodEnd } from './period'

describe('nextDueDate', () => {
  it('avanza al próximo mes si ya pasó el día de vencimiento', () => {
    expect(nextDueDate('2026-03-15', 10)).toBe('2026-04-10')
  })

  it('usa el mismo mes si aún no llega el día', () => {
    expect(nextDueDate('2026-03-05', 10)).toBe('2026-03-10')
  })

  it('si cae exactamente en el día, fuerza el siguiente mes', () => {
    expect(nextDueDate('2026-03-10', 10)).toBe('2026-04-10')
  })

  it('ajusta días inexistentes (31 → fin de febrero)', () => {
    expect(nextDueDate('2026-01-31', 31, { forceNextMonth: true })).toBe('2026-02-28')
  })

  it('cruza de año correctamente', () => {
    expect(nextDueDate('2026-12-20', 5)).toBe('2027-01-05')
  })
})

describe('addMonthsKeepingDueDay', () => {
  it('suma un mes desde el vencimiento actual', () => {
    expect(addMonthsKeepingDueDay('2026-03-10', 10, 1)).toBe('2026-04-10')
  })

  it('suma varios meses', () => {
    expect(addMonthsKeepingDueDay('2026-01-15', 15, 3)).toBe('2026-04-15')
  })
})

describe('renewPeriodEnd', () => {
  it('si el periodo ya venció, cuenta desde hoy (no desde el vencimiento viejo)', () => {
    // venció 10 ene; paga el 18 oct → próximo 10 nov
    expect(renewPeriodEnd('2026-01-10', 10, '2026-10-18')).toBe('2026-11-10')
  })

  it('si aún está dentro del periodo, avanza un mes desde el vencimiento', () => {
    expect(renewPeriodEnd('2026-11-06', 6, '2026-10-18')).toBe('2026-12-06')
  })

  it('si paga el mismo día del vencimiento, avanza un mes', () => {
    expect(renewPeriodEnd('2026-11-06', 6, '2026-11-06')).toBe('2026-12-06')
  })
})
