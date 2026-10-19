export type Desarrollador = 'david' | 'santiago' | 'ambos'

/** Filtro de dashboard: Todos + cada valor del enum. */
export type DesarrolladorFilter = 'todos' | Desarrollador

export const DESARROLLADOR_OPTIONS: { value: Desarrollador; label: string }[] = [
  { value: 'david', label: 'David' },
  { value: 'santiago', label: 'Santiago' },
  { value: 'ambos', label: 'Ambos' },
]

export const DESARROLLADOR_FILTER_OPTIONS: {
  value: DesarrolladorFilter
  label: string
}[] = [{ value: 'todos', label: 'Todos' }, ...DESARROLLADOR_OPTIONS]

export function desarrolladorLabel(value: Desarrollador | string | null | undefined): string {
  switch (value) {
    case 'david':
      return 'David'
    case 'santiago':
      return 'Santiago'
    case 'ambos':
      return 'Ambos'
    default:
      return '—'
  }
}
