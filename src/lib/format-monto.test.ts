import { describe, expect, it } from 'vitest'
import { formatMilesCop, parseMontoCop, slugToSecretName, slugifyAppName } from './format'

describe('parseMontoCop', () => {
  it('acepta enteros simples', () => {
    expect(parseMontoCop('150000')).toBe(150000)
  })

  it('acepta miles con punto (CO)', () => {
    expect(parseMontoCop('150.000')).toBe(150000)
  })

  it('acepta miles con coma', () => {
    expect(parseMontoCop('150,000')).toBe(150000)
  })

  it('rechaza 0, vacío y decimales', () => {
    expect(parseMontoCop('0')).toBeNull()
    expect(parseMontoCop('')).toBeNull()
    expect(parseMontoCop('150.50')).toBeNull()
    expect(parseMontoCop('abc')).toBeNull()
  })
})

describe('formatMilesCop / slugify', () => {
  it('formatea miles CO', () => {
    expect(formatMilesCop(150000)).toMatch(/150/)
  })

  it('slugifica nombre de app', () => {
    expect(slugifyAppName('Sistema para la Confección')).toBe('sistema-para-la-confeccion')
    expect(slugToSecretName('luis-confeccion')).toBe('APP_SECRET_LUIS_CONFECCION')
  })
})
