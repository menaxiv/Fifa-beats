import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Search, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import MatchCard from '@/components/MatchCard';
import { useMatches } from '@/hooks/useMatches';
import { useSports } from '@/hooks/useSports';
import type { Match, MatchStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_TABS: { value: MatchStatus; label: string }[] = [
  { value: 'upcoming', label: 'Próximos' },
  { value: 'live', label: 'En vivo' },
  { value: 'finished', label: 'Finalizados' },
];

const FUSE_OPTS = {
  keys: ['homeTeamName', 'awayTeamName', 'tournament', 'stage', 'venue'],
  threshold: 0.35,
  distance: 100,
};

export default function MatchesPage() {
  const [tab, setTab] = useState<MatchStatus>('upcoming');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const { matches, isLoading } = useMatches(tab);
  const sports = useSports();

  const sportFiltered = useMemo(
    () => (sportFilter === 'all' ? matches : matches.filter((m) => m.sport === sportFilter)),
    [matches, sportFilter],
  );

  const fuse = useMemo(() => new Fuse<Match>(sportFiltered, FUSE_OPTS), [sportFiltered]);

  const displayed = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).map((r) => r.item) : sportFiltered),
    [fuse, query, sportFiltered],
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Partidos</h1>

      {/* Sport filter chips */}
      {sports.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
          <button
            onClick={() => setSportFilter('all')}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              sportFilter === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:text-foreground',
            )}
          >
            Todos
          </button>
          {sports.map((s) => (
            <button
              key={s.id}
              onClick={() => setSportFilter(s.id)}
              className={cn(
                'shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                sportFilter === s.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground',
              )}
            >
              <span>{s.icon}</span>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar equipo, torneo..."
          className="pl-9 pr-9"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as MatchStatus)}>
        <TabsList className="w-full mb-4">
          {STATUS_TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="flex-1">{label}</TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map(({ value }) => (
          <TabsContent key={value} value={value} className="space-y-3 mt-0">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))
            ) : displayed.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {query || sportFilter !== 'all' ? 'Sin resultados para tu búsqueda' : 'No hay partidos'}
              </p>
            ) : (
              displayed.map((match) => <MatchCard key={match.id} match={match} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
