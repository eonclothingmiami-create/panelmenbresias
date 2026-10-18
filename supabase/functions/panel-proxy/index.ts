import { corsHeaders, resolveAllowedOrigin } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabase.ts'
import {
  cacheFieldsFromState,
  vendorGet,
  vendorPost,
  type VendorState,
} from '../_shared/vendor.ts'

type Action = 'status' | 'apply' | 'test_connection'

interface RequestBody {
  action: Action
  app_id?: string
  vendor_sync_url?: string
  secret_name?: string
  tenant_id?: string
  status?: string
  current_period_end?: string
  grace_until?: string | null
  enforcement_enabled?: boolean
  message?: string | null
}

Deno.serve(async (req) => {
  const origin = resolveAllowedOrigin(
    req.headers.get('Origin'),
    Deno.env.get('PANEL_ORIGIN') ?? undefined,
  )
  const headers = {
    ...corsHeaders(origin),
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    if (!origin) return new Response(null, { status: 403 })
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, code: 'method_not_allowed' }, 405, headers)
  }

  if (!origin && req.headers.get('Origin')) {
    return json({ ok: false, code: 'cors_denied' }, 403, headers)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ ok: false, code: 'unauthorized' }, 401, headers)
    }

    const userClient = createUserClient(authHeader)
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return json({ ok: false, code: 'unauthorized' }, 401, headers)
    }

    const aal = await getAal(authHeader)
    if (aal !== 'aal2') {
      return json({ ok: false, code: 'mfa_required' }, 403, headers)
    }

    const service = createServiceClient()
    const { data: owner } = await service
      .from('owners')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!owner) {
      return json({ ok: false, code: 'forbidden' }, 403, headers)
    }

    const body = (await req.json()) as RequestBody
    if (!body?.action) {
      return json({ ok: false, code: 'validation_error' }, 400, headers)
    }

    if (body.action === 'test_connection') {
      return await handleTestConnection(body, headers)
    }

    if (!body.app_id) {
      return json({ ok: false, code: 'validation_error' }, 400, headers)
    }

    const { data: app, error: appError } = await service
      .from('apps')
      .select('*')
      .eq('id', body.app_id)
      .single()

    if (appError || !app) {
      return json({ ok: false, code: 'not_found' }, 404, headers)
    }

    const secret = Deno.env.get(app.secret_name)
    if (!secret) {
      await markCheckError(service, app.id, 'secret_missing')
      return json({ ok: false, code: 'secret_missing' }, 500, headers)
    }

    if (body.action === 'status') {
      const result = await vendorGet(app.vendor_sync_url, secret)
      await writeAudit(service, {
        user_id: user.id,
        app_id: app.id,
        accion: 'status',
        payload: { tenant_id: app.tenant_id },
        http_status: result.httpStatus,
        response_code: result.code ?? (result.ok ? 'ok' : 'error'),
        response_body: sanitizeBody(result.body),
      })

      if (!result.ok || !result.state) {
        await markCheckError(service, app.id, result.code ?? 'vendor_error')
        return json(
          { ok: false, code: result.code ?? 'vendor_error' },
          result.httpStatus || 502,
          headers,
        )
      }

      await service.from('apps').update(cacheFieldsFromState(result.state)).eq('id', app.id)
      return json({ ok: true, state: result.state }, 200, headers)
    }

    if (body.action === 'apply') {
      return await handleApply({
        service,
        userId: user.id,
        app,
        secret,
        body,
        headers,
      })
    }

    return json({ ok: false, code: 'validation_error' }, 400, headers)
  } catch (err) {
    console.error('panel-proxy error', err)
    return json({ ok: false, code: 'internal_error' }, 500, headers)
  }
})

