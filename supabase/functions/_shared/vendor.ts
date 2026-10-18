import { epochSecondsNow, signVendorRequest } from './hmac.ts'

export interface VendorState {
  tenant_id: string
  status: string
  effective_status: string
  current_period_end: string
  grace_until: string | null
  days_left: number
  days_left_in_grace: number | null
  enforcement_enabled: boolean
  message: string | null
  source: string
  last_synced_at: string
  panel_version: number
}

export interface VendorCallResult {
  ok: boolean
  httpStatus: number
  code?: string
  state?: VendorState
  body?: unknown
}

export async function vendorGet(
  url: string,
  secret: string,
): Promise<VendorCallResult> {
  const { timestamp, signature } = await signVendorRequest({
    secret,
    timestamp: epochSecondsNow(),
    method: 'GET',
    rawBody: '',
  })

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Vendor-Timestamp': timestamp,
      'X-Vendor-Signature': signature,
    },
  })

  return parseVendorResponse(res)
}

export async function vendorPost(
  url: string,
  secret: string,
  body: Record<string, unknown>,
): Promise<VendorCallResult> {
  const rawBody = JSON.stringify(body)
  const { timestamp, signature } = await signVendorRequest({
    secret,
    timestamp: epochSecondsNow(),
    method: 'POST',
    rawBody,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vendor-Timestamp': timestamp,
      'X-Vendor-Signature': signature,
    },
    body: rawBody,
  })

  return parseVendorResponse(res)
}

async function parseVendorResponse(res: Response): Promise<VendorCallResult> {
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (res.ok) {
    if (json && typeof json === 'object' && 'ok' in json && (json as { ok: boolean }).ok) {
      const state = (json as { state?: VendorState }).state
      return { ok: true, httpStatus: res.status, state, body: json }
    }
    if (json && typeof json === 'object' && 'tenant_id' in json) {
      return { ok: true, httpStatus: res.status, state: json as VendorState, body: json }
    }
    return { ok: true, httpStatus: res.status, body: json }
  }

  const code =
    json && typeof json === 'object' && 'error' in json
      ? String((json as { error: unknown }).error)
      : json && typeof json === 'object' && 'code' in json
        ? String((json as { code: unknown }).code)
        : `http_${res.status}`

  return { ok: false, httpStatus: res.status, code, body: json }
}

export function cacheFieldsFromState(state: VendorState) {
  return {
    cached_status: state.status,
    cached_effective_status: state.effective_status,
    cached_current_period_end: state.current_period_end,
    cached_grace_until: state.grace_until,
    cached_days_left: state.days_left,
    cached_days_left_in_grace: state.days_left_in_grace,
    cached_enforcement_enabled: state.enforcement_enabled,
    cached_message: state.message,
    cached_source: state.source,
    cached_last_synced_at: state.last_synced_at,
    panel_version: state.panel_version,
    last_check_at: new Date().toISOString(),
    last_check_ok: true,
    last_check_error: null,
  }
}
