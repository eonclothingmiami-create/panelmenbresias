import { describe, expect, it } from 'vitest'
import { formatCop } from './format'

describe('formatCop', () => {
  it('formatea COP en es-CO', () => {
    const out = formatCop(150000)
    expect(out).toMatch(/150/)
    expect(out).toMatch(/\$|COP/)
  })
})
