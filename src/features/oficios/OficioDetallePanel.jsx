import { useEffect, useState } from 'react'
import { EnvioEstadoBadge, OficioEstadoBadge } from './OficioEstadoBadge'
import { getErrorMessage, oficiosApi } from './oficiosApi'

const formatFechaHora = (f) =>
  f ? new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const formatFecha = (f) =>
  f ? new Date(`${f}T00:00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function OficioDetallePanel({ oficioId, dependenciaInfo, onClose, onUpdated }) {
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Descarga PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Envío por correo
  const [usarCorreosCustom, setUsarCorreosCustom] = useState(false)
  const [correosTexto, setCorreosTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Acuse de recibido
  const [acuseNumero, setAcuseNumero] = useState('')
  const [acuseFecha, setAcuseFecha] = useState(hoyISO())
  const [guardandoAcuse, setGuardandoAcuse] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const cargarDetalle = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await oficiosApi.consultar(oficioId)
      setDetalle(data)
      if (data?.oficio?.acuseNumero) setAcuseNumero(data.oficio.acuseNumero)
      if (data?.oficio?.acuseFecha) setAcuseFecha(data.oficio.acuseFecha)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el detalle del oficio.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDetalle()
  }, [oficioId])

  const handleDescargarPdf = async () => {
    setDownloadingPdf(true)
    setError('')
    try {
      await oficiosApi.descargarPdf(oficioId, detalle?.oficio?.folio)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo descargar el PDF del oficio.'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleEnviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    setNotice('')
    try {
      const listaCorreos = usarCorreosCustom
        ? correosTexto
            .split(/[,;\n]+/)
            .map((c) => c.trim())
            .filter(Boolean)
        : null

      if (usarCorreosCustom && (!listaCorreos || listaCorreos.length === 0)) {
        setError('Captura al menos un correo destinatario o usa los predeterminados.')
        setEnviando(false)
        return
      }

      await oficiosApi.enviar(oficioId, listaCorreos)
      setNotice('Oficio enviado correctamente.')
      await cargarDetalle()
      onUpdated?.()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar el oficio por correo.'))
    } finally {
      setEnviando(false)
    }
  }

  const handleAcuse = async (e) => {
    e.preventDefault()
    if (!acuseNumero.trim() || !acuseFecha) {
      setError('El folio y la fecha del acuse son obligatorios.')
      return
    }
    setGuardandoAcuse(true)
    setError('')
    setNotice('')
    try {
      await oficiosApi.registrarAcuse(oficioId, {
        numero: acuseNumero,
        fecha: acuseFecha,
      })
      setNotice('Acuse de recibido guardado.')
      await cargarDetalle()
      onUpdated?.()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar el acuse.'))
    } finally {
      setGuardandoAcuse(false)
    }
  }

  const oficio = detalle?.oficio

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del oficio"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">
              {oficio?.folio || `Oficio #${oficioId}`}
            </h3>
            {oficio && <OficioEstadoBadge estado={oficio.estado} />}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDescargarPdf}
              disabled={downloadingPdf || loading}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {downloadingPdf ? 'Descargando...' : 'Descargar PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>
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

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-slate-200" />
              ))}
            </div>
          ) : oficio ? (
            <>
              {/* Metadatos */}
              <dl className="space-y-2 text-sm">
                {[
                  ['Dependencia', `${oficio.dependenciaNombre || oficio.dependencia} (${oficio.dependencia})`],
                  ['Modo', oficio.modo],
                  ['Asunto', oficio.asunto],
                  ['Fecha de oficio', formatFecha(oficio.fechaOficio)],
                  ['Solicitudes incluidas', detalle.solicitudIds?.map((id) => `#${id}`).join(', ')],
                  ['Generado por', oficio.generadoPor],
                  ['Fecha de creación', formatFechaHora(oficio.generadoEn)],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-3 gap-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="col-span-2 break-words font-medium text-slate-800">{value || '—'}</dd>
                  </div>
                ))}
              </dl>

              {/* Sección Envío por Correo */}
              <form
                onSubmit={handleEnviar}
                className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Envío por correo (Gmail)</h4>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={usarCorreosCustom}
                      onChange={(e) => setUsarCorreosCustom(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    Personalizar destinatarios
                  </label>
                </div>

                {!usarCorreosCustom ? (
                  <p className="text-xs text-slate-600">
                    Se enviará a los correos de la dependencia:{' '}
                    <span className="font-medium text-slate-800">
                      {dependenciaInfo?.correos?.length > 0
                        ? dependenciaInfo.correos.join(', ')
                        : 'Configurados en servidor'}
                    </span>
                  </p>
                ) : (
                  <div>
                    <textarea
                      rows={2}
                      value={correosTexto}
                      onChange={(e) => setCorreosTexto(e.target.value)}
                      placeholder="correo1@tonala.gob.mx, correo2@tonala.gob.mx"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Separa múltiples direcciones con coma o salto de línea (máx. 10).
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {enviando
                    ? 'Enviando oficio...'
                    : detalle.envios?.length > 0
                      ? 'Reenviar oficio'
                      : 'Enviar oficio'}
                </button>
              </form>

              {/* Sección Acuse de Recibido */}
              <form
                onSubmit={handleAcuse}
                className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <h4 className="text-sm font-semibold text-slate-800">Acuse de recibido</h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Folio / Número de acuse *
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      required
                      value={acuseNumero}
                      onChange={(e) => setAcuseNumero(e.target.value)}
                      placeholder="Ej. REC-2026-0412"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Fecha de recepción *
                    </label>
                    <input
                      type="date"
                      max={hoyISO()}
                      required
                      value={acuseFecha}
                      onChange={(e) => setAcuseFecha(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardandoAcuse}
                  className="rounded-md bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {guardandoAcuse
                    ? 'Guardando acuse...'
                    : oficio.acuseNumero
                      ? 'Actualizar acuse'
                      : 'Registrar acuse'}
                </button>
              </form>

              {/* Historial de envíos */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">
                  Historial de envíos ({detalle.envios?.length || 0})
                </h4>
                {!detalle.envios || detalle.envios.length === 0 ? (
                  <p className="text-xs text-slate-400">Aún no se ha enviado este oficio por correo.</p>
                ) : (
                  <ul className="space-y-2">
                    {detalle.envios.map((env) => (
                      <li
                        key={env.id}
                        className="rounded-md border border-slate-200 px-3 py-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <EnvioEstadoBadge estado={env.estado} />
                          <span className="text-slate-500">{formatFechaHora(env.enviadoEn)}</span>
                        </div>
                        <p className="mt-1 font-medium text-slate-700">Para: {env.destinatarios}</p>
                        {env.enviadoPor && (
                          <p className="text-slate-500">Por: {env.enviadoPor}</p>
                        )}
                        {env.error && (
                          <p className="mt-1 rounded bg-red-50 px-2 py-1 text-red-700">{env.error}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}