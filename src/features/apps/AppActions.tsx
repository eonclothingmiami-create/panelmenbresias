import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatDateOnly, todayBogotaIso } from '@/lib/format'
import { addMonthsKeepingDueDay } from '@/lib/period'
import { supabase } from '@/lib/supabase'
import type { App } from '@/types/database'
import { useApplyState } from './useApps'

type ActionKind =
  | 'renew'
  | 'grace'
  | 'suspend'
  | 'reactivate'
  | 'enforcement'
  | 'message'

const DANGEROUS: ActionKind[] = ['suspend', 'enforcement']

export function AppActions({ app }: { app: App }) {
  const apply = useApplyState()
  const [open, setOpen] = useState<ActionKind | null>(null)
  const [confirmSlug, setConfirmSlug] = useState('')
  const [graceUntil, setGraceUntil] = useState(() => defaultGrace(app))
  const [message, setMessage] = useState(app.cached_message ?? '')
  const [enforcement, setEnforcement] = useState(app.cached_enforcement_enabled ?? false)
  const [monto, setMonto] = useState(String(app.precio_mensual_cop))
  const [medio, setMedio] = useState('transferencia')
  const [referencia, setReferencia] = useState('')

  const nextPeriodEnd = useMemo(() => {
    const from = app.cached_current_period_end ?? todayBogotaIso()
    return addMonthsKeepingDueDay(from, app.dia_vencimiento, 1)
  }, [app])

  function openAction(kind: ActionKind) {
    setConfirmSlug('')
    setGraceUntil(defaultGrace(app))
    setMessage(app.cached_message ?? '')
    setEnforcement(app.cached_enforcement_enabled ?? false)
    setMonto(String(app.precio_mensual_cop))
    setOpen(kind)
  }

  async function submit() {
    if (!open) return
    if (DANGEROUS.includes(open) && confirmSlug !== app.slug) {
      toast.error(`Escribe el slug «${app.slug}» para confirmar`)
      return
    }

    const basePeriod = app.cached_current_period_end ?? todayBogotaIso()
    let payload: {
      status: string
      current_period_end: string
      grace_until?: string | null
      enforcement_enabled?: boolean
      message?: string | null
    }

    switch (open) {
      case 'renew': {
        payload = {
          status: 'active',
          current_period_end: nextPeriodEnd,
          grace_until: null,
          enforcement_enabled: enforcement,
          message: message || null,
        }
        const { error } = await supabase.from('payments').insert({
          app_id: app.id,
          fecha: todayBogotaIso(),
          monto_cop: Number(monto) || app.precio_mensual_cop,
          periodo_desde: basePeriod,
          periodo_hasta: nextPeriodEnd,
          medio,
          referencia: referencia || null,
          notas: 'Renovación desde panel',
        })
        if (error) {
          toast.error(error.message)
          return
        }
        break
      }
      case 'grace':
        payload = {
          status: 'past_due',
          current_period_end: basePeriod,
          grace_until: graceUntil,
          enforcement_enabled: app.cached_enforcement_enabled ?? false,
          message: message || null,
        }
        break
      case 'suspend':
        payload = {
          status: 'suspended',
          current_period_end: basePeriod,
          grace_until: null,
          enforcement_enabled: true,
          message: message || 'Suscripción suspendida por falta de pago',
        }
        break
      case 'reactivate':
        payload = {
          status: 'active',
          current_period_end: basePeriod,
          grace_until: null,
          enforcement_enabled: app.cached_enforcement_enabled ?? false,
          message: message || null,
        }
        break
      case 'enforcement':
        payload = {
          status: app.cached_status ?? 'active',
          current_period_end: basePeriod,
          grace_until: app.cached_grace_until,
          enforcement_enabled: enforcement,
          message: app.cached_message,
        }
        break
      case 'message':
        payload = {
          status: app.cached_status ?? 'active',
          current_period_end: basePeriod,
          grace_until: app.cached_grace_until,
          enforcement_enabled: app.cached_enforcement_enabled ?? false,
          message: message || null,
        }
        break
    }

    await apply.mutateAsync({ appId: app.id, ...payload })
    setOpen(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-lg">Acciones rápidas</h3>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => openAction('renew')}>
          Registrar pago y renovar
        </Button>
        <Button type="button" variant="outline" onClick={() => openAction('grace')}>
          Periodo de gracia
        </Button>
        <Button type="button" variant="destructive" onClick={() => openAction('suspend')}>
          Suspender
        </Button>
        <Button type="button" variant="outline" onClick={() => openAction('reactivate')}>
          Reactivar
        </Button>
        <Button type="button" variant="outline" onClick={() => openAction('enforcement')}>
          Bloqueo (enforcement)
        </Button>
        <Button type="button" variant="outline" onClick={() => openAction('message')}>
          Editar mensaje
        </Button>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{titleFor(open)}</DialogTitle>
            <DialogDescription>
              Revisa el payload que se enviará al vendor-sync de {app.slug}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            {open === 'renew' ? (
              <FieldGroup>
                <Field>
                  <FieldLabel>Nuevo periodo hasta</FieldLabel>
                  <Input value={nextPeriodEnd} readOnly />
                </Field>
                <Field>
                  <FieldLabel>Monto COP</FieldLabel>
                  <Input value={monto} onChange={(e) => setMonto(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Medio</FieldLabel>
                  <Input value={medio} onChange={(e) => setMedio(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Referencia</FieldLabel>
                  <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Enforcement al renovar</FieldLabel>
                  <Switch checked={enforcement} onCheckedChange={setEnforcement} />
                </Field>
              </FieldGroup>
            ) : null}

            {open === 'grace' ? (
              <FieldGroup>
                <Field>
                  <FieldLabel>Grace until</FieldLabel>
                  <Input
                    type="date"
                    value={graceUntil}
                    onChange={(e) => setGraceUntil(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Mensaje al cliente</FieldLabel>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
              </FieldGroup>
            ) : null}

            {open === 'suspend' || open === 'message' || open === 'reactivate' ? (
              <Field>
                <FieldLabel>Mensaje</FieldLabel>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
              </Field>
            ) : null}

            {open === 'enforcement' ? (
              <Field>
                <FieldLabel>enforcement_enabled</FieldLabel>
                <div className="flex items-center gap-3">
                  <Switch checked={enforcement} onCheckedChange={setEnforcement} />
                  <span className="text-muted-foreground">
                    {enforcement ? 'Bloqueo activo' : 'Bloqueo desactivado'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Advertencia: esto afecta el comportamiento remoto de la app del cliente.
                </p>
              </Field>
            ) : null}

            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(previewPayload(open, app, {
                nextPeriodEnd,
                graceUntil,
                message,
                enforcement,
              }), null, 2)}
            </pre>

            {open && DANGEROUS.includes(open) ? (
              <Field>
                <FieldLabel>
                  Confirma escribiendo el slug <code>{app.slug}</code>
                </FieldLabel>
                <Input value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} />
              </Field>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={apply.isPending}>
              Confirmar y enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function titleFor(kind: ActionKind | null): string {
  switch (kind) {
    case 'renew':
      return 'Registrar pago y renovar'
    case 'grace':
      return 'Poner en periodo de gracia'
    case 'suspend':
      return 'Suspender suscripción'
    case 'reactivate':
      return 'Reactivar'
    case 'enforcement':
      return 'Interruptor de bloqueo'
    case 'message':
      return 'Editar mensaje al cliente'
    default:
      return 'Acción'
  }
}

function defaultGrace(app: App): string {
  if (app.cached_grace_until) return app.cached_grace_until
  const base = app.cached_current_period_end ?? todayBogotaIso()
  const [y, m, d] = base.split('-').map(Number)
  if (!y || !m || !d) return todayBogotaIso()
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + 3)
  return formatDateOnlyIso(date)
}

function formatDateOnlyIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function previewPayload(
  kind: ActionKind | null,
  app: App,
  ctx: {
    nextPeriodEnd: string
    graceUntil: string
    message: string
    enforcement: boolean
  },
) {
  const basePeriod = app.cached_current_period_end ?? todayBogotaIso()
  switch (kind) {
    case 'renew':
      return {
        tenant_id: app.tenant_id,
        status: 'active',
        current_period_end: ctx.nextPeriodEnd,
        grace_until: null,
        enforcement_enabled: ctx.enforcement,
        message: ctx.message || null,
        panel_version: '(remoto: panel_version actual + 1)',
      }
    case 'grace':
      return {
        tenant_id: app.tenant_id,
        status: 'past_due',
        current_period_end: basePeriod,
        grace_until: ctx.graceUntil,
        message: ctx.message || null,
      }
    case 'suspend':
      return {
        tenant_id: app.tenant_id,
        status: 'suspended',
        enforcement_enabled: true,
        message: ctx.message || 'Suscripción suspendida por falta de pago',
      }
    case 'reactivate':
      return { tenant_id: app.tenant_id, status: 'active', grace_until: null }
    case 'enforcement':
      return {
        tenant_id: app.tenant_id,
        enforcement_enabled: ctx.enforcement,
        status: app.cached_status,
        current_period_end: formatDateOnly(basePeriod),
      }
    case 'message':
      return { tenant_id: app.tenant_id, message: ctx.message || null }
    default:
      return {}
  }
}
