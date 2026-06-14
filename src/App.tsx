import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuthListener } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import AppShell from '@/components/AppShell';
import AuthLayout from '@/components/AuthLayout';
import AdminLayout from '@/components/AdminLayout';
import AdminRoute from '@/components/AdminRoute';
import PrivateRoute from '@/components/PrivateRoute';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import LandingPage from '@/pages/LandingPage';
import HomePage from '@/pages/HomePage';
import MatchesPage from '@/pages/MatchesPage';
import MatchDetailPage from '@/pages/MatchDetailPage';
import MyPredictionsPage from '@/pages/MyPredictionsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminSportsPage from '@/pages/admin/SportsPage';
import AdminTeamsPage from '@/pages/admin/TeamsPage';
import AdminMatchesPage from '@/pages/admin/MatchesPage';
import MatchResultPage from '@/pages/admin/MatchResultPage';

function SmartHome() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/matches" replace />;
  return <LandingPage />;
}

function AppRoutes() {
  useAuthListener();
  return (
    <Routes>
      {/* Landing — accessible a todos */}
      <Route path="/" element={<SmartHome />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:matchId" element={<MatchDetailPage />} />
          <Route path="/my-predictions" element={<MyPredictionsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/matches" replace />} />
          <Route path="/admin/sports" element={<AdminSportsPage />} />
          <Route path="/admin/teams" element={<AdminTeamsPage />} />
          <Route path="/admin/matches" element={<AdminMatchesPage />} />
          <Route path="/admin/matches/:matchId/result" element={<MatchResultPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  );
}
