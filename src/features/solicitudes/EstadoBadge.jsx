const ESTILOS = {
  pendiente: 'bg-amber-100 text-amber-700',
  aprobado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
}

export default function EstadoBadge({ estado }) {
  const clase = ESTILOS[estado?.trim().toLowerCase()] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>
      {estado ?? '—'}
    </span>
  )
}