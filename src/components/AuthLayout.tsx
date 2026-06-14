import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <p className="text-2xl font-bold mb-8 tracking-tight">Beats</p>
      <Outlet />
    </div>
  );
}
