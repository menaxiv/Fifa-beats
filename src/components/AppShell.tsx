import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Star, Trophy, User, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/home', label: 'Inicio', Icon: Home },
  { to: '/matches', label: 'Partidos', Icon: CalendarDays },
  { to: '/my-predictions', label: 'Mis picks', Icon: Star },
  { to: '/leaderboard', label: 'Ranking', Icon: Trophy },
  { to: '/profile', label: 'Perfil', Icon: User },
];

export default function AppShell() {
  const profile = useUserProfile();
  const { isAdmin } = useAuthStore();
  const { logOut } = useAuth();
  const location = useLocation();

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="fixed top-0 inset-x-0 h-14 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 z-10">
        <Link to="/" className="font-bold tracking-tight text-lg">Beats</Link>

        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-sm font-medium tabular-nums">
              {profile.points} <span className="text-muted-foreground text-xs">pts</span>
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatarUrl} alt={profile?.displayName} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {profile && (
                <>
                  <div className="px-2 py-1.5 text-sm font-semibold truncate">{profile.displayName}</div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link to="/profile">Perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/my-predictions">Mis predicciones</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/matches" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive">
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 pt-14 pb-16">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 h-16 border-t bg-background/80 backdrop-blur-sm flex items-center justify-around z-10">
        {NAV.map(({ to, label, Icon }) => {
          const active = location.pathname === to || (to !== '/home' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 text-xs px-3 py-1 rounded-md transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
