import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { DictamenBadge, SemaforoBadge } from './SemaforoBadge'
import {
  DICTAMENES,
  formatFecha,
  formatFechaHora,
  getErrorMessage,
  seguimientoApi,
} from './seguimientoApi'

const esVisible = (nombre = '') => /\.(pdf|png|jpe?g|gif|webp)$/i.test(nombre)

export default function SeguimientoDetallePanel({ expedienteInicial, onClose, onUpdated }) {
const { permisos = [] } = useAuth();
const puedeResponder = true; // permisos.includes('SEGUIMIENTO:RESPONDER');
const puedeCerrar = true;    // permisos.includes('SEGUIMIENTO:CERRAR');

  const id = expedienteInicial.id
  const [exp, setExp] = useState(expedienteInicial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyArchivo, setBusyArchivo] = useState(null)

  // Formulario de respuesta
  const fileRef = useRef(null)
  const [archivo, setArchivo] = useState(null)
  const [observaciones, setObservaciones] = useState('')
  const [cerrar, setCerrar] = useState(false)
  const [dictamen, setDictamen] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const cargar = async () => {
    setLoading(true)
    try {
      setExp(await seguimientoApi.consultar(id))
    } catch (err) {
      // Si no hay detalle, se conserva lo que ya traía el listado
      setError(getErrorMessage(err, 'No se pudo cargar el detalle del expediente.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [id])

  const handleArchivo = async (r, modo) => {
    // La pestaña se abre en el clic (síncrono) para que el navegador no la bloquee
    const win = modo === 'ver' ? window.open('', '_blank') : null
    setBusyArchivo(`${r.id}-${modo}`)
    setError('')
    try {
      await seguimientoApi.abrirArchivo(r.id, { modo, win, fallbackName: r.nombreArchivo })
    } catch (err) {
      win?.close()
      setError(getErrorMessage(err, 'No se pudo obtener el archivo.'))
    } finally {
      setBusyArchivo(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')

    if (!archivo) return setError('Selecciona el documento de respuesta.')
    if (cerrar && !dictamen) return setError('Selecciona el dictamen final para cerrar el expediente.')

    setGuardando(true)
    try {
      await seguimientoApi.registrarRespuesta(id, { archivo, observaciones, cerrar, dictamen })
      setNotice(
        cerrar ? 'Respuesta registrada y expediente cerrado.' : 'Respuesta registrada correctamente.'
      )
      setArchivo(null)
      if (fileRef.current) fileRef.current.value = ''
      setObservaciones('')
      setCerrar(false)
      setDictamen('')
      await cargar()
      onUpdated?.()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar la respuesta.'))
    } finally {
      setGuardando(false)
    }
  }

  const respuestas = [...(exp.respuestas ?? [])].sort(
    (a, b) => new Date(a.fecha ?? 0) - new Date(b.fecha ?? 0)
  )
  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-[#6b1d3a] focus:outline-none focus:ring-1 focus:ring-[#6b1d3a]'

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del expediente"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">
              {exp.folioOficio || `Expediente #${id}`}
            </h3>
            <SemaforoBadge semaforo={exp.cerrado ? 'CERRADO' : exp.semaforo} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          {error && (
            <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          )}

          {/* Datos del expediente */}
          <dl className="space-y-2 text-sm">
            {[
              ['Dependencia', exp.dependenciaNombre],
              ['Inicio de conteo', formatFecha(exp.fechaInicio)],
              ['Días hábiles', exp.diasHabiles],
              [
                'Solicitudes',
                exp.solicitudes?.length ? exp.solicitudes.map((s) => s.folio).join(', ') : null,
              ],
              ...(exp.cerrado
                ? [
                    ['Dictamen final', <DictamenBadge key="d" dictamen={exp.dictamen} />],
                    ['Fecha de cierre', exp.fechaCierre ? formatFechaHora(exp.fechaCierre) : null],
                    ['Observaciones de cierre', exp.observacionesCierre],
                  ]
                : []),
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="col-span-2 break-words font-medium text-slate-800">
                  {value ?? '—'}
                </dd>
              </div>
            ))}
          </dl>

          {/* Historial de respuestas */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">
              Historial de respuestas ({respuestas.length})
            </h4>
            {loading && respuestas.length === 0 ? (
              <div className="h-12 animate-pulse rounded bg-slate-200" />
            ) : respuestas.length === 0 ? (
              <p className="text-xs text-slate-400">Aún no se han registrado respuestas.</p>
            ) : (
              <ul className="space-y-2">
                {respuestas.map((r) => (
                  <li key={r.id} className="rounded-md border border-slate-200 px-3 py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2 text-slate-500">
                      <span>{formatFechaHora(r.fecha)}</span>
                      {r.usuario && <span>Por: {r.usuario}</span>}
                    </div>
                    {r.observaciones && (
                      <p className="mt-1 whitespace-pre-line text-slate-700">{r.observaciones}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-700">
                        {r.nombreArchivo || 'Documento adjunto'}
                      </span>
                      <div className="flex shrink-0 gap-2">
                        {esVisible(r.nombreArchivo) && (
                          <button
                            type="button"
                            onClick={() => handleArchivo(r, 'ver')}
                            disabled={busyArchivo !== null}
                            className="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            {busyArchivo === `${r.id}-ver` ? 'Abriendo...' : 'Ver'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleArchivo(r, 'descargar')}
                          disabled={busyArchivo !== null}
                          className="rounded-md bg-[#6b1d3a] px-2.5 py-1 font-medium text-white hover:bg-[#561730] disabled:opacity-50"
                        >
                          {busyArchivo === `${r.id}-descargar` ? 'Descargando...' : 'Descargar'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Formulario de respuesta */}
          {!exp.cerrado && puedeResponder && (
            <form
              onSubmit={handleSubmit}
              className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <h4 className="text-sm font-semibold text-slate-800">Registrar respuesta</h4>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Documento de respuesta *
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  required
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Observaciones</label>
                <textarea
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className={inputClass}
                />
              </div>

              {puedeCerrar && (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={cerrar}
                      onChange={(e) => setCerrar(e.target.checked)}
                      className="rounded border-slate-300 text-[#6b1d3a] focus:ring-[#6b1d3a]"
                    />
                    Cerrar expediente al registrar esta respuesta
                  </label>

                  {cerrar && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Dictamen final *
                      </label>
                      <select
                        value={dictamen}
                        onChange={(e) => setDictamen(e.target.value)}
                        required
                        className={inputClass}
                      >
                        <option value="">Selecciona un dictamen</option>
                        {DICTAMENES.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Al cerrar se congelan los días hábiles del expediente.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-[#6b1d3a] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#561730] disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : cerrar
                    ? 'Registrar respuesta y cerrar'
                    : 'Registrar respuesta'}
              </button>
            </form>
          )}
        </div>
      </aside>
    </div>
  )
}
