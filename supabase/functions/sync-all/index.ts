import { createServiceClient } from '../_shared/supabase.ts'
import { cacheFieldsFromState, vendorGet } from '../_shared/vendor.ts'

/**
 * sync-all — ejecutado por pg_cron cada hora.
 * Auth: Authorization Bearer CRON_SECRET  OR  service role key.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ ok: false, code: 'method_not_allowed' }, 405)
  }

  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  const cronSecret = Deno.env.get('CRON_SECRET')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const authorized =
    (cronSecret && token === cronSecret) || (serviceKey && token === serviceKey)

  if (!authorized) {
    return json({ ok: false, code: 'unauthorized' }, 401)
  }

  try {
    const service = createServiceClient()
    const { data: apps, error } = await service
      .from('apps')
      .select('id, vendor_sync_url, secret_name, tenant_id')
      .eq('activa_en_panel', true)

    if (error) {
      console.error(error)
      return json({ ok: false, code: 'internal_error' }, 500)
    }

    const results: Array<{ app_id: string; ok: boolean; code?: string }> = []

    for (const app of apps ?? []) {
      const secret = Deno.env.get(app.secret_name)
      if (!secret) {
        await service
          .from('apps')
          .update({
            last_check_at: new Date().toISOString(),
            last_check_ok: false,
            last_check_error: 'secret_missing',
          })
          .eq('id', app.id)
        results.push({ app_id: app.id, ok: false, code: 'secret_missing' })
        continue
      }

      try {
        const result = await vendorGet(app.vendor_sync_url, secret)
        if (!result.ok || !result.state) {
          await service
            .from('apps')
            .update({
              last_check_at: new Date().toISOString(),
              last_check_ok: false,
              last_check_error: result.code ?? 'vendor_error',
            })
            .eq('id', app.id)
          results.push({ app_id: app.id, ok: false, code: result.code })
          continue
        }

        await service.from('apps').update(cacheFieldsFromState(result.state)).eq('id', app.id)
        await service.from('audit_log').insert({
          user_id: null,
          app_id: app.id,
          accion: 'sync_all',
          payload: { tenant_id: app.tenant_id },
          http_status: result.httpStatus,
          response_code: 'ok',
          response_body: { panel_version: result.state.panel_version },
        })
        results.push({ app_id: app.id, ok: true })
      } catch (err) {
        console.error('sync app failed', app.id, err)
        await service
          .from('apps')
          .update({
            last_check_at: new Date().toISOString(),
            last_check_ok: false,
            last_check_error: 'internal_error',
          })
          .eq('id', app.id)
        results.push({ app_id: app.id, ok: false, code: 'internal_error' })
      }
    }

    return json({ ok: true, results }, 200)
  } catch (err) {
    console.error('sync-all error', err)
    return json({ ok: false, code: 'internal_error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
