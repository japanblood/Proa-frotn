import { useEffect, useState } from 'react'
import { getErrorMessage, solicitudesApi } from './solicitudesApi'

const LABELS = {
  folio: 'Folio',
  contribuyente: 'Contribuyente',
  giroPrincipal: 'Giro principal',
  girosAnexos: 'Giros anexos',
  domicilio: 'Domicilio',
  colonia: 'Colonia',
  superficieM2: 'Superficie (m²)',
  control: 'Control',
  nombreNegocio: 'Nombre del negocio',
  codigoPostal: 'Código postal',
  telefono: 'Teléfono',
  celular: 'Celular',
  inversionEstimada: 'Inversión estimada',
}

const CAMPOS_OCULTOS = new Set(['advertencias'])

const humanize = (key) =>
  LABELS[key] ??
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())

function normalize(datos) {
  if (typeof datos === 'string') {
    try {
      return JSON.parse(datos)
    } catch {
      return datos
    }
  }
  return datos
}

function Valor({ value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400">—</span>
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? (
      <span className="text-slate-800">{value.join(', ')}</span>
    ) : (
      <span className="text-slate-400">—</span>
    )
  }
  if (typeof value === 'object') {
    return (
      <pre className="whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <span className="text-slate-800">{String(value)}</span>
}

export default function DatosExtraidos({
  datos,
  solicitudId = null,
  editable = false,
  onSaved,
}) {
  const data = normalize(datos)

  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState({})
  const [arrayKeys, setArrayKeys] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setEditando(false)
    setError('')
    setNotice('')
  }, [solicitudId])

  if (data === null || data === undefined || data === '') {
    return <p className="text-sm text-slate-400">Sin datos extraídos.</p>
  }
  if (typeof data !== 'object') {
    return <p className="whitespace-pre-wrap text-sm text-slate-700">{String(data)}</p>
  }

  const entries = Object.entries(data).filter(([k]) => !CAMPOS_OCULTOS.has(k))
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos extraídos.</p>
  }

  const iniciarEdicion = () => {
    const initial = {}
    const arrays = new Set()
    for (const [k, v] of entries) {
      if (Array.isArray(v)) {
        arrays.add(k)
        initial[k] = v.join(', ')
      } else if (v !== null && typeof v === 'object') {
        initial[k] = JSON.stringify(v)
      } else {
        initial[k] = v ?? ''
      }
    }
    setArrayKeys(arrays)
    setDraft(initial)
    setError('')
    setNotice('')
    setEditando(true)
  }

  const cancelarEdicion = () => {
    setEditando(false)
    setError('')
  }

  const handleGuardar = async () => {
    if (!solicitudId) return
    setError('')
    setNotice('')
    setSaving(true)

    try {
      const payload = {}
      for (const [k, rawVal] of Object.entries(draft)) {
        const trimmed = String(rawVal ?? '').trim()
        if (arrayKeys.has(k)) {
          payload[k] = trimmed
            ? trimmed.split(',').map((item) => item.trim()).filter(Boolean)
            : []
        } else if (k === 'superficieM2' || k === 'inversionEstimada') {
          if (trimmed === '') {
            payload[k] = null
          } else {
            const num = Number(trimmed)
            payload[k] = Number.isNaN(num) ? trimmed : num
          }
        } else {
          payload[k] = trimmed === '' ? null : trimmed
        }
      }

      const actualizada = await solicitudesApi.actualizarDatosOcr(solicitudId, payload)
      setEditando(false)
      setNotice('Datos del OCR actualizados correctamente.')
      onSaved?.(actualizada, payload)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron guardar los cambios del OCR.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      {editable && solicitudId && !editando && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={iniciarEdicion}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Editar datos extraídos
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-3 items-center gap-3 px-4 py-2.5 text-sm">
            <dt className="font-medium text-slate-500">{humanize(key)}</dt>
            <dd className="col-span-2 break-words">
              {editando ? (
                <input
                  type="text"
                  value={draft[key] ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={arrayKeys.has(key) ? 'Separados por coma' : ''}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <Valor value={value} />
              )}
            </dd>
          </div>
        ))}
      </dl>

      {editando && (
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={cancelarEdicion}
            disabled={saving}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar datos corregidos'}
          </button>
        </div>
      )}
    </div>
  )
}