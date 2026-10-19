import { panelAnonKey, panelProxyUrl, supabase } from '@/lib/supabase'
import type { PanelProxyResponse, VendorSyncState } from '@/types/database'

async function authHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sin sesión')
  return `Bearer ${token}`
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

  if (!res.ok && !json.code) {
    json = { ...json, ok: false, code: `http_${res.status}` }
  }
  return json
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
