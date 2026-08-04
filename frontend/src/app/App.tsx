import { LoaderCircle } from 'lucide-react';
import { Toaster } from 'sonner';
import { Redirect, Route, Switch, useLocation, useSearch } from 'wouter';

import { OfflineBanner } from '../components/OfflineBanner';
import { useAuth } from '../features/auth/use-auth';
import { AppShell } from '../layout/AppShell';
import { AuthLayout } from '../layout/AuthLayout';
import { AdminPage } from '../pages/AdminPage';
import { BookingsPage } from '../pages/BookingsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RoomDetailsPage } from '../pages/RoomDetailsPage';
import { RoomsPage } from '../pages/RoomsPage';
import { SecurityPage } from '../pages/SecurityPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <div className="loading-screen__mark">B<span /></div>
      <LoaderCircle className="button__spinner" size={23} />
      <p>Готовим ваше пространство…</p>
    </main>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [location] = useLocation();
  const search = useSearch();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'guest') {
    const next = `${location}${search ? `?${search}` : ''}`;
    return <Redirect to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated') return <Redirect to="/dashboard" replace />;
  return children;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Redirect to="/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  return <Redirect to={status === 'authenticated' ? '/dashboard' : '/login'} replace />;
}

export function App() {
  return (
    <>
      <OfflineBanner />
      <Switch>
        <Route path="/"><RootRedirect /></Route>
        <Route path="/login"><AuthLayout><PublicOnly><LoginPage /></PublicOnly></AuthLayout></Route>
        <Route path="/register"><AuthLayout><PublicOnly><RegisterPage /></PublicOnly></AuthLayout></Route>
        <Route path="/forgot-password"><AuthLayout><PublicOnly><ForgotPasswordPage /></PublicOnly></AuthLayout></Route>
        <Route path="/reset-password"><AuthLayout><ResetPasswordPage /></AuthLayout></Route>
        <Route path="/verify-email"><AuthLayout><VerifyEmailPage /></AuthLayout></Route>
        <Route path="/dashboard"><ProtectedPage><DashboardPage /></ProtectedPage></Route>
        <Route path="/rooms/:roomId"><ProtectedPage><RoomDetailsPage /></ProtectedPage></Route>
        <Route path="/rooms"><ProtectedPage><RoomsPage /></ProtectedPage></Route>
        <Route path="/bookings"><ProtectedPage><BookingsPage /></ProtectedPage></Route>
        <Route path="/security"><ProtectedPage><SecurityPage /></ProtectedPage></Route>
        <Route path="/admin"><ProtectedPage><AdminOnly><AdminPage /></AdminOnly></ProtectedPage></Route>
        <Route><NotFoundPage /></Route>
      </Switch>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ className: 'bookit-toast', duration: 4200 }}
      />
    </>
  );
}
