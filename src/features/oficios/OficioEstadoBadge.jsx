const ESTADOS_OFICIO = {
  GENERADO: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ENVIADO: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ERROR_ENVIO: 'bg-red-50 text-red-700 ring-red-600/20',
  ACUSE_REGISTRADO: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
}

const LABELS_OFICIO = {
  GENERADO: 'Generado',
  ENVIADO: 'Enviado',
  ERROR_ENVIO: 'Error de envío',
  ACUSE_REGISTRADO: 'Acuse registrado',
}

export function OficioEstadoBadge({ estado }) {
  const key = estado?.trim().toUpperCase() || ''
  const classes = ESTADOS_OFICIO[key] || 'bg-slate-100 text-slate-700 ring-slate-500/20'
  const label = LABELS_OFICIO[key] || estado || '—'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {label}
    </span>
  )
}

export function EnvioEstadoBadge({ estado }) {
  const key = estado?.trim().toUpperCase() || ''
  const esOk = key.includes('ACEPTADO') || key.includes('ENVIADO') || key === 'OK'
  const classes = esOk
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : 'bg-red-50 text-red-700 ring-red-600/20'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${classes}`}>
      {estado || '—'}
    </span>
  )
}