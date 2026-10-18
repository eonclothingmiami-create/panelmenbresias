import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Factor, Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type AuthGate =
  | 'loading'
  | 'unconfigured'
  | 'signed_out'
  | 'needs_mfa_enroll'
  | 'needs_mfa_verify'
  | 'ready'

interface AuthContextValue {
  gate: AuthGate
  session: Session | null
  user: User | null
  aal: 'aal1' | 'aal2' | null
  factors: Factor[]
  isOwner: boolean
  refreshAuth: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  enrollTotp: () => Promise<{
    error: string | null
    factorId?: string
    qr?: string
    secret?: string
  }>
  verifyTotp: (factorId: string, code: string) => Promise<{ error: string | null }>
  challengeAndVerify: (code: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<AuthGate>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  )
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null)
  const [factors, setFactors] = useState<Factor[]>([])
  const [isOwner, setIsOwner] = useState(false)

  const evaluate = useCallback(async (nextSession: Session | null) => {
    if (!isSupabaseConfigured) {
      setGate('unconfigured')
      setSession(null)
      setUser(null)
      setAal(null)
      setFactors([])
      setIsOwner(false)
      return
    }

    setSession(nextSession)
    setUser(nextSession?.user ?? null)

    if (!nextSession) {
      setAal(null)
      setFactors([])
      setIsOwner(false)
      setGate('signed_out')
      return
    }

    const [{ data: aalData }, { data: factorsData }, { data: ownerRow }] =
      await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
        supabase
          .from('owners')
          .select('user_id')
          .eq('user_id', nextSession.user.id)
          .maybeSingle(),
      ])

    const current = (aalData?.currentLevel as 'aal1' | 'aal2' | null) ?? null
    const nextLevel = (aalData?.nextLevel as 'aal1' | 'aal2' | null) ?? null
    const verified = factorsData?.totp?.filter((f) => f.status === 'verified') ?? []
    const allTotp = factorsData?.totp ?? []

    setAal(current)
    setFactors(allTotp)
    setIsOwner(Boolean(ownerRow))

    if (verified.length === 0) {
      setGate('needs_mfa_enroll')
      return
    }

    if (current !== 'aal2' || nextLevel === 'aal2') {
      // Need challenge if current is aal1 and next is aal2
      if (current === 'aal1') {
        setGate('needs_mfa_verify')
        return
      }
    }

    if (current !== 'aal2') {
      setGate('needs_mfa_verify')
      return
    }

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

  const enrollTotp = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Panel Proveedor',
    })
    if (error || !data) {
      return { error: error?.message ?? 'No se pudo iniciar el enrolamiento MFA' }
    }
    return {
      error: null,
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    }
  }, [])

  const verifyTotp = useCallback(async (factorId: string, code: string) => {
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error || !challenge.data) {
      return { error: challenge.error?.message ?? 'No se pudo crear el challenge MFA' }
    }
    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    })
    if (verified.error) return { error: verified.error.message }
    await refreshAuth()
    return { error: null }
  }, [refreshAuth])

  const challengeAndVerify = useCallback(
    async (code: string) => {
      const factor = factors.find((f) => f.status === 'verified') ?? factors[0]
      if (!factor) return { error: 'No hay factor TOTP verificado' }
      return verifyTotp(factor.id, code)
    },
    [factors, verifyTotp],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      gate,
      session,
      user,
      aal,
      factors,
      isOwner,
      refreshAuth,
      signIn,
      signOut,
      enrollTotp,
      verifyTotp,
      challengeAndVerify,
    }),
    [
      gate,
      session,
      user,
      aal,
      factors,
      isOwner,
      refreshAuth,
      signIn,
      signOut,
      enrollTotp,
      verifyTotp,
      challengeAndVerify,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
