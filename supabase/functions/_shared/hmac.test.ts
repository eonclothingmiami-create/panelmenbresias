import { describe, expect, it } from 'vitest'
import { buildSigningPayload, hmacSha256Hex, signVendorRequest } from './hmac'

const FIXED_SECRET = 'test-secret-vector'
const FIXED_TIMESTAMP = '1700000000'
const FIXED_BODY = '{"tenant_id":"luis-confeccion"}'
const FIXED_PAYLOAD = '1700000000.POST.{"tenant_id":"luis-confeccion"}'
const FIXED_SIGNATURE =
  '742dc18ca07c348f343858d7b47750c15dc3c1d985d677211c7e4d8e439cb690'
const FIXED_GET_SIGNATURE =
  'a3f60523e23c926fe71f2fa242d7345e81a01b952b8d48ec5f47a7d779d95e16'

describe('buildSigningPayload', () => {
  it('concatena timestamp.METHOD.body', () => {
    expect(buildSigningPayload(FIXED_TIMESTAMP, 'post', FIXED_BODY)).toBe(FIXED_PAYLOAD)
  })

  it('usa body vacío para GET', () => {
    expect(buildSigningPayload(FIXED_TIMESTAMP, 'GET', '')).toBe('1700000000.GET.')
  })
})

describe('hmacSha256Hex', () => {
  it('produce el vector fijo conocido para POST', async () => {
    const sig = await hmacSha256Hex(FIXED_SECRET, FIXED_PAYLOAD)
    expect(sig).toBe(FIXED_SIGNATURE)
  })

  it('GET firma con body vacío', async () => {
    const { signature, payload } = await signVendorRequest({
      secret: FIXED_SECRET,
      timestamp: FIXED_TIMESTAMP,
      method: 'GET',
      rawBody: '',
    })
    expect(payload).toBe('1700000000.GET.')
    expect(signature).toBe(FIXED_GET_SIGNATURE)
  })

  it('signVendorRequest firma el mismo string que se enviará', async () => {
    const { signature } = await signVendorRequest({
      secret: FIXED_SECRET,
      timestamp: FIXED_TIMESTAMP,
      method: 'POST',
      rawBody: FIXED_BODY,
    })
    expect(signature).toBe(FIXED_SIGNATURE)
  })
})
