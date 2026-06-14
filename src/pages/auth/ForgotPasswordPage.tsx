import { useState } from 'react';
import { Link } from 'react-router-dom';
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
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await resetPassword(values.email);
      setEmailSent(true);
    } catch {
      toast.error('Error al enviar el email. Verifica la dirección e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Email enviado</CardTitle>
          <CardDescription>
            Revisa tu bandeja de entrada y sigue las instrucciones para recuperar tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full h-11" asChild>
            <Link to="/login">Volver al inicio de sesión</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
        <CardDescription>Te enviaremos un email con instrucciones</CardDescription>
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
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              Enviar email
            </Button>
          </form>
        </Form>
        <p className="text-center text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Volver al inicio de sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
