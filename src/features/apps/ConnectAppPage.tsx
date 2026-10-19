import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronDownIcon, PlusIcon } from 'lucide-react'
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
import { useAuth } from '@/features/auth/AuthProvider'
import {
  DESARROLLADOR_OPTIONS,
  type Desarrollador,
} from '@/lib/desarrolladores'
import {
  formatMilesCop,
  parseMontoCop,
  slugifyAppName,
  slugToSecretName,
} from '@/lib/format'
import { testConnection } from '@/lib/panel-api'
import { supabase } from '@/lib/supabase'
import type { Client, VendorSyncState } from '@/types/database'

const schema = z.object({
  nombre: z.string().min(2, 'Escribe el nombre de la app'),
  client_id: z.string().uuid('Elige un cliente'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  tenant_id: z.string().min(2, 'tenant_id requerido'),
  vendor_sync_url: z.url('URL inválida'),
  secret_name: z
    .string()
    .regex(/^APP_SECRET_[A-Z0-9_]+$/, 'Formato APP_SECRET_…'),
  url_publica: z.string().optional(),
  precio_mensual_cop: z
    .number({ error: 'Indica el precio mensual' })
    .int('El precio debe ser un entero')
    .positive('El precio debe ser mayor que 0'),
  dia_vencimiento: z.number().int().min(1).max(31),
  desarrollado_por: z.enum(['david', 'santiago', 'ambos']),
})

type FormValues = z.infer<typeof schema>

export function ConnectAppPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { gate, isOwner } = useAuth()
  const [probe, setProbe] = useState<VendorSyncState | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [techOpen, setTechOpen] = useState(false)
  const [precioText, setPrecioText] = useState('')
  const [precioError, setPrecioError] = useState<string | null>(null)
  const [newClientName, setNewClientName] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)

  const clients = useQuery({
    queryKey: ['clients'],
    enabled: gate === 'ready' && isOwner,
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('nombre')
      if (error) throw error
      return data as Client[]
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      client_id: '',
      slug: '',
      tenant_id: '',
      vendor_sync_url: '',
      secret_name: '',
      url_publica: '',
      // sin default numérico: el usuario debe escribir el precio
      precio_mensual_cop: undefined as unknown as number,
      dia_vencimiento: 6,
      desarrollado_por: 'ambos',
    },
  })

  const clientId = form.watch('client_id')
  const selectedClientName = useMemo(
    () => (clients.data ?? []).find((c) => c.id === clientId)?.nombre,
    [clients.data, clientId],
  )

  function applyNameDerived(nombre: string) {
    const slug = slugifyAppName(nombre)
    form.setValue('nombre', nombre, { shouldValidate: true })
    if (slug) {
      form.setValue('slug', slug, { shouldValidate: true })
      form.setValue('tenant_id', slug, { shouldValidate: true })
      form.setValue('secret_name', slugToSecretName(slug), { shouldValidate: true })
    }
  }

  function onPrecioChange(raw: string) {
    setPrecioText(raw)
    if (!raw.trim()) {
      setPrecioError('Indica el precio mensual en pesos (COP)')
      form.setValue('precio_mensual_cop', undefined as unknown as number, {
        shouldValidate: true,
      })
      return
    }
    const n = parseMontoCop(raw)
    if (n == null) {
      setPrecioError('Usa un entero mayor que 0. Ejemplo: 150.000')
      form.setValue('precio_mensual_cop', undefined as unknown as number, {
        shouldValidate: true,
      })
      return
    }
    setPrecioError(null)
    setPrecioText(formatMilesCop(n))
    form.setValue('precio_mensual_cop', n, { shouldValidate: true })
  }

  async function createClient() {
    const nombre = newClientName.trim()
    if (nombre.length < 2) {
      toast.error('Escribe el nombre del cliente')
      return
    }
    setCreatingClient(true)
    const { data, error } = await supabase
      .from('clients')
      .insert({
        nombre,
        desarrollado_por: form.getValues('desarrollado_por'),
      })
      .select('id, nombre')
      .single()
    setCreatingClient(false)
    if (error) {
      toast.error(error.message)
      return
    }
    await qc.invalidateQueries({ queryKey: ['clients'] })
    form.setValue('client_id', data.id, { shouldValidate: true })
    setNewClientName('')
    setShowNewClient(false)
    toast.success(`Cliente «${data.nombre}» creado`)
  }

  async function onTest() {
    const values = form.getValues()
    if (!values.vendor_sync_url || !values.secret_name || !values.tenant_id) {
      setTechOpen(true)
      toast.error('Completa la configuración técnica antes de probar')
      return
    }
    setTesting(true)
    setProbe(null)
    const res = await testConnection({
      vendor_sync_url: values.vendor_sync_url,
      secret_name: values.secret_name,
      tenant_id: values.tenant_id,
    })
    setTesting(false)
    if (!res.ok || !res.state) {
      toast.error(res.code ?? 'No se pudo conectar')
      return
    }
    setProbe(res.state)
    toast.success('Conexión correcta')
  }

  async function onSave(values: FormValues) {
    if (!values.precio_mensual_cop || values.precio_mensual_cop <= 0) {
      setPrecioError('Indica el precio mensual en pesos (COP)')
      toast.error('Falta el precio mensual')
      return
    }
    setSaving(true)
    const { data: existing } = await supabase
      .from('apps')
      .select('id, slug')
      .eq('slug', values.slug)
      .maybeSingle()
    if (existing) {
      setSaving(false)
      toast.error(`Ya existe la app «${existing.slug}». Ábrela desde el inicio.`)
      navigate(`/apps/${existing.id}`)
      return
    }

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
    toast.success('App conectada')
    navigate(`/apps/${data.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl">Conectar app</h2>
        <p className="text-sm text-muted-foreground">
          Solo lo necesario para cobrar: cliente, precio y vínculo técnico. El secret nunca viaja al
          navegador.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de cobro</CardTitle>
          <CardDescription>Formulario vacío: no reutiliza apps ya conectadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSave)}>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.nombre || undefined}>
                <FieldLabel htmlFor="nombre">Nombre de la app</FieldLabel>
                <Input
                  id="nombre"
                  placeholder="Ej. Sistema para la Confección"
                  value={form.watch('nombre')}
                  onChange={(e) => applyNameDerived(e.target.value)}
                />
                <FieldDescription>
                  Se usa para sugerir el identificador técnico (slug y secret).
                </FieldDescription>
                <FieldError>{form.formState.errors.nombre?.message}</FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.client_id || undefined}>
                <FieldLabel>Cliente</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <Select
                    value={clientId || null}
                    onValueChange={(v) =>
                      form.setValue('client_id', v ?? '', { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="w-full min-w-0 flex-1">
                      <SelectValue placeholder="Elige un cliente">
                        {selectedClientName ?? undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(clients.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setShowNewClient((v) => !v)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Nuevo cliente
                  </Button>
                </div>
                {showNewClient ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/70 p-3 sm:flex-row">
                    <Input
                      placeholder="Nombre del cliente"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => void createClient()}
                      disabled={creatingClient}
                    >
                      {creatingClient ? 'Creando…' : 'Crear y elegir'}
                    </Button>
                  </div>
                ) : null}
                <FieldError>{form.formState.errors.client_id?.message}</FieldError>
              </Field>

              <Field data-invalid={!!precioError || !!form.formState.errors.precio_mensual_cop || undefined}>
                <FieldLabel htmlFor="precio">Precio mensual a cobrar (COP)</FieldLabel>
                <Input
                  id="precio"
                  inputMode="numeric"
                  placeholder="Ej. 150.000"
                  value={precioText}
                  onChange={(e) => onPrecioChange(e.target.value)}
                  onBlur={() => {
                    const n = parseMontoCop(precioText)
                    if (n != null) setPrecioText(formatMilesCop(n))
                  }}
                />
                <FieldDescription>Sin valor por defecto. Solo enteros mayores que 0.</FieldDescription>
                <FieldError>
                  {precioError ?? form.formState.errors.precio_mensual_cop?.message}
                </FieldError>
              </Field>

              <Field>
                <FieldLabel>Desarrollado por</FieldLabel>
                <Select
                  value={form.watch('desarrollado_por')}
                  onValueChange={(v) =>
                    form.setValue('desarrollado_por', (v ?? 'ambos') as Desarrollador, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="David, Santiago o Ambos" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESARROLLADOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={!!form.formState.errors.dia_vencimiento || undefined}>
                <FieldLabel htmlFor="dia">Día de cobro (1–31)</FieldLabel>
                <Input
                  id="dia"
                  type="number"
                  min={1}
                  max={31}
                  {...form.register('dia_vencimiento', { valueAsNumber: true })}
                />
                <FieldDescription>
                  Día del mes en que vence/renueva (por defecto 6).
                </FieldDescription>
                <FieldError>{form.formState.errors.dia_vencimiento?.message}</FieldError>
              </Field>
            </FieldGroup>

            <div className="rounded-lg border border-border/70">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
                onClick={() => setTechOpen((o) => !o)}
                aria-expanded={techOpen}
              >
                Configuración técnica
                <ChevronDownIcon
                  className={`size-4 text-muted-foreground transition ${techOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {techOpen ? (
                <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3">
                  <FieldGroup>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="slug">Slug</FieldLabel>
                        <Input
                          id="slug"
                          {...form.register('slug', {
                            onChange: (e) => {
                              const v = e.target.value
                              form.setValue('secret_name', slugToSecretName(v), {
                                shouldValidate: true,
                              })
                              if (!form.getValues('tenant_id') || form.getValues('tenant_id') === form.getValues('slug')) {
                                form.setValue('tenant_id', v, { shouldValidate: true })
                              }
                            },
                          })}
                        />
                        <FieldError>{form.formState.errors.slug?.message}</FieldError>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="tenant_id">tenant_id</FieldLabel>
                        <Input id="tenant_id" {...form.register('tenant_id')} />
                        <FieldError>{form.formState.errors.tenant_id?.message}</FieldError>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="vendor_sync_url">URL de vendor-sync</FieldLabel>
                      <Input
                        id="vendor_sync_url"
                        placeholder="https://….supabase.co/functions/v1/vendor-sync"
                        {...form.register('vendor_sync_url')}
                      />
                      <FieldError>{form.formState.errors.vendor_sync_url?.message}</FieldError>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="secret_name">Nombre del secret</FieldLabel>
                      <Input id="secret_name" {...form.register('secret_name')} />
                      <FieldDescription>
                        Debe existir en Edge Functions del panel (mismo valor que VENDOR_SYNC_SECRET
                        de la app).
                      </FieldDescription>
                      <FieldError>{form.formState.errors.secret_name?.message}</FieldError>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="url_publica">URL pública (opcional)</FieldLabel>
                      <Input id="url_publica" {...form.register('url_publica')} />
                    </Field>

                    <Textarea
                      readOnly
                      className="font-mono text-xs"
                      rows={2}
                      value={`supabase secrets set ${form.watch('secret_name') || 'APP_SECRET_…'}=<VENDOR_SYNC_SECRET> --project-ref <ref-del-panel>`}
                    />
                  </FieldGroup>

                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void onTest()}
                      disabled={testing}
                    >
                      {testing ? 'Probando…' : 'Probar conexión'}
                    </Button>
                  </div>

                  {probe ? (
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(probe, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Guardando…' : 'Guardar y conectar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
