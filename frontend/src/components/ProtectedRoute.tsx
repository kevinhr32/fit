import { Navigate, Outlet } from 'react-router-dom';
import { getTokens } from '../api/client';

export default function ProtectedRoute() {
  const tokens = getTokens();
  return tokens?.access ? <Outlet /> : <Navigate to="/login" replace />;
}
