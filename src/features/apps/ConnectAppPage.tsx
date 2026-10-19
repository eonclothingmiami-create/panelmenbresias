import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DESARROLLADOR_OPTIONS,
  type Desarrollador,
} from '@/lib/desarrolladores'
import { testConnection } from '@/lib/panel-api'
import { supabase } from '@/lib/supabase'
import type { Client, VendorSyncState } from '@/types/database'

const schema = z.object({
  nombre: z.string().min(2),
  client_id: z.string().uuid('Selecciona un cliente'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug en kebab-case'),
  tenant_id: z.string().min(2),
  vendor_sync_url: z.url(),
  secret_name: z
    .string()
    .regex(/^APP_SECRET_[A-Z0-9_]+$/, 'Formato APP_SECRET_SLUG_EN_MAYUSCULAS'),
  url_publica: z.string().optional(),
  precio_mensual_cop: z.number().int().nonnegative(),
  dia_vencimiento: z.number().int().min(1).max(31),
  desarrollado_por: z.enum(['david', 'santiago', 'ambos']),
  notas_cliente: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function slugToSecretName(slug: string): string {
  return `APP_SECRET_${slug.replace(/-/g, '_').toUpperCase()}`
}

export function ConnectAppPage() {
  const navigate = useNavigate()
  const [probe, setProbe] = useState<VendorSyncState | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('nombre')
      if (error) throw error
      return data as Client[]
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: 'Sistema para la Confección',
      client_id: '',
      slug: 'luis-confeccion',
      tenant_id: 'luis-confeccion',
      vendor_sync_url:
        'https://jspdpvvdbzexggktewgl.supabase.co/functions/v1/vendor-sync',
      secret_name: 'APP_SECRET_LUIS_CONFECCION',
      url_publica: '',
      precio_mensual_cop: 0,
      dia_vencimiento: 1,
      desarrollado_por: 'ambos',
    },
  })

  const slug = form.watch('slug')

  async function onTest() {
    const values = form.getValues()
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      toast.error('Completa el formulario antes de probar')
      return
    }
    setTesting(true)
    setProbe(null)
    const res = await testConnection({
      vendor_sync_url: parsed.data.vendor_sync_url,
      secret_name: parsed.data.secret_name,
      tenant_id: parsed.data.tenant_id,
    })
    setTesting(false)
    if (!res.ok || !res.state) {
      toast.error(res.code ?? 'Conexión fallida')
      return
    }
    setProbe(res.state)
    toast.success('Conexión OK')
  }

  async function onSave(values: FormValues) {
    setSaving(true)
    const { data, error } = await supabase
      .from('apps')
      .insert({
        client_id: values.client_id,
        slug: values.slug,
        nombre: values.nombre,
        url_publica: values.url_publica || null,
        vendor_sync_url: values.vendor_sync_url,
        secret_name: values.secret_name,
        tenant_id: values.tenant_id,
        precio_mensual_cop: values.precio_mensual_cop,
        dia_vencimiento: values.dia_vencimiento,
        desarrollado_por: values.desarrollado_por,
        activa_en_panel: true,
        panel_version: probe?.panel_version ?? 0,
        cached_status: probe?.status ?? null,
        cached_effective_status: probe?.effective_status ?? null,
        cached_current_period_end: probe?.current_period_end ?? null,
        cached_grace_until: probe?.grace_until ?? null,
        cached_days_left: probe?.days_left ?? null,
        cached_days_left_in_grace: probe?.days_left_in_grace ?? null,
        cached_enforcement_enabled: probe?.enforcement_enabled ?? null,
        cached_message: probe?.message ?? null,
        cached_source: probe?.source ?? null,
        cached_last_synced_at: probe?.last_synced_at ?? null,
        last_check_at: probe ? new Date().toISOString() : null,
        last_check_ok: probe ? true : null,
      })
      .select('id')
      .single()
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('App guardada')
    navigate(`/apps/${data.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl">Conectar app</h2>
        <p className="text-sm text-muted-foreground">
          Asistente: datos → probar conexión firmada → guardar. El valor del secret nunca viaja al
          navegador.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la app</CardTitle>
          <CardDescription>
            Secret sugerido:{' '}
            <code>{slug ? slugToSecretName(slug) : 'APP_SECRET_…'}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSave)}>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.nombre || undefined}>
                <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
                <Input id="nombre" {...form.register('nombre')} />
                <FieldError>{form.formState.errors.nombre?.message}</FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.client_id || undefined}>
                <FieldLabel>Cliente</FieldLabel>
                <Select
                  value={form.watch('client_id') || undefined}
                  onValueChange={(v) => form.setValue('client_id', v ?? '', { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Si no hay clientes, créalos en la sección Clientes primero.
                </FieldDescription>
                <FieldError>{form.formState.errors.client_id?.message}</FieldError>
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input
                    id="slug"
                    {...form.register('slug', {
                      onChange: (e) => {
                        const v = e.target.value
                        form.setValue('secret_name', slugToSecretName(v), { shouldValidate: true })
                      },
                    })}
                  />
                  <FieldError>{form.formState.errors.slug?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="tenant_id">tenant_id</FieldLabel>
                  <Input id="tenant_id" {...form.register('tenant_id')} />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="vendor_sync_url">vendor_sync_url</FieldLabel>
                <Input id="vendor_sync_url" {...form.register('vendor_sync_url')} />
                <FieldError>{form.formState.errors.vendor_sync_url?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="secret_name">secret_name</FieldLabel>
                <Input id="secret_name" {...form.register('secret_name')} />
                <FieldError>{form.formState.errors.secret_name?.message}</FieldError>
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="precio">Precio mensual COP</FieldLabel>
                  <Input
                    id="precio"
                    type="number"
                    {...form.register('precio_mensual_cop', { valueAsNumber: true })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="dia">Día de vencimiento (1-31)</FieldLabel>
                  <Input
                    id="dia"
                    type="number"
                    {...form.register('dia_vencimiento', { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <Field data-invalid={!!form.formState.errors.desarrollado_por || undefined}>
                <FieldLabel>Desarrollado por</FieldLabel>
                <Select
                  value={form.watch('desarrollado_por')}
                  onValueChange={(v) =>
                    form.setValue('desarrollado_por', (v ?? 'ambos') as Desarrollador, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="David, Santiago o ambos" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESARROLLADOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Quién desarrolló esta app para gestionar cobros y responsabilidad.
                </FieldDescription>
                <FieldError>{form.formState.errors.desarrollado_por?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="url_publica">URL pública (opcional)</FieldLabel>
                <Input id="url_publica" {...form.register('url_publica')} />
              </Field>
            </FieldGroup>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void onTest()} disabled={testing}>
                {testing ? 'Probando…' : 'Probar conexión'}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar app'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {probe ? (
        <Card>
          <CardHeader>
            <CardTitle>Estado recibido</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(probe, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Cómo crear el secret</CardTitle>
          <CardDescription>
            El valor es el mismo <code>VENDOR_SYNC_SECRET</code> configurado en la app del cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            readOnly
            className="font-mono text-xs"
            rows={3}
            value={`supabase secrets set ${form.watch('secret_name') || 'APP_SECRET_LUIS_CONFECCION'}=<VENDOR_SYNC_SECRET> --project-ref <ref-del-panel>`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
