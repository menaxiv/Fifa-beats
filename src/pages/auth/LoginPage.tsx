import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormValues = z.infer<typeof schema>;

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Email o contraseña incorrectos',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await signIn(values.email, values.password);
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      toast.error(AUTH_ERRORS[code] ?? 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Ingresa tus datos para continuar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" className="text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" className="text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
        </Form>
        <div className="space-y-2 text-center text-sm">
          <Link to="/forgot-password" className="block text-muted-foreground hover:text-foreground">
            ¿Olvidaste tu contraseña?
          </Link>
          <p className="text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-foreground hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
