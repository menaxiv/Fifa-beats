import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { getSports } from '@/services/sports';
import { getTeams, createTeam, updateTeam, deleteTeam } from '@/services/teams';
import type { Sport, Team } from '@/types';

const schema = z.object({
  sport: z.string().min(1, 'Deporte requerido'),
  name: z.string().min(1, 'Nombre requerido').max(60),
  shortName: z.string().min(2, 'Mínimo 2 caracteres').max(3, 'Máximo 3 caracteres'),
  flagUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sport: '', name: '', shortName: '', flagUrl: '', active: true },
  });

  const load = async () => {
    try {
      const [teamsData, sportsData] = await Promise.all([
        getTeams(sportFilter === 'all' ? undefined : sportFilter),
        getSports(),
      ]);
      setTeams(teamsData);
      setSports(sportsData);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [sportFilter]);

  const openCreate = () => {
    setEditingTeam(null);
    form.reset({ sport: sports[0]?.id ?? '', name: '', shortName: '', flagUrl: '', active: true });
    setDialogOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    form.reset({
      sport: team.sport,
      name: team.name,
      shortName: team.shortName,
      flagUrl: team.flagUrl ?? '',
      active: team.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const data = { ...values, shortName: values.shortName.toUpperCase(), flagUrl: values.flagUrl || undefined };
      if (editingTeam) {
        await updateTeam(editingTeam.id, data);
        toast.success('Equipo actualizado');
      } else {
        await createTeam(data);
        toast.success('Equipo creado');
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
      await deleteTeam(deleteId);
      toast.success('Equipo eliminado');
      load();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleteId(null);
    }
  };

  const sportName = (id: string) => sports.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Equipos</h1>
        <div className="flex items-center gap-2">
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sports.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>Crear equipo</Button>
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
              <TableHead>Nombre</TableHead>
              <TableHead>Abrev.</TableHead>
              <TableHead>Deporte</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay equipos.
                </TableCell>
              </TableRow>
            ) : teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell className="font-mono text-sm">{team.shortName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{sportName(team.sport)}</TableCell>
                <TableCell>
                  <Badge variant={team.active ? 'default' : 'secondary'}>
                    {team.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(team)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(team.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Editar equipo' : 'Crear equipo'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="sport" render={({ field }) => (
                <FormItem>
                  <FormLabel>Deporte</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sports.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl><Input placeholder="México" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shortName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abrev. (3)</FormLabel>
                    <FormControl><Input placeholder="MEX" className="uppercase" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="flagUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de bandera (opcional)</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Activo</FormLabel>
                </FormItem>
              )} />
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
            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
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
