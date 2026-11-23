const humanize = (key) =>
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
  if (typeof value === 'object') {
    return (
      <pre className="whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <span className="text-slate-800">{String(value)}</span>
}

// Renderiza cualquier estructura de datos extraídos con Object.entries
export default function DatosExtraidos({ datos }) {
  const data = normalize(datos)

  if (data === null || data === undefined || data === '') {
    return <p className="text-sm text-slate-400">Sin datos extraídos.</p>
  }
  if (typeof data !== 'object') {
    return <p className="whitespace-pre-wrap text-sm text-slate-700">{String(data)}</p>
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos extraídos.</p>
  }

  return (
    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
          <dt className="font-medium text-slate-500">{humanize(key)}</dt>
          <dd className="col-span-2 break-words">
            <Valor value={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}