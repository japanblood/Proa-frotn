import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../auth/ProtectedRoute';
import LoginPage from '../features/login/LoginPage';
import MainLayout from '../components/layout/MainLayout';
import DashboardPage from '../features/dashboard/DashboardPage';
import ModulePlaceholder from '../components/ui/ModulePlaceholder';
import CapturaOcrPage from '../features/captura/CapturaOcrPage';
import SolicitudesPage from '../features/solicitudes/SolicitudesPage';
import OficiosPage from '../features/oficios/OficiosPage';
import SeguimientoPage from '../features/seguimiento/SeguimientoPage';
import PlantillasPage from '../features/plantillas/PlantillasPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA PÚBLICA */}
        <Route path="/login" element={<LoginPage />} />

        {/* RUTAS PROTEGIDAS: guard -> layout -> módulos */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />

            <Route path="captura-ocr" element={<CapturaOcrPage />} />
            <Route path="solicitudes" element={<SolicitudesPage />} />
            <Route path="oficios" element={<OficiosPage />} />
            <Route path="seguimiento" element={<SeguimientoPage />} />
            <Route path="plantillas" element={<PlantillasPage />} />

            <Route
              path="usuarios"
              element={
                <ModulePlaceholder
                  title="Usuarios y Permisos"
                  description="Alta de usuarios y configuración de permisos por módulo y acción para cada rol."
                  features={[
                    'Roles: Super administrador, Director y Capturista',
                    'Activación y desactivación de cuentas',
                    'Permisos por módulo y acción',
                    'Registro de cambios de roles y permisos',
                  ]}
                />
              }
            />

            <Route
              path="auditoria"
              element={
                <ModulePlaceholder
                  title="Auditoría"
                  description="Historial de acciones relevantes para trazabilidad."
                  features={[
                    'Historial de acciones por usuario',
                    'Cambios de roles y permisos (valor anterior y nuevo)',
                    'Filtros por fecha, usuario y módulo',
                  ]}
                />
              }
            />
          </Route>
        </Route>

        {/* Cualquier ruta desconocida redirige al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}