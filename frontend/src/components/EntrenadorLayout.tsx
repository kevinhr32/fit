import { Outlet } from 'react-router-dom';
import EntrenadorSidebar from './EntrenadorSidebar';

export default function EntrenadorLayout() {
  return (
    <div className="flex min-h-screen bg-bone">
      <EntrenadorSidebar />
      <main className="ml-[168px] flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
