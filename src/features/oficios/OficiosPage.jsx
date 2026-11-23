import { useEffect, useMemo, useState } from 'react'
import GenerarOficioModal from './GenerarOficioModal'
import OficioDetallePanel from './OficioDetallePanel'
import { OficioEstadoBadge } from './OficioEstadoBadge'
import { getErrorMessage, oficiosApi } from './oficiosApi'

const PAGE_SIZE = 20

const formatFecha = (f) =>
  f ? new Date(`${f}T00:00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—'

export default function OficiosPage() {
  const [dependencias, setDependencias] = useState([])
  const [filtroDep, setFiltroDep] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 1, page: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showGenerar, setShowGenerar] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    oficiosApi
      .dependencias()
      .then((list) => setDependencias(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    oficiosApi
      .listar({
        dependencia: filtroDep || undefined,
        page,
        size: PAGE_SIZE,
      })
      .then((res) => {
        if (!cancelled) {
          setData({
            content: res?.content ?? [],
            totalElements: res?.totalElements ?? 0,
            totalPages: res?.totalPages ?? 1,
            page: res?.page ?? page,
          })
        }
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'No se pudo cargar el listado de oficios.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [filtroDep, page, reloadKey])

  const mapaDependencias = useMemo(() => {
    const map = {}
    dependencias.forEach((d) => {
      map[d.codigo] = d
    })
    return map
  }, [dependencias])

  const cambiarFiltro = (codigo) => {
    setFiltroDep(codigo)
    setPage(0)
  }

  const handleGenerados = (creados) => {
    setShowGenerar(false)
    const count = Array.isArray(creados) ? creados.length : 1
    setNotice(
      count === 1
        ? `Oficio ${creados[0]?.folio || ''} generado correctamente.`
        : `Se generaron ${count} oficios correctamente.`
    )
    setPage(0)
    setReloadKey((k) => k + 1)
  }

  const selectedOficio = data.content.find((o) => o.id === selectedId)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Oficios y Envíos</h2>
          <p className="text-sm text-slate-500">
            Generación de oficios a dependencias, envío por correo y registro de acuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNotice('')
            setShowGenerar(true)
          }}
          disabled={dependencias.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          + Generar oficio
        </button>
      </div>

      {/* Filtros por dependencia */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por dependencia">
        <button
          type="button"
          onClick={() => cambiarFiltro('')}
          aria-pressed={filtroDep === ''}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filtroDep === ''
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
          }`}
        >
          Todas
        </button>
        {dependencias.map((d) => (
          <button
            key={d.codigo}
            type="button"
            onClick={() => cambiarFiltro(d.codigo)}
            aria-pressed={filtroDep === d.codigo}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filtroDep === d.codigo
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
            }`}
          >
            {d.nombre}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla principal */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {['Folio', 'Dependencia', 'Modo', 'Solicitudes', 'Fecha oficio', 'Estado', 'Acuse', ''].map(
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
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : data.content.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No hay oficios registrados para este filtro.
                  </td>
                </tr>
              ) : (
                data.content.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                      {o.folio}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {o.dependenciaNombre || o.dependencia}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{o.modo}</td>
                    <td className="px-4 py-3 text-slate-600">{o.cantidadSolicitudes ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatFecha(o.fechaOficio)}
                    </td>
                    <td className="px-4 py-3">
                      <OficioEstadoBadge estado={o.estado} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {o.acuseNumero ? `${o.acuseNumero} (${formatFecha(o.acuseFecha)})` : 'Pendiente'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedId(o.id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Gestionar
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

      {showGenerar && (
        <GenerarOficioModal
          dependencias={dependencias}
          onClose={() => setShowGenerar(false)}
          onGenerados={handleGenerados}
        />
      )}

      {selectedId !== null && (
        <OficioDetallePanel
          oficioId={selectedId}
          dependenciaInfo={selectedOficio ? mapaDependencias[selectedOficio.dependencia] : null}
          onClose={() => setSelectedId(null)}
          onUpdated={() => setReloadKey((k) => k + 1)}
        />
      )}
    </section>
  )
}