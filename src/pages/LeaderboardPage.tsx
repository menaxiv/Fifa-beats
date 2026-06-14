import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import type { Leaderboard, LeaderboardEntry } from '@/types';

function MedalOrRank({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="w-7 text-center text-sm text-muted-foreground tabular-nums">{rank}</span>;
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'leaderboards', 'global'), (snap) => {
      if (snap.exists()) setLeaderboard(snap.data() as Leaderboard);
      setIsLoading(false);
    }, () => setIsLoading(false));
    return unsub;
  }, []);

  const entries: LeaderboardEntry[] = leaderboard?.entries ?? [];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Tabla de posiciones</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Aún no hay datos</p>
      ) : (
        <div className="divide-y rounded-xl border overflow-hidden">
          {entries.map((entry) => {
            const isMe = entry.uid === user?.uid;
            return (
              <div
                key={entry.uid}
                className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-muted/60 font-semibold' : 'bg-background'}`}
              >
                <MedalOrRank rank={entry.rank} />
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={entry.avatarUrl} alt={entry.displayName} />
                  <AvatarFallback className="text-xs">
                    {entry.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm">{entry.displayName}</span>
                <span className="tabular-nums text-sm">
                  {entry.points} <span className="text-muted-foreground text-xs">pts</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
