import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, role: userRole } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // Role not yet loaded — don't redirect, just wait
  if (role && !userRole) return null;

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(userRole)) return <Navigate to="/app" replace />;
  }

  return children;
}
