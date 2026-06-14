import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Match, Prediction } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Próximo',
  live: 'En vivo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  upcoming: 'outline',
  live: 'default',
  finished: 'secondary',
  cancelled: 'destructive',
};

interface Props {
  match: Match;
  prediction?: Prediction | null;
}

export default function MatchCard({ match, prediction }: Props) {
  const scheduled = match.scheduledAt.toDate();
  const dateStr = scheduled.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = scheduled.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  return (
    <Link to={`/matches/${match.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{match.tournament ?? match.sport}{match.stage ? ` · ${match.stage}` : ''}</span>
            <Badge variant={STATUS_VARIANT[match.status]}>{STATUS_LABEL[match.status]}</Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 text-right font-semibold truncate">{match.homeTeamName}</div>
            <div className="shrink-0 text-center">
              {match.result ? (
                <span className="text-lg font-bold tabular-nums">
                  {match.result.homeScore} – {match.result.awayScore}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">{timeStr}</span>
              )}
            </div>
            <div className="flex-1 font-semibold truncate">{match.awayTeamName}</div>
          </div>

          <div className="text-xs text-center text-muted-foreground">{dateStr}</div>

          {prediction && (
            <div className="border-t pt-2 text-xs text-center text-muted-foreground">
              Tu predicción: {prediction.predictedHomeScore} – {prediction.predictedAwayScore}
              {prediction.pointsAwarded !== null && (
                <span className="ml-2 font-semibold text-foreground">+{prediction.pointsAwarded} pts</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
