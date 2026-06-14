import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { getMatch } from '@/services/matches';
import { savePrediction } from '@/services/predictions';
import { usePrediction } from '@/hooks/usePrediction';
import { useAuthStore } from '@/store/authStore';
import type { Match } from '@/types';

const schema = z.object({
  home: z.coerce.number().int().min(0).max(99),
  away: z.coerce.number().int().min(0).max(99),
});
type FormValues = z.infer<typeof schema>;

const POINTS_EXACT = 10;
const POINTS_WINNER = 5;

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { prediction, isLoading: predLoading, setPrediction } = usePrediction(matchId!);

  const [match, setMatch] = useState<Match | null>(null);
  const [matchLoading, setMatchLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    getMatch(matchId).then((m) => { setMatch(m); setMatchLoading(false); });
  }, [matchId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { home: 0, away: 0 },
  });

  useEffect(() => {
    if (prediction) {
      form.reset({ home: prediction.predictedHomeScore, away: prediction.predictedAwayScore });
    }
  }, [prediction, form]);

  if (matchLoading || predLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-center text-muted-foreground">Partido no encontrado</p>
      </div>
    );
  }

  const deadline = match.predictionDeadline.toDate();
  const deadlinePassed = deadline < new Date();
  const canPredict = match.status === 'upcoming' && !deadlinePassed;

  const homeVal = form.watch('home') ?? 0;
  const awayVal = form.watch('away') ?? 0;

  const onSubmit = async (values: FormValues) => {
    if (!user || !match) return;
    setSubmitting(true);
    try {
      await savePrediction(user.uid, match.id, match.sport, values.home, values.away);
      setPrediction({
        id: `${user.uid}_${match.id}`,
        uid: user.uid,
        matchId: match.id,
        sport: match.sport,
        predictedHomeScore: values.home,
        predictedAwayScore: values.away,
        predictedWinner: values.home > values.away ? 'home' : values.home < values.away ? 'away' : 'draw',
        pointsAwarded: null,
        status: 'pending',
        createdAt: null as any,
        updatedAt: null as any,
      });
      toast.success('Predicción guardada');
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const scheduled = match.scheduledAt.toDate();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{match.tournament ?? match.sport}{match.stage ? ` · ${match.stage}` : ''}</span>
            <Badge variant="outline">{match.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 text-right text-lg font-bold">{match.homeTeamName}</div>
            <div className="text-center">
              {match.result ? (
                <span className="text-2xl font-bold tabular-nums">
                  {match.result.homeScore} – {match.result.awayScore}
                </span>
              ) : (
                <div className="text-sm text-muted-foreground text-center">
                  <div>{scheduled.toLocaleDateString('es', { day: 'numeric', month: 'short' })}</div>
                  <div>{scheduled.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              )}
            </div>
            <div className="flex-1 text-lg font-bold">{match.awayTeamName}</div>
          </div>
        </CardContent>
      </Card>

      {canPredict ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {prediction ? 'Actualizar predicción' : 'Hacer predicción'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name="home"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-center block">{match.homeTeamName}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={99} className="text-center text-xl font-bold h-14" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span className="text-2xl font-bold mb-3">–</span>
                  <FormField
                    control={form.control}
                    name="away"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-center block">{match.awayTeamName}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={99} className="text-center text-xl font-bold h-14" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-md bg-muted p-3 text-xs space-y-1 text-center text-muted-foreground">
                  <div>Ganador predicho: <span className="font-semibold text-foreground">
                    {homeVal > awayVal ? match.homeTeamName : homeVal < awayVal ? match.awayTeamName : 'Empate'}
                  </span></div>
                  <div>Puntos posibles: marcador exacto <span className="font-semibold text-foreground">{POINTS_EXACT}</span> pts · ganador correcto <span className="font-semibold text-foreground">{POINTS_WINNER}</span> pts</div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Guardando…' : prediction ? 'Actualizar' : 'Confirmar predicción'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            {match.status === 'upcoming'
              ? 'El plazo para predecir ha cerrado'
              : match.status === 'live'
              ? 'El partido está en curso'
              : 'El partido ha finalizado'}
            {prediction && (
              <div className="mt-2 font-semibold text-foreground">
                Tu predicción: {prediction.predictedHomeScore} – {prediction.predictedAwayScore}
                {prediction.pointsAwarded !== null && ` · +${prediction.pointsAwarded} pts`}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
