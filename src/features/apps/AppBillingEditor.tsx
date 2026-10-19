import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DESARROLLADOR_OPTIONS,
  desarrolladorLabel,
  type Desarrollador,
} from '@/lib/desarrolladores'
import { formatMilesCop, parseMontoCop } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { App, AppWithClient } from '@/types/database'

export function AppBillingEditor({ app }: { app: App }) {
  const qc = useQueryClient()
  const [precioText, setPrecioText] = useState(
    app.precio_mensual_cop > 0 ? formatMilesCop(app.precio_mensual_cop) : '',
  )
  const [precioError, setPrecioError] = useState<string | null>(null)
  const [dia, setDia] = useState(String(app.dia_vencimiento))
  const [dev, setDev] = useState<Desarrollador>(app.desarrollado_por ?? 'ambos')

  useEffect(() => {
    setPrecioText(app.precio_mensual_cop > 0 ? formatMilesCop(app.precio_mensual_cop) : '')
    setDia(String(app.dia_vencimiento))
    setDev(app.desarrollado_por ?? 'ambos')
  }, [app.id, app.precio_mensual_cop, app.dia_vencimiento, app.desarrollado_por])

  const save = useMutation({
    mutationFn: async () => {
      let precio: number
      if (!precioText.trim()) {
        precio = app.precio_mensual_cop
      } else {
        const parsed = parseMontoCop(precioText)
        if (parsed == null) {
          throw new Error('Precio inválido: usa un entero > 0 (ej. 150.000)')
        }
        precio = parsed
      }
      const diaNum = Number(dia)
      if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31) {
        throw new Error('Día de cobro debe estar entre 1 y 31')
      }
      const patch = {
        precio_mensual_cop: precio,
        dia_vencimiento: diaNum,
        desarrollado_por: dev,
      }
      const { data, error } = await supabase
        .from('apps')
        .update(patch)
        .eq('id', app.id)
        .select('id, precio_mensual_cop, dia_vencimiento, desarrollado_por')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.precio_mensual_cop > 0) {
        setPrecioText(formatMilesCop(data.precio_mensual_cop))
      }
      setDia(String(data.dia_vencimiento))
      setDev(data.desarrollado_por)
      setPrecioError(null)
      toast.success('Cobro actualizado · el dashboard ya refleja el desarrollador')

      // Actualiza caché al instante (dashboard + detalle)
      qc.setQueryData<AppWithClient[]>(['apps'], (old) =>
        old?.map((a) =>
          a.id === app.id
            ? {
                ...a,
                precio_mensual_cop: data.precio_mensual_cop,
                dia_vencimiento: data.dia_vencimiento,
                desarrollado_por: data.desarrollado_por,
              }
            : a,
        ),
      )
      qc.setQueryData<AppWithClient>(['apps', app.id], (old) =>
        old
          ? {
              ...old,
              precio_mensual_cop: data.precio_mensual_cop,
              dia_vencimiento: data.dia_vencimiento,
              desarrollado_por: data.desarrollado_por,
            }
          : old,
      )
      void qc.invalidateQueries({ queryKey: ['apps'] })
    },
    onError: (err: Error) => {
      setPrecioError(err.message)
      toast.error(err.message)
    },
  })

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-4">
      <div>
        <h3 className="font-heading text-lg">Cobro</h3>
        <p className="text-sm text-muted-foreground">
          Precio, día y desarrollador. Al guardar, el dashboard muestra{' '}
          <strong>{desarrolladorLabel(dev)}</strong>.
        </p>
      </div>
      <FieldGroup>
        <div className="grid gap-3 md:grid-cols-3">
          <Field data-invalid={!!precioError || undefined}>
            <FieldLabel htmlFor="edit-precio">Precio mensual (COP)</FieldLabel>
            <Input
              id="edit-precio"
              inputMode="numeric"
              placeholder="Ej. 150.000"
              value={precioText}
              onChange={(e) => {
                setPrecioText(e.target.value)
                setPrecioError(null)
              }}
              onBlur={() => {
                const n = parseMontoCop(precioText)
                if (n != null) setPrecioText(formatMilesCop(n))
              }}
            />
            <FieldDescription>Vacío = dejar el precio actual.</FieldDescription>
            <FieldError>{precioError}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-dia">Día de cobro</FieldLabel>
            <Input
              id="edit-dia"
              type="number"
              min={1}
              max={31}
              value={dia}
              onChange={(e) => setDia(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Desarrollado por</FieldLabel>
            <Select value={dev} onValueChange={(v) => setDev((v ?? 'ambos') as Desarrollador)}>
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
        </div>
      </FieldGroup>
      <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? 'Guardando…' : 'Guardar cobro'}
      </Button>
    </section>
  )
}
