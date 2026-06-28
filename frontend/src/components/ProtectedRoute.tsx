import { Navigate, Outlet } from 'react-router-dom';
import { getTokens } from '../api/client';
import { getRoleFromToken, getDashboardPathForRole } from '../utils/jwt';
import type { User } from '../types';

interface ProtectedRouteProps {
  roles?: User['role'][];
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const tokens = getTokens();

  if (!tokens?.access) {
    return <Navigate to="/login" replace />;
  }

  if (!roles) {
    return <Outlet />;
  }

  const role = getRoleFromToken();
  if (!role || !roles.includes(role)) {
    const redirectPath = role ? getDashboardPathForRole(role) : '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
