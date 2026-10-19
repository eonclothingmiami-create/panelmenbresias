import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type AuthGate = 'loading' | 'unconfigured' | 'signed_out' | 'ready'

interface AuthContextValue {
  gate: AuthGate
  session: Session | null
  user: User | null
  isOwner: boolean
  refreshAuth: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<AuthGate>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  )
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const evaluate = useCallback(async (nextSession: Session | null) => {
    if (!isSupabaseConfigured) {
      setGate('unconfigured')
      setSession(null)
      setUser(null)
      setIsOwner(false)
      return
    }

    setSession(nextSession)
    setUser(nextSession?.user ?? null)

    if (!nextSession) {
      setIsOwner(false)
      setGate('signed_out')
      return
    }

    // Timeout para no dejar el UI en loading eterno si RLS/red fallan
    const ownersQuery = supabase
      .from('owners')
      .select('user_id')
      .eq('user_id', nextSession.user.id)
      .maybeSingle()

    const timeout = new Promise<{ data: null; error: { message: string } }>((resolve) => {
      setTimeout(() => resolve({ data: null, error: { message: 'timeout owners' } }), 12_000)
    })

    const { data: ownerRow, error } = await Promise.race([ownersQuery, timeout])
    if (error && error.message !== 'timeout owners') {
      console.error('owners check', error)
    }

    setIsOwner(Boolean(ownerRow))
    setGate('ready')
  }, [])

  const refreshAuth = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await evaluate(data.session)
  }, [evaluate])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    void refreshAuth()

    // IMPORTANTE: no await supabase.from() dentro del callback síncrono de
    // onAuthStateChange — bloquea el cliente auth (deadlock). Diferir.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      queueMicrotask(() => {
        void evaluate(next)
      })
    })
    return () => sub.subscription.unsubscribe()
  }, [evaluate, refreshAuth])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      // Evaluar de inmediato con la sesión recibida (no esperar solo al event)
      await evaluate(data.session)
      return { error: null }
    },
    [evaluate],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    await evaluate(null)
  }, [evaluate])

  const value = useMemo<AuthContextValue>(
    () => ({
      gate,
      session,
      user,
      isOwner,
      refreshAuth,
      signIn,
      signOut,
    }),
    [gate, session, user, isOwner, refreshAuth, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
