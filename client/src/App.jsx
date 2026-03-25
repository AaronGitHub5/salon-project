import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import CustomerView from './CustomerView';
import AdminDashboard from './AdminDashboard';
import Profile from './Profile';
import StylistSchedule from './StylistSchedule';
// import LandingPage from './LandingPage'; // tomorrow

function RootRedirect() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const reviewParam = searchParams.get('review');

  if (!user) {
    // Preserve ?review= param so Login can forward it after auth
    const loginPath = reviewParam ? `/login?review=${reviewParam}` : '/login';
    return <Navigate to={loginPath} replace />;
  }

  // Carry ?review= through to /app if present
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
      <Route path="/login" element={<Login />} />

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