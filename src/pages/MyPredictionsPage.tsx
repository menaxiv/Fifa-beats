import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyPredictionsWithMatches } from '@/services/predictions';
import { useAuthStore } from '@/store/authStore';
import type { Match, Prediction } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  correct_exact: 'Exacto',
  correct_winner: 'Ganador',
  incorrect: 'Incorrecto',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  correct_exact: 'default',
  correct_winner: 'secondary',
  incorrect: 'destructive',
  cancelled: 'secondary',
};

interface Row {
  prediction: Prediction;
  match: Match | null;
}

export default function MyPredictionsPage() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyPredictionsWithMatches(user.uid)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Mis predicciones</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Aún no tienes predicciones.{' '}
          <Link to="/matches" className="underline">Ver partidos</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ prediction, match }) => (
            <Link key={prediction.id} to={match ? `/matches/${match.id}` : '#'}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold">
                      {match ? `${match.homeTeamName} vs ${match.awayTeamName}` : prediction.matchId}
                    </div>
                    <Badge variant={STATUS_VARIANT[prediction.status]} className="shrink-0">
                      {STATUS_LABEL[prediction.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Predicción: {prediction.predictedHomeScore} – {prediction.predictedAwayScore}
                    {match?.result && (
                      <span className="ml-2">
                        · Real: {match.result.homeScore} – {match.result.awayScore}
                      </span>
                    )}
                    {prediction.pointsAwarded !== null && (
                      <span className="ml-2 font-semibold text-foreground">
                        +{prediction.pointsAwarded} pts
                      </span>
                    )}
                  </div>
                  {match && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {match.scheduledAt.toDate().toLocaleDateString('es', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
