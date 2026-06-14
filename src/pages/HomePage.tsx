import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import MatchCard from '@/components/MatchCard';
import { useMatches } from '@/hooks/useMatches';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function HomePage() {
  const profile = useUserProfile();
  const { matches: upcoming, isLoading: upcomingLoading } = useMatches('upcoming');
  const { matches: live, isLoading: liveLoading } = useMatches('live');

  const todayUpcoming = upcoming.filter((m) => {
    const d = m.scheduledAt.toDate();
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {profile && (
        <div>
          <h1 className="text-2xl font-bold">Hola, {profile.displayName.split(' ')[0]}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Tienes {profile.points} puntos</p>
        </div>
      )}

      {/* Live matches */}
      {(liveLoading || live.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              En vivo
            </h2>
          </div>
          {liveLoading ? (
            <Skeleton className="h-28 rounded-xl" />
          ) : (
            <div className="space-y-3">
              {live.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </section>
      )}

      {/* Today's upcoming */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Hoy</h2>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/matches">Ver todos <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
        {upcomingLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : todayUpcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay partidos hoy.{' '}
            <Link to="/matches" className="underline">Ver próximos</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {todayUpcoming.slice(0, 3).map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
