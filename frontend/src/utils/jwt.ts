import type { User } from '../types';

export function decodeBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
  );
}

export function getRoleFromToken(): User['role'] | null {
  const access = localStorage.getItem('gymnisfit_access');
  if (!access) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(access.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
}

export function getDashboardPathForRole(role: User['role']): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'ENTRENADOR':
      return '/entrenador/dashboard';
    case 'CLIENTE':
      return '/cliente/clases';
    default:
      return '/login';
  }
}
