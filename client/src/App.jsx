import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import CustomerView from './CustomerView';
import AdminDashboard from './AdminDashboard';
import Profile from './Profile';
import StylistSchedule from './StylistSchedule';
import ResetPassword from './ResetPassword';
import LandingPage from './LandingPage';

// Renders landing page for guests, redirects logged-in users to their dashboard
function RootRedirect() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const reviewParam = searchParams.get('review');

  if (!user) return <LandingPage />;

  const appPath = reviewParam ? `/app?review=${reviewParam}` : '/app';
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'stylist') return <Navigate to="/stylist" replace />;
  return <Navigate to={appPath} replace />;
}

// Renders login for guests, redirects logged-in users to their dashboard
function LoginRedirect() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const reviewParam = searchParams.get('review');

  if (!user) return <Login />;

  const appPath = reviewParam ? `/app?review=${reviewParam}` : '/app';
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'stylist') return <Navigate to="/stylist" replace />;
  return <Navigate to={appPath} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Customer */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <CustomerView />
          </ProtectedRoute>
        }
      />

      {/* Profile — accessible to all authenticated users */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Stylist */}
      <Route
        path="/stylist"
        element={
          <ProtectedRoute role="stylist">
            <StylistSchedule />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}