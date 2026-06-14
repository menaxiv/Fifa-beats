import { Toaster as SonnerToaster } from 'sonner';

function Toaster() {
  return (
    <SonnerToaster
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'font-sans',
        },
      }}
    />
  );
}

export { Toaster };
