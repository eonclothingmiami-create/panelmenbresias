import { panelAnonKey, panelProxyUrl, supabase } from '@/lib/supabase'
import type { PanelProxyResponse, VendorSyncState } from '@/types/database'

/** JWT fresco: getSession puede devolver access_token vencido y el proxy responde 401. */
async function authHeader(): Promise<string> {
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (!refreshError && refreshed.session?.access_token) {
    return `Bearer ${refreshed.session.access_token}`
  }

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Sesión vencida — cierra sesión y vuelve a entrar')
  }
  return `Bearer ${token}`
}

function normalizeProxyResponse(
  res: Response,
  json: PanelProxyResponse,
): PanelProxyResponse {
  if (res.ok && json.ok) return json

  if (res.status === 401) {
    return {
      ok: false,
      code: 'unauthorized',
      message:
        typeof (json as { message?: string }).message === 'string'
          ? (json as { message: string }).message
          : 'Sesión inválida o vencida — cierra sesión y vuelve a entrar',
    }
  }

  if (!json.ok || !json.code) {
    const code =
      typeof json.code === 'string' && json.code
        ? json.code
        : `http_${res.status}`
    return { ...json, ok: false, code }
  }

  return { ...json, ok: false }
}

export async function callPanelProxy(
  body: Record<string, unknown>,
): Promise<PanelProxyResponse> {
  const res = await fetch(panelProxyUrl(), {
    method: 'POST',
    headers: {
      Authorization: await authHeader(),
      apikey: panelAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let json: PanelProxyResponse
  try {
    json = (await res.json()) as PanelProxyResponse
  } catch {
    json = { ok: false, code: 'invalid_json' }
  }

  return normalizeProxyResponse(res, json)
}

export async function syncAppStatus(appId: string): Promise<PanelProxyResponse> {
  return callPanelProxy({ action: 'status', app_id: appId })
}

export async function applyAppState(
  appId: string,
  payload: {
    status: string
    current_period_end: string
    grace_until?: string | null
    enforcement_enabled?: boolean
    message?: string | null
  },
): Promise<PanelProxyResponse> {
  return callPanelProxy({ action: 'apply', app_id: appId, ...payload })
}

export async function testConnection(input: {
  vendor_sync_url: string
  secret_name: string
  tenant_id?: string
}): Promise<PanelProxyResponse> {
  return callPanelProxy({ action: 'test_connection', ...input })
}

export type { VendorSyncState }
