import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/types/database'

const schema = z.object({
  nombre: z.string().min(2),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  notas: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ClientsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

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
    defaultValues: { nombre: '', contacto: '', telefono: '', notas: '' },
  })

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) {
        const { error } = await supabase.from('clients').update(values).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('clients').insert(values)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Cliente actualizado' : 'Cliente creado')
      setOpen(false)
      setEditing(null)
      form.reset()
      void qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cliente eliminado')
      void qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openCreate() {
    setEditing(null)
    form.reset({ nombre: '', contacto: '', telefono: '', notas: '' })
    setOpen(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    form.reset({
      nombre: c.nombre,
      contacto: c.contacto ?? '',
      telefono: c.telefono ?? '',
      notas: c.notas ?? '',
    })
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">Clientes</h2>
          <p className="text-sm text-muted-foreground">CRUD simple de clientes del panel.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          Nuevo cliente
        </Button>
      </div>

      {clients.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Tel / WhatsApp</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(clients.data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell>{c.contacto ?? '—'}</TableCell>
                <TableCell>{c.telefono ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`¿Eliminar ${c.nombre}?`)) remove.mutate(c.id)
                    }}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="c-nombre">Nombre</FieldLabel>
                <Input id="c-nombre" {...form.register('nombre')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-contacto">Contacto</FieldLabel>
                <Input id="c-contacto" {...form.register('contacto')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-tel">Teléfono / WhatsApp</FieldLabel>
                <Input id="c-tel" {...form.register('telefono')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-notas">Notas</FieldLabel>
                <Textarea id="c-notas" {...form.register('notas')} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
