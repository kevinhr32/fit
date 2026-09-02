import { LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import ClienteSidebar from './ClienteSidebar';
import ClienteTabBar from './ClienteTabBar';
import Logo from './Logo';
import { logout } from '../api/client';

export default function ClienteLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-bone">
      <ClienteSidebar />

      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-navy px-4 py-3">
        <Logo size="sm" />
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="p-2 rounded-lg text-slate hover:text-danger hover:bg-white/5 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="p-4 pb-24 md:ml-[168px] md:p-10 md:pb-10">
        <Outlet />
      </main>

      <ClienteTabBar />
    </div>
  );
}
