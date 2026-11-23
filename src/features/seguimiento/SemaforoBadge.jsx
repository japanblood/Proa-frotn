export const SEMAFORO_STYLES = {
  VERDE: {
    label: 'Verde',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    active: 'ring-2 ring-emerald-500',
    dot: 'bg-emerald-500',
  },
  AMARILLO: {
    label: 'Amarillo',
    badge: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
    card: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    active: 'ring-2 ring-yellow-500',
    dot: 'bg-yellow-400',
  },
  ROJO: {
    label: 'Rojo',
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
    card: 'border-red-200 bg-red-50 text-red-800',
    active: 'ring-2 ring-red-500',
    dot: 'bg-red-500',
  },
  MORADO: {
    label: 'Morado',
    badge: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    card: 'border-purple-200 bg-purple-50 text-purple-800',
    active: 'ring-2 ring-purple-500',
    dot: 'bg-purple-500',
  },
  CERRADO: {
    label: 'Cerrado',
    badge: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    dot: 'bg-slate-400',
  },
}

export function SemaforoBadge({ semaforo }) {
  const key = semaforo?.trim().toUpperCase() || ''
  const style = SEMAFORO_STYLES[key]
  const classes = style?.badge || 'bg-slate-100 text-slate-700 ring-slate-500/20'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style?.dot || 'bg-slate-400'}`} aria-hidden="true" />
      {style?.label || semaforo || '—'}
    </span>
  )
}

const DICTAMENES = {
  FAVORABLE: ['Favorable', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'],
  CONDICIONADO: ['Condicionado', 'bg-amber-50 text-amber-700 ring-amber-600/20'],
  NO_FAVORABLE: ['No favorable', 'bg-red-50 text-red-700 ring-red-600/20'],
  PENDIENTE: ['Pendiente', 'bg-slate-100 text-slate-700 ring-slate-500/20'],
}

export function DictamenBadge({ dictamen }) {
  const key = dictamen?.trim().toUpperCase() || ''
  const [label, classes] = DICTAMENES[key] || [
    dictamen || '—',
    'bg-slate-100 text-slate-700 ring-slate-500/20',
  ]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {label}
    </span>
  )
}
