import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { Header } from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <SideNav />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}