async function handleTestConnection(body: RequestBody, headers: HeadersInit) {
  if (!body.vendor_sync_url || !body.secret_name) {
    return json({ ok: false, code: 'validation_error' }, 400, headers)
  }
  const secret = Deno.env.get(body.secret_name)
  if (!secret) {
    return json({ ok: false, code: 'secret_missing' }, 500, headers)
  }
  const result = await vendorGet(body.vendor_sync_url, secret)
  if (!result.ok || !result.state) {
    return json(
      { ok: false, code: result.code ?? 'vendor_error' },
      result.httpStatus || 502,
      headers,
    )
  }
  if (body.tenant_id && result.state.tenant_id !== body.tenant_id) {
    return json({ ok: false, code: 'tenant_mismatch' }, 403, headers)
  }
  return json({ ok: true, state: result.state }, 200, headers)
}

async function handleApply(opts: {
  service: ReturnType<typeof createServiceClient>
  userId: string
  app: Record<string, unknown>
  secret: string
  body: RequestBody
  headers: HeadersInit
}) {
  const { service, userId, app, secret, body, headers } = opts
  const appId = String(app.id)
  const tenantId = String(app.tenant_id)
  const vendorUrl = String(app.vendor_sync_url)
  let panelVersion = Number(app.panel_version ?? 0) + 1

  const applyBody = {
    tenant_id: tenantId,
    status: body.status,
    current_period_end: body.current_period_end,
    grace_until: body.grace_until ?? null,
    enforcement_enabled: body.enforcement_enabled ?? false,
    message: body.message ?? null,
    panel_version: panelVersion,
  }

  if (!applyBody.status || !applyBody.current_period_end) {
    return json({ ok: false, code: 'validation_error' }, 400, headers)
  }

  let result = await vendorPost(vendorUrl, secret, applyBody)

  if (!result.ok && result.httpStatus === 409 && result.code === 'stale_panel_version') {
    const remote = await vendorGet(vendorUrl, secret)
    if (remote.ok && remote.state) {
      panelVersion = remote.state.panel_version + 1
      applyBody.panel_version = panelVersion
      result = await vendorPost(vendorUrl, secret, applyBody)
    }
  }

  await writeAudit(service, {
    user_id: userId,
    app_id: appId,
    accion: 'apply',
    payload: applyBody,
    http_status: result.httpStatus,
    response_code: result.code ?? (result.ok ? 'ok' : 'error'),
    response_body: sanitizeBody(result.body),
  })

  if (!result.ok) {
    await markCheckError(service, appId, result.code ?? 'apply_failed')
    return json(
      { ok: false, code: result.code ?? 'apply_failed' },
      result.httpStatus || 502,
      headers,
    )
  }

  const state: VendorState | undefined =
    result.state ??
    (result.body && typeof result.body === 'object' && 'state' in result.body
      ? (result.body as { state: VendorState }).state
      : undefined)

  if (state) {
    await service.from('apps').update(cacheFieldsFromState(state)).eq('id', appId)
    return json({ ok: true, state }, 200, headers)
  }

  const refreshed = await vendorGet(vendorUrl, secret)
  if (refreshed.ok && refreshed.state) {
    await service.from('apps').update(cacheFieldsFromState(refreshed.state)).eq('id', appId)
    return json({ ok: true, state: refreshed.state }, 200, headers)
  }

  await service
    .from('apps')
    .update({
      panel_version: panelVersion,
      last_check_at: new Date().toISOString(),
      last_check_ok: true,
    })
    .eq('id', appId)

  return json({ ok: true }, 200, headers)
}

async function getAal(authHeader: string): Promise<string | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')))
    return (payload.aal as string) ?? null
  } catch {
    return null
  }
}

async function markCheckError(
  service: ReturnType<typeof createServiceClient>,
  appId: string,
  code: string,
) {
  await service
    .from('apps')
    .update({
      last_check_at: new Date().toISOString(),
      last_check_ok: false,
      last_check_error: code,
    })
    .eq('id', appId)
}

async function writeAudit(
  service: ReturnType<typeof createServiceClient>,
  row: Record<string, unknown>,
) {
  await service.from('audit_log').insert(row)
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const clone = { ...(body as Record<string, unknown>) }
  delete clone.secret
  delete clone.signature
  return clone
}

function json(body: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers })
}
