import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-bone">
      <Sidebar />
      <main className="ml-[168px] flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
