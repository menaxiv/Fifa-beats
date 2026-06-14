import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { getSports } from '@/services/sports';
import { getTeams } from '@/services/teams';
import { getMatches, createMatch, updateMatch, deleteMatch } from '@/services/matches';
import { formatDateTime, toDatetimeLocal } from '@/lib/format';
import type { Match, MatchStatus, Sport, Team } from '@/types';

const STATUS_LABELS: Record<MatchStatus, string> = {
  upcoming: 'Próximo',
  live: 'En vivo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_VARIANTS: Record<MatchStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  upcoming: 'secondary',
  live: 'default',
  finished: 'outline',
  cancelled: 'destructive',
};

const schema = z.object({
  sport: z.string().min(1, 'Deporte requerido'),
  homeTeamId: z.string().min(1, 'Equipo local requerido'),
  awayTeamId: z.string().min(1, 'Equipo visitante requerido'),
  scheduledAt: z.string().min(1, 'Fecha del partido requerida'),
  predictionDeadline: z.string().min(1, 'Deadline requerido'),
  tournament: z.string().optional(),
  stage: z.string().optional(),
}).refine((d) => d.homeTeamId !== d.awayTeamId, {
  message: 'Los equipos deben ser diferentes',
  path: ['awayTeamId'],
}).refine((d) => new Date(d.predictionDeadline) < new Date(d.scheduledAt), {
  message: 'El deadline debe ser antes del partido',
  path: ['predictionDeadline'],
});

type FormValues = z.infer<typeof schema>;

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sport: '', homeTeamId: '', awayTeamId: '',
      scheduledAt: '', predictionDeadline: '', tournament: '', stage: '',
    },
  });

  const selectedSport = form.watch('sport');
  const filteredTeams = teams.filter((t) => t.sport === selectedSport && t.active);

  const load = async () => {
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter as MatchStatus;
      const [matchesData, sportsData, teamsData] = await Promise.all([
        getMatches(status),
        getSports(),
        getTeams(),
      ]);
      setMatches(matchesData);
      setSports(sportsData);
      setTeams(teamsData);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openCreate = () => {
    setEditingMatch(null);
    form.reset({ sport: sports[0]?.id ?? '', homeTeamId: '', awayTeamId: '', scheduledAt: '', predictionDeadline: '', tournament: '', stage: '' });
    setDialogOpen(true);
  };

  const openEdit = (match: Match) => {
    setEditingMatch(match);
    form.reset({
      sport: match.sport,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      scheduledAt: toDatetimeLocal(match.scheduledAt),
      predictionDeadline: toDatetimeLocal(match.predictionDeadline),
      tournament: match.tournament ?? '',
      stage: match.stage ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const homeTeam = teams.find((t) => t.id === values.homeTeamId)!;
      const awayTeam = teams.find((t) => t.id === values.awayTeamId)!;
      if (editingMatch) {
        await updateMatch(editingMatch.id, {
          sport: values.sport,
          homeTeamId: values.homeTeamId,
          awayTeamId: values.awayTeamId,
          homeTeamName: homeTeam.name,
          awayTeamName: awayTeam.name,
          scheduledAt: new Date(values.scheduledAt) as unknown as import('firebase/firestore').Timestamp,
          predictionDeadline: new Date(values.predictionDeadline) as unknown as import('firebase/firestore').Timestamp,
          tournament: values.tournament || undefined,
          stage: values.stage || undefined,
        });
        toast.success('Partido actualizado');
      } else {
        await createMatch({
          sport: values.sport,
          homeTeamId: values.homeTeamId,
          awayTeamId: values.awayTeamId,
          homeTeamName: homeTeam.name,
          awayTeamName: awayTeam.name,
          scheduledAt: new Date(values.scheduledAt),
          predictionDeadline: new Date(values.predictionDeadline),
          tournament: values.tournament || undefined,
          stage: values.stage || undefined,
        });
        toast.success('Partido creado');
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMatch(deleteId);
      toast.success('Partido eliminado');
      load();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Partidos</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(STATUS_LABELS) as MatchStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>Crear partido</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partido</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Torneo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay partidos.
                </TableCell>
              </TableRow>
            ) : matches.map((match) => (
              <TableRow key={match.id}>
                <TableCell className="font-medium">
                  {match.homeTeamName} vs {match.awayTeamName}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(match.scheduledAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[match.status]}>
                    {STATUS_LABELS[match.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(match.predictionDeadline)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {match.tournament ?? '—'}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {(match.status === 'live' || match.status === 'finished') && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/matches/${match.id}/result`}>
                        <ClipboardCheck className="size-4 text-green-600" />
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(match)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(match.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMatch ? 'Editar partido' : 'Crear partido'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="sport" render={({ field }) => (
                <FormItem>
                  <FormLabel>Deporte</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue('homeTeamId', ''); form.setValue('awayTeamId', ''); }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sports.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="homeTeamId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo local</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSport}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {filteredTeams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="awayTeamId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo visitante</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSport}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {filteredTeams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha del partido</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="predictionDeadline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline predicciones</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tournament" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Torneo (opcional)</FormLabel>
                    <FormControl><Input placeholder="Copa América" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fase (opcional)</FormLabel>
                    <FormControl><Input placeholder="Grupo A" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partido?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
