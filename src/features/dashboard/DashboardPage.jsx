import { useEffect, useState } from 'react'
import httpClient from '../../api/httpClient'

// Cambia a false cuando el backend exponga el endpoint de resumen
const USE_MOCK = false
const ENDPOINT = '/dashboard/resumen'

// Estructura esperada del JSON (los conteos del semáforo son de seguimientos abiertos)
const MOCK_DATA = {
  solicitudesPendientes: 18,
  oficiosEnviados: 42,
  semaforo: { verde: 21, amarillo: 9, rojo: 5, morado: 2 },
  porDependencia: [
    { dependencia: 'Ecología', verde: 8, amarillo: 3, rojo: 2, morado: 0 },
    { dependencia: 'Inspección y Reglamentos', verde: 7, amarillo: 4, rojo: 1, morado: 1 },
    { dependencia: 'Protección Civil y Bomberos', verde: 6, amarillo: 2, rojo: 2, morado: 1 },
  ],
}

// Clases completas y estáticas para que Tailwind las detecte
const SEMAFORO = [
  { key: 'verde', label: 'Verde', rango: 'Días 1–20', bar: 'bg-green-500', dot: 'bg-green-500', text: 'text-green-700' },
  { key: 'amarillo', label: 'Amarillo', rango: 'Días 21–29', bar: 'bg-yellow-400', dot: 'bg-yellow-400', text: 'text-yellow-700' },
  { key: 'rojo', label: 'Rojo', rango: 'Días 30–37', bar: 'bg-red-500', dot: 'bg-red-500', text: 'text-red-700' },
  { key: 'morado', label: 'Morado', rango: 'Día 38+', bar: 'bg-purple-600', dot: 'bg-purple-600', text: 'text-purple-700' },
]

function KpiCard({ label, hint, value, loading, error }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-slate-800">{error ? '—' : value ?? '—'}</p>
      )}
      <p className="mt-2 text-xs text-slate-400">{error ? 'No disponible' : hint}</p>
    </div>
  )
}

function SemaforoResumen({ semaforo, loading, error }) {
  const total = SEMAFORO.reduce((acc, s) => acc + (semaforo?.[s.key] ?? 0), 0)

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Semáforo de seguimiento</h3>
          <p className="text-xs text-slate-400">Días hábiles transcurridos desde el envío</p>
        </div>
        {!loading && !error && (
          <span className="text-sm text-slate-500">{total} seguimientos abiertos</span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 h-4 animate-pulse rounded-full bg-slate-200" />
      ) : error ? (
        <p className="mt-6 text-sm text-slate-400">No disponible</p>
      ) : (
        <>
          {/* Barra apilada */}
          <div
            className="mt-6 flex h-4 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label="Distribución del semáforo de seguimiento"
          >
            {SEMAFORO.map((s) => {
              const n = semaforo?.[s.key] ?? 0
              return n > 0 ? (
                <div key={s.key} className={s.bar} style={{ width: `${(n / total) * 100}%` }} />
              ) : null
            })}
          </div>

          {/* Leyenda con conteos */}
          <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {SEMAFORO.map((s) => (
              <div key={s.key} className="flex items-start gap-2">
                <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${s.dot}`} />
                <div>
                  <dt className="text-xs text-slate-500">
                    {s.label} · {s.rango}
                  </dt>
                  <dd className={`text-2xl font-bold ${s.text}`}>{semaforo?.[s.key] ?? 0}</dd>
                </div>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  )
}

function DependenciasTabla({ filas = [] }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-base font-semibold text-slate-800">Por dependencia</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="py-2 pr-4 font-medium">Dependencia</th>
              {SEMAFORO.map((s) => (
                <th key={s.key} className="px-3 py-2 text-center font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((f) => (
              <tr key={f.dependencia}>
                <td className="py-3 pr-4 font-medium text-slate-700">{f.dependencia}</td>
                {SEMAFORO.map((s) => (
                  <td key={s.key} className="px-3 py-3 text-center text-slate-600">
                    {f[s.key] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = USE_MOCK ? MOCK_DATA : (await httpClient.get(ENDPOINT)).data
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Resumen general</h2>
          <p className="text-sm text-slate-500">Estado de solicitudes, oficios y seguimiento.</p>
        </div>
        {USE_MOCK ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Datos de ejemplo
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Oficios y semáforo: módulos en desarrollo
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <KpiCard
          label="Solicitudes Pendientes"
          hint="Por confirmar o sin oficio generado"
          value={data?.solicitudesPendientes}
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Oficios Enviados"
          hint="Aceptados por Gmail (no implica lectura ni entrega final)"
          value={data?.oficiosEnviados}
          loading={loading}
          error={error}
        />
      </div>

      <SemaforoResumen semaforo={data?.semaforo} loading={loading} error={error} />
      {!loading && !error && <DependenciasTabla filas={data?.porDependencia} />}
    </section>
  )
}