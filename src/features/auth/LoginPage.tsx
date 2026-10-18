import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from './AuthProvider'

const schema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { signIn, gate } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    const { error } = await signIn(values.email.trim(), values.password)
    setSubmitting(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Sesión iniciada')
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Eon
          </p>
          <CardTitle className="font-heading text-3xl">Panel de Proveedor</CardTitle>
          <CardDescription>
            Acceso exclusivo del desarrollador. Signup deshabilitado. MFA TOTP obligatorio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gate === 'unconfigured' ? (
            <p className="text-sm text-muted-foreground">
              Configura <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> y{' '}
              <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> en el entorno
              (ver README).
            </p>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.email || undefined}>
                  <FieldLabel htmlFor="email">Correo</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    aria-invalid={!!form.formState.errors.email || undefined}
                    {...form.register('email')}
                  />
                  <FieldError>{form.formState.errors.email?.message}</FieldError>
                </Field>
                <Field data-invalid={!!form.formState.errors.password || undefined}>
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!form.formState.errors.password || undefined}
                    {...form.register('password')}
                  />
                  <FieldError>{form.formState.errors.password?.message}</FieldError>
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                Entrar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
