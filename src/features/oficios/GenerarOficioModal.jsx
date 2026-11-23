import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage, oficiosApi } from './oficiosApi'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function GenerarOficioModal({ dependencias, onClose, onGenerados }) {
  const [dependencia, setDependencia] = useState(dependencias[0]?.codigo ?? '')
  const [modo, setModo] = useState('AGRUPADO')
  const [asunto, setAsunto] = useState('')
  const [fechaOficio, setFechaOficio] = useState(hoyISO())

  const [elegibles, setElegibles] = useState([])
  const [loadingElegibles, setLoadingElegibles] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionadas, setSeleccionadas] = useState([])

  const [preview, setPreview] = useState(null)
  const [previewIndice, setPreviewIndice] = useState(0)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const depActual = useMemo(
    () => dependencias.find((d) => d.codigo === dependencia),
    [dependencias, dependencia]
  )

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!dependencia) return
    let cancelled = false
    setLoadingElegibles(true)
    setError('')
    setSeleccionadas([])
    setPreview(null)
    setPreviewIndice(0)

    oficiosApi
      .elegibles(dependencia)
      .then((list) => {
        if (!cancelled) setElegibles(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setElegibles([])
          setError(getErrorMessage(err, 'No se pudieron cargar las solicitudes elegibles.'))
        }
      })
      .finally(() => !cancelled && setLoadingElegibles(false))

    return () => {
      cancelled = true
    }
  }, [dependencia])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return elegibles
    return elegibles.filter((s) =>
      [s.folio, s.contribuyente, s.nombreNegocio, s.giro, String(s.id)]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    )
  }, [elegibles, busqueda])

  const toggleSolicitud = (id) => {
    setPreview(null)
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleTodas = () => {
    setPreview(null)
    const idsFiltradas = filtradas.map((s) => s.id)
    const todasMarcadas =
      idsFiltradas.length > 0 && idsFiltradas.every((id) => seleccionadas.includes(id))

    if (todasMarcadas) {
      setSeleccionadas((prev) => prev.filter((id) => !idsFiltradas.includes(id)))
    } else {
      setSeleccionadas((prev) => Array.from(new Set([...prev, ...idsFiltradas])).slice(0, 200))
    }
  }

  const buildPayload = () => ({
    dependencia,
    modo,
    solicitudIds: seleccionadas,
    asunto: asunto.trim() || null,
    fechaOficio: fechaOficio || null,
  })

  const cargarPreview = async (indice = 0) => {
    if (seleccionadas.length === 0) {
      setError('Selecciona al menos una solicitud para previsualizar.')
      return
    }
    setLoadingPreview(true)
    setError('')
    try {
      const res = await oficiosApi.previsualizar(buildPayload(), indice)
      setPreview(res)
      setPreviewIndice(res.indice ?? indice)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar la vista previa.'))
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleGenerar = async (e) => {
    e.preventDefault()
    if (seleccionadas.length === 0) {
      setError('Selecciona al menos una solicitud.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const creados = await oficiosApi.generar(buildPayload())
      onGenerados(creados)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron generar los oficios.'))
    } finally {
      setSubmitting(false)
    }
  }

  const todasFiltradasMarcadas =
    filtradas.length > 0 && filtradas.every((s) => seleccionadas.includes(s.id))

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generar nuevos oficios"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        {/* Cabecera */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Generar Oficios</h3>
            <p className="text-xs text-slate-500">
              Selecciona la dependencia y las solicitudes aprobadas pendientes de oficio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </header>

        {/* Cuerpo */}
        <form onSubmit={handleGenerar} className="flex flex-1 flex-col overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Configuración del oficio */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Dependencia destinataria *
              </label>
              <select
                value={dependencia}
                onChange={(e) => setDependencia(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {dependencias.map((d) => (
                  <option key={d.codigo} value={d.codigo}>
                    {d.nombre} ({d.codigo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Modo de emisión *</label>
              <select
                value={modo}
                onChange={(e) => {
                  setModo(e.target.value)
                  setPreview(null)
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="AGRUPADO">Agrupado (1 oficio para todas)</option>
                <option value="INDIVIDUAL">Individual (1 oficio por solicitud)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Fecha del oficio</label>
              <input
                type="date"
                value={fechaOficio}
                onChange={(e) => {
                  setFechaOficio(e.target.value)
                  setPreview(null)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Asunto personalizado (opcional)
              </label>
              <input
                type="text"
                maxLength={200}
                value={asunto}
                onChange={(e) => {
                  setAsunto(e.target.value)
                  setPreview(null)
                }}
                placeholder="Si se deja vacío, se usará el asunto predeterminado de la plantilla..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Info de dependencia */}
          {depActual && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600 ring-1 ring-slate-200">
              <div>
                <span className="font-semibold text-slate-700">Titular:</span>{' '}
                {depActual.titular || 'Sin titular'} {depActual.cargo ? `(${depActual.cargo})` : ''}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Correos configurados:</span>{' '}
                {depActual.correos?.length > 0 ? (
                  depActual.correos.join(', ')
                ) : (
                  <span className="font-medium text-amber-700">Ninguno configurado</span>
                )}
              </div>
            </div>
          )}

          {/* Selección de solicitudes elegibles */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Solicitudes elegibles ({seleccionadas.length} seleccionadas de {elegibles.length})
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por folio, negocio, contribuyente o giro..."
                className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 uppercase text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={todasFiltradasMarcadas}
                        onChange={toggleTodas}
                        disabled={filtradas.length === 0}
                        aria-label="Seleccionar todas"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Folio</th>
                    <th className="px-3 py-2 font-medium">Negocio / Establecimiento</th>
                    <th className="px-3 py-2 font-medium">Contribuyente</th>
                    <th className="px-3 py-2 font-medium">Giro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingElegibles ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        Cargando solicitudes elegibles...
                      </td>
                    </tr>
                  ) : filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No hay solicitudes aprobadas disponibles para esta dependencia.
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((s) => {
                      const checked = seleccionadas.includes(s.id)
                      return (
                        <tr
                          key={s.id}
                          onClick={() => toggleSolicitud(s.id)}
                          className={`cursor-pointer transition-colors ${
                            checked ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSolicitud(s.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
                            {s.folio || `#${s.id}`}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{s.nombreNegocio || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{s.contribuyente || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{s.giro || '—'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista previa HTML */}
          {preview && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-800">
                    Vista previa ({previewIndice + 1} de {preview.totalOficios})
                  </span>
                  {preview.folioProvisional && (
                    <span className="ml-2 rounded bg-white px-2 py-0.5 font-mono text-slate-600 ring-1 ring-slate-200">
                      Folio provisional: {preview.folioProvisional}
                    </span>
                  )}
                </div>

                {preview.totalOficios > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={previewIndice === 0 || loadingPreview}
                      onClick={() => cargarPreview(previewIndice - 1)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={previewIndice + 1 >= preview.totalOficios || loadingPreview}
                      onClick={() => cargarPreview(previewIndice + 1)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>

              <iframe
                title="Vista previa del oficio"
                srcDoc={preview.html}
                sandbox=""
                className="h-72 w-full rounded border border-slate-200 bg-white"
              />
            </div>
          )}

          {/* Pie de acciones */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => cargarPreview(0)}
              disabled={seleccionadas.length === 0 || loadingPreview || submitting}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {loadingPreview ? 'Generando vista previa...' : 'Previsualizar documento'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={seleccionadas.length === 0 || submitting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting
                  ? 'Generando...'
                  : modo === 'INDIVIDUAL' && seleccionadas.length > 1
                    ? `Generar ${seleccionadas.length} oficios`
                    : 'Generar oficio'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}