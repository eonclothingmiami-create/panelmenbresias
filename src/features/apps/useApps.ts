import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { applyAppState, syncAppStatus } from '@/lib/panel-api'
import type { AppWithClient } from '@/types/database'

export function useApps() {
  const { gate, isOwner } = useAuth()
  return useQuery({
    queryKey: ['apps'],
    enabled: gate === 'ready' && isOwner,
    staleTime: 5_000,
    queryFn: async (): Promise<AppWithClient[]> => {
      const { data, error } = await supabase
        .from('apps')
        .select('*, clients(id, nombre, contacto, telefono, desarrollado_por)')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as AppWithClient[]
    },
  })
}

export function useApp(appId: string | undefined) {
  const { gate, isOwner } = useAuth()
  return useQuery({
    queryKey: ['apps', appId],
    enabled: gate === 'ready' && isOwner && Boolean(appId),
    staleTime: 5_000,
    queryFn: async (): Promise<AppWithClient> => {
      const { data, error } = await supabase
        .from('apps')
        .select('*, clients(id, nombre, contacto, telefono, desarrollado_por)')
        .eq('id', appId!)
        .single()
      if (error) throw error
      return data as AppWithClient
    },
  })
}

export function useSyncAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (apps: { id: string }[]) => {
      const results = []
      for (const app of apps) {
        results.push({ id: app.id, result: await syncAppStatus(app.id) })
      }
      return results
    },
    onSuccess: (results) => {
      const failed = results.filter((r) => !r.result.ok).length
      const ok = results.length - failed
      if (failed === 0) toast.success(`Sincronizadas ${ok} apps`)
      else toast.warning(`${ok} ok · ${failed} con error`)
      void qc.invalidateQueries({ queryKey: ['apps'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useSyncOne() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => syncAppStatus(appId),
    onSuccess: (res, appId) => {
      if (res.ok) toast.success('Estado actualizado')
      else toast.error(res.code ?? 'Error al sincronizar')
      void qc.invalidateQueries({ queryKey: ['apps'] })
      void qc.invalidateQueries({ queryKey: ['apps', appId] })
      void qc.invalidateQueries({ queryKey: ['audit', appId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useApplyState() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      appId: string
      status: string
      current_period_end: string
      grace_until?: string | null
      enforcement_enabled?: boolean
      message?: string | null
    }) => applyAppState(args.appId, args),
    onSuccess: (res, vars) => {
      if (res.ok) toast.success('Cambio aplicado en la app remota')
      else toast.error(res.code ?? 'No se pudo aplicar')
      void qc.invalidateQueries({ queryKey: ['apps'] })
      void qc.invalidateQueries({ queryKey: ['apps', vars.appId] })
      void qc.invalidateQueries({ queryKey: ['audit', vars.appId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
