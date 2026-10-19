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

    const { data: ownerRow } = await supabase
      .from('owners')
      .select('user_id')
      .eq('user_id', nextSession.user.id)
      .maybeSingle()

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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void evaluate(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [evaluate, refreshAuth])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

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
