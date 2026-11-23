export default function ModulePlaceholder({ title, description, features = [] }) {
  return (
    <section className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          En desarrollo
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p>

      {features.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}