import { useEffect, useState } from 'react'
import DatosExtraidos from './DatosExtraidos'
import EstadoBadge from './EstadoBadge'
import RevisionForm from './RevisionForm'
import { getErrorMessage, normalizePage, solicitudesApi } from './solicitudesApi'

const FILTROS = ['Todos', 'Pendiente', 'Aprobado', 'Rechazado']
const PAGE_SIZE = 20

const formatFecha = (f) =>
  f ? new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const esPendiente = (s) => s?.estadoRevision?.trim().toLowerCase() === 'pendiente'

function DetallePanel({ solicitud, onClose, onRevisada }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de la solicitud ${solicitud.id}`}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">Solicitud #{solicitud.id}</h3>
            <EstadoBadge estado={solicitud.estadoRevision} />
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
          <dl className="space-y-2 text-sm">
            {[
              ['Establecimiento', solicitud.establecimiento],
              ['Giro comercial', solicitud.giroComercial],
              ['Fecha', formatFecha(solicitud.fecha)],
              ['Revisado por', solicitud.revisadoPorNumEmpleado],
              ['Archivo de origen', solicitud.archivoOrigen],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="col-span-2 break-words font-medium text-slate-800">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">Datos extraídos</h4>
            <DatosExtraidos datos={solicitud.datosExtraidos} />
          </div>

          {esPendiente(solicitud) && (
            <RevisionForm solicitudId={solicitud.id} onDone={onRevisada} />
          )}
        </div>
      </aside>
    </div>
  )
}

export default function SolicitudesPage() {
  const [filtro, setFiltro] = useState('Todos')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 1, page: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    solicitudesApi
      .listar({
        estadoRevision: filtro === 'Todos' ? undefined : filtro,
        page,
        size: PAGE_SIZE,
      })
      .then((res) => !cancelled && setData(normalizePage(res)))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'No se pudo cargar el listado.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [filtro, page, reloadKey])

  const cambiarFiltro = (nuevo) => {
    setFiltro(nuevo)
    setPage(0)
  }

  const handleRevisada = (actualizada) => {
    setSelected(actualizada) // el panel muestra el nuevo estado
    setReloadKey((k) => k + 1) // refresca la tabla respetando el filtro activo
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Solicitudes</h2>
        <p className="text-sm text-slate-500">Consulta y revisión de solicitudes registradas.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => cambiarFiltro(f)}
            aria-pressed={filtro === f}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filtro === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {['ID', 'Establecimiento', 'Giro comercial', 'Fecha', 'Estado', 'Revisado por', ''].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : data.content.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No hay solicitudes para mostrar.
                  </td>
                </tr>
              ) : (
                data.content.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{s.id}</td>
                    <td className="px-4 py-3 text-slate-700">{s.establecimiento ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.giroComercial ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatFecha(s.fecha)}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={s.estadoRevision} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.revisadoPorNumEmpleado ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {esPendiente(s) ? 'Revisar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>
            Página {data.page + 1} de {Math.max(data.totalPages, 1)} · {data.totalElements} resultados
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0 || loading}
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= data.totalPages || loading}
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </div>

      {selected && (
        <DetallePanel
          solicitud={selected}
          onClose={() => setSelected(null)}
          onRevisada={handleRevisada}
        />
      )}
    </section>
  )
}