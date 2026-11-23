import { useEffect, useMemo, useState } from 'react'
import SeguimientoDetallePanel from './SeguimientoDetallePanel'
import { DictamenBadge, SEMAFORO_STYLES, SemaforoBadge } from './SemaforoBadge'
import {
  SEMAFOROS,
  formatFecha,
  getErrorMessage,
  seguimientoApi,
} from './seguimientoApi'

const PAGE_SIZE = 20

const ESTADOS = [
  { value: 'activos', label: 'Activos', cerrado: false },
  { value: 'cerrados', label: 'Cerrados', cerrado: true },
  { value: 'todos', label: 'Todos', cerrado: undefined },
]

const tabClass = (active) =>
  `flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active
      ? 'bg-[#6b1d3a] text-white'
      : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
  }`

export default function SeguimientoPage() {
  const [resumen, setResumen] = useState({ dependencias: [], semaforos: {}, totalActivos: 0 })
  const [depTab, setDepTab] = useState('')
  const [semaforo, setSemaforo] = useState('')
  const [estado, setEstado] = useState('activos')
  const [busqueda, setBusqueda] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 1, page: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Resumen (pestañas y tarjetas)
  useEffect(() => {
    seguimientoApi
      .resumen()
      .then(setResumen)
      .catch(() => {})
  }, [reloadKey])

  // Debounce del buscador
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [busqueda])

  // Listado
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    seguimientoApi
      .listar({
        dependenciaId: depTab || undefined,
        semaforo: semaforo || undefined,
        cerrado: ESTADOS.find((e) => e.value === estado)?.cerrado,
        q,
        page,
        size: PAGE_SIZE,
      })
      .then((res) => !cancelled && setData(res))
      .catch(
        (err) =>
          !cancelled && setError(getErrorMessage(err, 'No se pudo cargar el listado de expedientes.'))
      )
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [depTab, semaforo, estado, q, page, reloadKey])

  // Las tarjetas reflejan la pestaña activa si el resumen trae el desglose por dependencia
  const conteoSemaforos = useMemo(() => {
    const dep = resumen.dependencias.find((d) => String(d.id) === String(depTab))
    return (depTab && dep?.semaforos) || resumen.semaforos
  }, [resumen, depTab])

  const cambiarDep = (id) => {
    setDepTab(id)
    setPage(0)
  }
  const cambiarSemaforo = (s) => {
    setSemaforo((prev) => (prev === s ? '' : s))
    setPage(0)
  }
  const cambiarEstado = (e) => {
    setEstado(e)
    setPage(0)
  }

  const refrescar = () => setReloadKey((k) => k + 1)

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Seguimiento</h2>
        <p className="text-sm text-slate-500">
          Expedientes por dependencia con semáforo basado en días hábiles.
        </p>
      </div>

      {/* Pestañas por dependencia */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por dependencia">
        <button
          type="button"
          onClick={() => cambiarDep('')}
          aria-pressed={depTab === ''}
          className={tabClass(depTab === '')}
        >
          Todas
          <span className="rounded-full bg-black/10 px-2 text-xs">{resumen.totalActivos}</span>
        </button>
        {resumen.dependencias.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => cambiarDep(String(d.id))}
            aria-pressed={depTab === String(d.id)}
            className={tabClass(depTab === String(d.id))}
          >
            {d.nombre}
            <span className="rounded-full bg-black/10 px-2 text-xs">{d.activos}</span>
          </button>
        ))}
      </div>

      {/* Tarjetas de semáforo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SEMAFOROS.map((s) => {
          const style = SEMAFORO_STYLES[s]
          const activa = semaforo === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => cambiarSemaforo(s)}
              aria-pressed={activa}
              className={`rounded-xl border px-4 py-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#6b1d3a] ${style.card} ${
                activa ? style.active : ''
              }`}
            >
              <span className="text-xs font-medium uppercase tracking-wide">{style.label}</span>
              <span className="mt-1 block text-2xl font-bold">{conteoSemaforos?.[s] ?? 0}</span>
              <span className="text-xs opacity-75">expedientes activos</span>
            </button>
          )
        })}
      </div>
      {semaforo && (
        <button
          type="button"
          onClick={() => cambiarSemaforo(semaforo)}
          className="text-sm font-medium text-[#6b1d3a] hover:underline"
        >
          Limpiar filtro de semáforo ({SEMAFORO_STYLES[semaforo].label})
        </button>
      )}

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md bg-white ring-1 ring-slate-300" role="group" aria-label="Estado">
          {ESTADOS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => cambiarEstado(e.value)}
              aria-pressed={estado === e.value}
              className={`px-4 py-1.5 text-sm font-medium first:rounded-l-md last:rounded-r-md ${
                estado === e.value ? 'bg-[#6b1d3a] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por folio de oficio o de solicitud"
          aria-label="Buscar por folio"
          className="w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-[#6b1d3a] focus:outline-none focus:ring-1 focus:ring-[#6b1d3a]"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  'Folio oficio',
                  'Dependencia',
                  'Solicitudes',
                  'Inicio de conteo',
                  'Días hábiles',
                  'Semáforo',
                  'Estado',
                  '',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
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
                    No hay expedientes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                data.content.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                      {e.folioOficio}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.dependenciaNombre}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {e.solicitudes.length === 0
                        ? '—'
                        : e.solicitudes.length <= 2
                          ? e.solicitudes.map((s) => s.folio).join(', ')
                          : `${e.solicitudes
                              .slice(0, 2)
                              .map((s) => s.folio)
                              .join(', ')} +${e.solicitudes.length - 2}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatFecha(e.fechaInicio)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{e.diasHabiles ?? '—'}</td>
                    <td className="px-4 py-3">
                      <SemaforoBadge semaforo={e.cerrado ? 'CERRADO' : e.semaforo} />
                    </td>
                    <td className="px-4 py-3">
                      {e.cerrado ? (
                        <DictamenBadge dictamen={e.dictamen} />
                      ) : (
                        <span className="text-xs text-slate-500">En seguimiento</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(e)}
                        className="text-sm font-medium text-[#6b1d3a] hover:text-[#561730]"
                      >
                        Ver detalle
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
            Página {data.page + 1} de {Math.max(data.totalPages, 1)} · {data.totalElements}{' '}
            resultados
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
        <SeguimientoDetallePanel
          expedienteInicial={selected}
          onClose={() => setSelected(null)}
          onUpdated={refrescar}
        />
      )}
    </section>
  )
}
