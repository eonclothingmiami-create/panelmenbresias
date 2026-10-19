export type Desarrollador = 'david' | 'santiago' | 'ambos'

export const DESARROLLADOR_OPTIONS: { value: Desarrollador; label: string }[] = [
  { value: 'david', label: 'David' },
  { value: 'santiago', label: 'Santiago' },
  { value: 'ambos', label: 'Ambos' },
]

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
