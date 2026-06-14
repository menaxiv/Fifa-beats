import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '@/services/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePointHistory } from '@/hooks/usePointHistory';

const schema = z.object({
  displayName: z.string().min(2).max(30),
  avatarUrl: z.string().url().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

const REASON_LABEL: Record<string, string> = {
  initial_grant: 'Bono inicial',
  correct_exact: 'Marcador exacto',
  correct_winner: 'Ganador correcto',
  incorrect: 'Predicción incorrecta',
  cancelled: 'Partido cancelado',
  admin_adjustment: 'Ajuste admin',
};

export default function ProfilePage() {
  const profile = useUserProfile();
  const { transactions, isLoading: txLoading } = usePointHistory(10);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', avatarUrl: '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName ?? '',
        avatarUrl: profile.avatarUrl ?? '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: FormValues) => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await Promise.all([
        updateProfile(auth.currentUser, {
          displayName: values.displayName,
          photoURL: values.avatarUrl || null,
        }),
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          displayName: values.displayName,
          avatarUrl: values.avatarUrl || null,
          updatedAt: serverTimestamp(),
        }),
      ]);
      toast.success('Perfil actualizado');
    } catch {
      toast.error('No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const accuracy = profile.totalPredictions > 0
    ? Math.round((profile.correctPredictions / profile.totalPredictions) * 100)
    : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
          <AvatarFallback className="text-lg">
            {profile.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-bold">{profile.displayName}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Puntos', value: profile.points },
          { label: 'Picks', value: profile.totalPredictions },
          { label: 'Exactos', value: profile.exactPredictions },
          { label: 'Precisión', value: `${accuracy}%` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl><Input placeholder="Tu nombre" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de avatar</FormLabel>
                    <FormControl><Input placeholder="https://…" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Point history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos</p>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{REASON_LABEL[tx.reason] ?? tx.reason}</span>
                  <span className={tx.delta >= 0 ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
                    {tx.delta > 0 ? '+' : ''}{tx.delta} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
