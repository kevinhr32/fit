import { CalendarDays, ClipboardList, CreditCard, ListChecks, Trophy, TrendingUp } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/cliente/clases', label: 'Clases', icon: CalendarDays },
  { to: '/cliente/reservas', label: 'Reservas', icon: ClipboardList },
  { to: '/cliente/rutinas', label: 'Rutinas', icon: ListChecks },
  { to: '/cliente/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/cliente/comunidad', label: 'Comunidad', icon: Trophy },
  { to: '/cliente/membresia', label: 'Membresía', icon: CreditCard },
];

export default function ClienteTabBar() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-white border-t border-slate/15 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-2 px-0.5 border-t-2 transition-colors min-w-0 ${
                isActive ? 'text-accent border-accent' : 'text-slate border-transparent'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
