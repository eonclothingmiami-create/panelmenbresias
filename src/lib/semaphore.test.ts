import { describe, expect, it } from 'vitest'
import { isDueThisWeek, mapAppToSemaphore } from './semaphore'

describe('mapAppToSemaphore', () => {
  it('marca offline si el último check falló', () => {
    expect(
      mapAppToSemaphore({
        cached_status: 'active',
        cached_effective_status: 'active',
        cached_days_left: 20,
        cached_grace_until: null,
        last_check_ok: false,
        last_check_at: '2026-03-01T00:00:00Z',
      }),
    ).toBe('offline')
  })

  it('marca due_soon si quedan ≤3 días', () => {
    expect(
      mapAppToSemaphore({
        cached_status: 'active',
        cached_effective_status: 'active',
        cached_days_left: 2,
        cached_grace_until: null,
        last_check_ok: true,
        last_check_at: '2026-03-01T00:00:00Z',
      }),
    ).toBe('due_soon')
  })

  it('marca in_grace cuando status es past_due', () => {
    expect(
      mapAppToSemaphore({
        cached_status: 'past_due',
        cached_effective_status: 'past_due',
        cached_days_left: 0,
        cached_grace_until: '2026-03-05',
        last_check_ok: true,
        last_check_at: '2026-03-01T00:00:00Z',
      }),
    ).toBe('in_grace')
  })

  it('marca suspended', () => {
    expect(
      mapAppToSemaphore({
        cached_status: 'suspended',
        cached_effective_status: 'suspended',
        cached_days_left: null,
        cached_grace_until: null,
        last_check_ok: true,
        last_check_at: '2026-03-01T00:00:00Z',
      }),
    ).toBe('suspended')
  })

  it('marca active en caso normal', () => {
    expect(
      mapAppToSemaphore({
        cached_status: 'active',
        cached_effective_status: 'active',
        cached_days_left: 18,
        cached_grace_until: null,
        last_check_ok: true,
        last_check_at: '2026-03-01T00:00:00Z',
      }),
    ).toBe('active')
  })
})

describe('isDueThisWeek', () => {
  it('detecta apps que vencen en ≤7 días', () => {
    expect(isDueThisWeek({ cached_days_left: 5, cached_status: 'active' })).toBe(true)
    expect(isDueThisWeek({ cached_days_left: 10, cached_status: 'active' })).toBe(false)
    expect(isDueThisWeek({ cached_days_left: 2, cached_status: 'suspended' })).toBe(false)
  })
})
