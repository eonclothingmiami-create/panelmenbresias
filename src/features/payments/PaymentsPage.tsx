import { useQuery } from '@tanstack/react-query'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCop, formatDateOnly } from '@/lib/format'
import { supabase } from '@/lib/supabase'

interface PaymentRow {
  id: string
  fecha: string
  monto_cop: number
  periodo_desde: string
  periodo_hasta: string
  medio: string | null
  referencia: string | null
  notas: string | null
  apps: { nombre: string; slug: string } | null
}

export function PaymentsPage() {
  const payments = useQuery({
    queryKey: ['payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, apps(nombre, slug)')
        .order('fecha', { ascending: false })
      if (error) throw error
      return data as PaymentRow[]
    },
  })

  function exportCsv() {
    const rows = payments.data ?? []
    const header = [
      'fecha',
      'app',
      'slug',
      'monto_cop',
      'periodo_desde',
      'periodo_hasta',
      'medio',
      'referencia',
      'notas',
    ]
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.fecha,
          csv(r.apps?.nombre ?? ''),
          csv(r.apps?.slug ?? ''),
          r.monto_cop,
          r.periodo_desde,
          r.periodo_hasta,
          csv(r.medio ?? ''),
          csv(r.referencia ?? ''),
          csv(r.notas ?? ''),
        ].join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pagos-panel-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">Pagos</h2>
          <p className="text-sm text-muted-foreground">Historial global · exportar CSV.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={exportCsv}
          disabled={!payments.data?.length}
        >
          <DownloadIcon data-icon="inline-start" />
          Exportar CSV
        </Button>
      </div>

      {payments.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>App</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead>Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(payments.data ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDateOnly(p.fecha)}</TableCell>
                <TableCell>
                  {p.apps?.nombre ?? '—'}
                  <span className="block text-xs text-muted-foreground">{p.apps?.slug}</span>
                </TableCell>
                <TableCell>{formatCop(p.monto_cop)}</TableCell>
                <TableCell>
                  {formatDateOnly(p.periodo_desde)} → {formatDateOnly(p.periodo_hasta)}
                </TableCell>
                <TableCell>{p.medio ?? '—'}</TableCell>
                <TableCell>{p.referencia ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function csv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
