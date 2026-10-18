import { useEffect, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from './AuthProvider'

export function MfaSetupPage() {
  const { enrollTotp, verifyTotp, signOut } = useAuth()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await enrollTotp()
      if (cancelled) return
      setLoading(false)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setFactorId(result.factorId ?? null)
      setQr(result.qr ?? null)
      setSecret(result.secret ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [enrollTotp])

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setVerifying(true)
    const { error } = await verifyTotp(factorId, code.trim())
    setVerifying(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('MFA activado')
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/60 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Configurar MFA (TOTP)</CardTitle>
          <CardDescription>
            Escanea el código QR con tu app de autenticación y confirma el código de 6 dígitos.
            AAL2 es obligatorio para usar el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Generando factor…
            </div>
          ) : (
            <>
              {qr ? (
                <img
                  src={qr}
                  alt="QR MFA"
                  className="mx-auto size-48 rounded-md border bg-white p-2"
                />
              ) : null}
              {secret ? (
                <p className="text-center text-xs break-all text-muted-foreground">
                  Secreto manual: <code>{secret}</code>
                </p>
              ) : null}
              <form onSubmit={onVerify} className="flex flex-col gap-3">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="mfa-code">Código de verificación</FieldLabel>
                    <Input
                      id="mfa-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={verifying || !factorId}>
                  {verifying ? (
                    <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  ) : null}
                  Verificar y continuar
                </Button>
              </form>
            </>
          )}
          <Button type="button" variant="ghost" onClick={() => void signOut()}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
