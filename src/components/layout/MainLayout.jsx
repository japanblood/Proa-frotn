import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth' // <-- 1. Import agregado

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', end: true,
    icon: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { to: '/captura-ocr', label: 'Captura y OCR',
    icon: 'M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10' },
  { to: '/solicitudes', label: 'Solicitudes',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { to: '/oficios', label: 'Oficios y Envíos',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { to: '/seguimiento', label: 'Seguimiento',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/plantillas', label: 'Plantillas y Folios',
    icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2' },
  { to: '/usuarios', label: 'Usuarios y Permisos',
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/auditoria', label: 'Auditoría',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
]

function NavIcon({ path }) {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

export default function MainLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  
  // 2. Extraer permisos del contexto de autenticación
  // (Ajusta "permisos" o "hasPermission" según la nomenclatura exacta que uses en useAuth)
  const { permisos = [] } = useAuth()

  // El título del header sale del mismo arreglo del menú (una sola fuente de verdad)
  const current = NAV_ITEMS.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
  const title = current?.label ?? 'SIVIBUM'

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-slate-900 text-slate-300">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-800 px-6">
          <div>
            <span className="text-xl font-bold tracking-wide text-white">SIVIBUM</span>
            <p className="-mt-0.5 text-[11px] text-slate-500">Visto Bueno Municipal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {NAV_ITEMS
            // 3. Filtro para ocultar /seguimiento si no hay permiso
            //.filter((item) => item.to !== '/seguimiento' || permisos.includes('SEGUIMIENTO:CONSULTAR'))
            .map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <NavIcon path={icon} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
          Ayuntamiento · MVP
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Cerrar sesión
          </button>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}