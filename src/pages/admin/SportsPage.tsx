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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { getSports, createSport, updateSport, deleteSport } from '@/services/sports';
import type { Sport } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(50),
  icon: z.string().max(10).optional(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function SportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', icon: '', active: true },
  });

  const load = async () => {
    try {
      setSports(await getSports());
    } catch {
      toast.error('Error al cargar deportes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingSport(null);
    form.reset({ name: '', icon: '', active: true });
    setDialogOpen(true);
  };

  const openEdit = (sport: Sport) => {
    setEditingSport(sport);
    form.reset({ name: sport.name, icon: sport.icon ?? '', active: sport.active });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      if (editingSport) {
        await updateSport(editingSport.id, values);
        toast.success('Deporte actualizado');
      } else {
        await createSport({ name: values.name, icon: values.icon, active: values.active });
        toast.success('Deporte creado');
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
      await deleteSport(deleteId);
      toast.success('Deporte eliminado');
      load();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Deportes</h1>
        <Button onClick={openCreate}>Crear deporte</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ícono</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay deportes. Crea uno para empezar.
                </TableCell>
              </TableRow>
            ) : sports.map((sport) => (
              <TableRow key={sport.id}>
                <TableCell className="text-xl">{sport.icon ?? '—'}</TableCell>
                <TableCell className="font-medium">{sport.name}</TableCell>
                <TableCell>
                  <Badge variant={sport.active ? 'default' : 'secondary'}>
                    {sport.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(sport)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(sport.id)}>
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
            <DialogTitle>{editingSport ? 'Editar deporte' : 'Crear deporte'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="icon" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícono (emoji)</FormLabel>
                  <FormControl><Input placeholder="⚽" {...field} /></FormControl>
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
            <AlertDialogTitle>¿Eliminar deporte?</AlertDialogTitle>
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
