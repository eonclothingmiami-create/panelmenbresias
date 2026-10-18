/**
 * HMAC-SHA256 signature for vendor-sync.
 * Pure Web Crypto — works in Deno Edge Functions and browsers/Node (via Vitest).
 *
 * Signature = hex(HMAC_SHA256(secret, `${timestamp}.${METHOD}.${rawBody}`))
 * For GET, rawBody must be "".
 */

const encoder = new TextEncoder()

export function buildSigningPayload(
  timestamp: string | number,
  method: string,
  rawBody: string,
): string {
  return `${timestamp}.${method.toUpperCase()}.${rawBody}`
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bufferToHex(signature)
}

export async function signVendorRequest(options: {
  secret: string
  timestamp: string | number
  method: string
  rawBody?: string
}): Promise<{ timestamp: string; signature: string; payload: string }> {
  const timestamp = String(options.timestamp)
  const rawBody = options.rawBody ?? ''
  const payload = buildSigningPayload(timestamp, options.method, rawBody)
  const signature = await hmacSha256Hex(options.secret, payload)
  return { timestamp, signature, payload }
}

export function epochSecondsNow(): number {
  return Math.floor(Date.now() / 1000)
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
