import { LayoutDashboard, Users, Dumbbell, Trophy, Wallet, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { logout } from '../api/client';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/entrenadores', label: 'Entrenadores', icon: Dumbbell },
  { to: '/retos', label: 'Retos', icon: Trophy },
  { to: '/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-navy w-[168px] flex flex-col py-8 px-3 z-50"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="mb-10 flex justify-center">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-colors ${
                  isActive
                    ? 'text-accent-light bg-white/10'
                    : 'text-slate hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={24} />
              <span className="text-xs font-medium text-center leading-tight">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-slate hover:text-danger hover:bg-white/5 transition-colors mt-4"
      >
        <LogOut size={24} />
        <span className="text-xs font-medium text-center leading-tight">
          Cerrar sesión
        </span>
      </button>
    </aside>
  );
}
