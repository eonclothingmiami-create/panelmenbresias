import { useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from './AuthProvider'

export function MfaVerifyPage() {
  const { challengeAndVerify, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    const { error } = await challengeAndVerify(code.trim())
    setVerifying(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('MFA verificado')
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Verificar MFA</CardTitle>
          <CardDescription>
            Ingresa el código de tu autenticador para alcanzar AAL2.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="verify-code">Código TOTP</FieldLabel>
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={verifying}>
              {verifying ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
              Verificar
            </Button>
          </form>
          <Button type="button" variant="ghost" onClick={() => void signOut()}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
