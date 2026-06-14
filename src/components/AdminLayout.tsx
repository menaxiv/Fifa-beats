import { NavLink, Outlet, Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const NAV = [
  { to: '/admin/sports', label: 'Deportes' },
  { to: '/admin/teams', label: 'Equipos' },
  { to: '/admin/matches', label: 'Partidos' },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 inset-x-0 h-14 border-b bg-background flex items-center gap-4 px-4 z-10">
        <span className="font-bold text-sm">Beats Admin</span>
        <Separator orientation="vertical" className="h-5" />
        <nav className="flex gap-4">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="ml-auto text-sm text-muted-foreground hover:text-foreground">
          ← App
        </Link>
      </header>
      <main className="pt-14 p-6 max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
