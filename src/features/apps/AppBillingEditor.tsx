import { useState } from 'react'
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
import type { App } from '@/types/database'

export function AppBillingEditor({ app }: { app: App }) {
  const qc = useQueryClient()
  const [precioText, setPrecioText] = useState(
    app.precio_mensual_cop > 0 ? formatMilesCop(app.precio_mensual_cop) : '',
  )
  const [precioError, setPrecioError] = useState<string | null>(null)
  const [dia, setDia] = useState(String(app.dia_vencimiento))
  const [dev, setDev] = useState<Desarrollador>(app.desarrollado_por ?? 'ambos')

  const save = useMutation({
    mutationFn: async () => {
      const precio = parseMontoCop(precioText)
      if (precio == null) {
        throw new Error('Precio inválido: usa un entero > 0 (ej. 150.000)')
      }
      const diaNum = Number(dia)
      if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31) {
        throw new Error('Día de cobro debe estar entre 1 y 31')
      }
      const { error } = await supabase
        .from('apps')
        .update({
          precio_mensual_cop: precio,
          dia_vencimiento: diaNum,
          desarrollado_por: dev,
        })
        .eq('id', app.id)
      if (error) throw error
      return { precio, diaNum }
    },
    onSuccess: ({ precio }) => {
      setPrecioText(formatMilesCop(precio))
      setPrecioError(null)
      toast.success('Datos de cobro guardados')
      void qc.invalidateQueries({ queryKey: ['apps'] })
      void qc.invalidateQueries({ queryKey: ['apps', app.id] })
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
          Precio y día editables. Hoy: {formatMilesCop(app.precio_mensual_cop)} COP · día{' '}
          {app.dia_vencimiento} · {desarrolladorLabel(app.desarrollado_por)}
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
            <FieldDescription>Sin default oculto. Entero &gt; 0.</FieldDescription>
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
                <SelectValue />
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
