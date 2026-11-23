import { useState } from 'react'
import { MAX_OBSERVACIONES, getErrorMessage, solicitudesApi } from './solicitudesApi'

const OPCIONES = [
  { value: 'Aprobado', label: 'Aprobar', activo: 'border-green-500 bg-green-50 text-green-700' },
  { value: 'Rechazado', label: 'Rechazar', activo: 'border-red-500 bg-red-50 text-red-700' },
]

export default function RevisionForm({ solicitudId, onDone }) {
  const [estado, setEstado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const excedido = observaciones.length > MAX_OBSERVACIONES

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!estado || excedido) return
    setError('')
    setSaving(true)
    try {
      const actualizada = await solicitudesApi.revisar(solicitudId, { estado, observaciones })
      onDone?.(actualizada)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar la revisión.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Revisión de la solicitud</h4>
        <p className="text-xs text-slate-500">
          Verifica los datos contra la imagen original antes de confirmar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {OPCIONES.map((op) => (
          <label
            key={op.value}
            className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors ${
              estado === op.value ? op.activo : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <input
              type="radio"
              name={`estado-${solicitudId}`}
              value={op.value}
              checked={estado === op.value}
              onChange={() => setEstado(op.value)}
              className="sr-only"
            />
            {op.label}
          </label>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor={`obs-${solicitudId}`} className="text-sm font-medium text-slate-700">
          Observaciones <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id={`obs-${solicitudId}`}
          rows={3}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            excedido ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-indigo-500'
          }`}
        />
        <p className={`text-right text-xs ${excedido ? 'text-red-600' : 'text-slate-400'}`}>
          {observaciones.length}/{MAX_OBSERVACIONES}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!estado || excedido || saving}
        className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Confirmar revisión'}
      </button>
    </form>
  )
}