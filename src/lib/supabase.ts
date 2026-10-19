import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Solo proyecto Panel de Apps (prjnlabrlhclythlvbpm).
 * No Luis / no Eonclothing.
 *
 * La anon key es pública por diseño (cliente). Fallback embebido para que
 * GitHub Pages no quede roto si Actions inyecta secrets vacíos.
 */
const PANEL_URL = 'https://prjnlabrlhclythlvbpm.supabase.co'
const PANEL_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByam5sYWJybGhjbHl0aGx2YnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNTUyMjUsImV4cCI6MjEwNzkzMTIyNX0.1B2OJInlwoZchakq9o-wzj6lgy3_MD1DxfPKAQRW_Tc'

function readVite(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const raw = import.meta.env[name]
  if (typeof raw !== 'string') return ''
  const v = raw.trim()
  if (!v || v === 'undefined' || v === 'null') return ''
  return v
}

const fromEnvUrl = readVite('VITE_SUPABASE_URL')
const fromEnvAnon = readVite('VITE_SUPABASE_ANON_KEY')

const url =
  fromEnvUrl.startsWith('https://') && fromEnvUrl.includes('prjnlabrlhclythlvbpm')
    ? fromEnvUrl
    : fromEnvUrl.startsWith('https://') && !fromEnvUrl.includes('placeholder')
      ? fromEnvUrl
      : PANEL_URL

const anonKey = fromEnvAnon.length > 20 ? fromEnvAnon : PANEL_ANON

export const panelAnonKey = anonKey

export const isSupabaseConfigured = Boolean(
  url.startsWith('https://') && anonKey.length > 20,
)

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

export function panelProxyUrl(): string {
  return `${url.replace(/\/$/, '')}/functions/v1/panel-proxy`
}
