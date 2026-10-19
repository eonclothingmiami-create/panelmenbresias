import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function env(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const raw = import.meta.env[name]
  return typeof raw === 'string' ? raw.trim() : ''
}

const url = env('VITE_SUPABASE_URL')
const anonKey = env('VITE_SUPABASE_ANON_KEY')

export const isSupabaseConfigured = Boolean(
  url.startsWith('http') && anonKey.length > 0,
)

if (!isSupabaseConfigured) {
  console.error(
    'Supabase no configurado: revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el build.',
  )
}

export const supabase = createClient<Database>(
  isSupabaseConfigured ? url : 'https://prjnlabrlhclythlvbpm.supabase.co',
  isSupabaseConfigured ? anonKey : 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
)

export function panelProxyUrl(): string {
  const base = isSupabaseConfigured ? url : 'https://prjnlabrlhclythlvbpm.supabase.co'
  return `${base.replace(/\/$/, '')}/functions/v1/panel-proxy`
}
