import { Outlet } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { MfaSetupPage } from './MfaSetupPage'
import { MfaVerifyPage } from './MfaVerifyPage'

export function RequireAuth() {
  const { gate, isOwner } = useAuth()

  if (gate === 'loading') {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-3 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (gate === 'unconfigured' || gate === 'signed_out') {
    return <LoginPage />
  }

  if (gate === 'needs_mfa_enroll') {
    return <MfaSetupPage />
  }

  if (gate === 'needs_mfa_verify') {
    return <MfaVerifyPage />
  }

  if (!isOwner) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-heading text-2xl">Sin permiso de owner</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Tu usuario autenticó con MFA, pero no está en la tabla <code>owners</code>. Añádelo con el
          seed del README y vuelve a entrar.
        </p>
      </div>
    )
  }

  return <Outlet />
}
