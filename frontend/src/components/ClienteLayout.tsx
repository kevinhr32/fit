import { Outlet } from 'react-router-dom';
import ClienteSidebar from './ClienteSidebar';

export default function ClienteLayout() {
  return (
    <div className="flex min-h-screen bg-bone">
      <ClienteSidebar />
      <main className="ml-[168px] flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
