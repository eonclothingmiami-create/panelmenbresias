export function resolveAllowedOrigin(
  requestOrigin: string | null,
  panelOrigin: string | undefined,
): string | null {
  const allowed = new Set<string>()
  if (panelOrigin) allowed.add(panelOrigin.replace(/\/$/, ''))
  allowed.add('http://localhost:5173')
  allowed.add('http://127.0.0.1:5173')
  allowed.add('http://localhost:4173')
  allowed.add('http://127.0.0.1:4173')

  if (!requestOrigin) return null
  const normalized = requestOrigin.replace(/\/$/, '')
  return allowed.has(normalized) ? normalized : null
}

export function corsHeaders(origin: string | null): HeadersInit {
  if (!origin) {
    return {
      Vary: 'Origin',
    }
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}
