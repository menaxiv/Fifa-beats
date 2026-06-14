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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { getMatch } from '@/services/matches';
import { processMatchResult } from '@/services/functions';
import type { Match } from '@/types';

const schema = z.object({
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
});
type FormValues = z.infer<typeof schema>;

export default function MatchResultPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    getMatch(matchId).then((m) => { setMatch(m); setLoading(false); });
  }, [matchId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      homeScore: match?.result?.homeScore ?? 0,
      awayScore: match?.result?.awayScore ?? 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!matchId) return;
    setSubmitting(true);
    try {
      const result = await processMatchResult({ matchId, ...values });
      toast.success(`Resultado guardado. ${result.data.processed} predicciones procesadas.`);
      navigate('/admin/matches');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al procesar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-muted-foreground">Partido no encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <Card>
        <CardHeader>
          <CardTitle>Registrar resultado</CardTitle>
          <p className="text-sm text-muted-foreground">
            {match.homeTeamName} vs {match.awayTeamName}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-end gap-4">
                <FormField
                  control={form.control}
                  name="homeScore"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-center block">{match.homeTeamName}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={99} className="text-center text-2xl font-bold h-16" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="text-3xl font-bold mb-4">–</span>
                <FormField
                  control={form.control}
                  name="awayScore"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-center block">{match.awayTeamName}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={99} className="text-center text-2xl font-bold h-16" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {match.status === 'finished' && match.result && (
                <p className="text-sm text-amber-600 text-center">
                  Este partido ya fue procesado ({match.result.homeScore}–{match.result.awayScore}). Volver a enviar sobrescribirá el resultado.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Procesando…' : 'Confirmar resultado y repartir puntos'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
