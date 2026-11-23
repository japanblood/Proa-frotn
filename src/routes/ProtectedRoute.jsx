import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = () => {
  const token = sessionStorage.getItem('token');

  // Si no hay token en el storage, expulsa al usuario al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Si tiene token, renderiza la vista solicitada (ej. el Dashboard)
  return <Outlet />;
};