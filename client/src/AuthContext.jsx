import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

const AUTH_VERSION = '7';

function nukeStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-')) localStorage.removeItem(key);
  });
}

const storedVersion = localStorage.getItem('auth_version');
if (storedVersion !== AUTH_VERSION) {
  nukeStorage();
  localStorage.setItem('auth_version', AUTH_VERSION);
}

async function fetchRole(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error || !data) return 'customer';
    return data.role || 'customer';
  } catch {
    return 'customer';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const recoveryRef = useRef(false);
  const fetchingRoleRef = useRef(false);

  useEffect(() => {
    let ignore = false;
    let fallback;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignore) return;

        // PASSWORD_RECOVERY: set recovery mode flag, keep session for updateUser()
        // but do NOT set role — prevents redirect to dashboard.
        if (event === 'PASSWORD_RECOVERY') {
          clearTimeout(fallback);
          recoveryRef.current = true;
          setIsRecoveryMode(true);
          setSession(session);
          setUser(session.user);
          setLoading(false);
          // Clear the recovery hash now that Supabase has processed it.
          // Leaving it causes Supabase to re-process the token on subsequent
          // auth calls, triggering "signal is aborted without reason".
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return;
        }

        if (event === 'SIGNED_OUT' || !session) {
          clearTimeout(fallback);
          recoveryRef.current = false;
          fetchingRoleRef.current = false;
          setUser(null);
          setRole(null);
          setSession(null);
          setIsRecoveryMode(false);
          setLoading(false);
          return;
        }

        // SIGNED_IN fires after PASSWORD_RECOVERY — suppress it so the
        // recovery form stays visible and does not redirect to dashboard.
        // Use ref instead of state to avoid stale closure.
        if (recoveryRef.current) {
          clearTimeout(fallback);
          setLoading(false);
          return;
        }

        setLoading(true);
        setRole(null);
        setUser(session.user);
        setSession(session);

        fetchingRoleRef.current = true;
        const userRole = await fetchRole(session.user.id);
        fetchingRoleRef.current = false;
        clearTimeout(fallback);
        if (ignore) return;

        // Admin sessions expire when the browser closes.
        // sessionStorage is cleared on browser close, so if the flag is missing
        // but a session exists, the browser was reopened — force re-login.
        if (userRole === 'admin') {
          if (event !== 'SIGNED_IN' && !sessionStorage.getItem('admin_session_active')) {
            // Browser was reopened (INITIAL_SESSION/TOKEN_REFRESHED) with no
            // sessionStorage flag — force re-login.
            ignore = true;
            nukeStorage();
            window.location.href = '/login';
            return;
          }
          sessionStorage.setItem('admin_session_active', '1');
        } else {
          // Clean up flag if a non-admin signs in
          sessionStorage.removeItem('admin_session_active');
        }

        setRole(userRole);
        setLoading(false);
      }
    );

    // Fallback: clear loading if auth never resolves.
    // Only fires if we're NOT actively fetching a role (prevents wrong role assignment).
    fallback = setTimeout(() => {
      if (!ignore && !fetchingRoleRef.current) setLoading(false);
    }, 3000);

    return () => {
      ignore = true;
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  const signIn = async (credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    return { data, error };
  };

  const signOut = () => {
    nukeStorage();
    sessionStorage.removeItem('admin_session_active');
    supabase.auth.signOut().catch(() => {});
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #ccc', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        session,
        isRecoveryMode,
        clearRecoveryMode: () => { recoveryRef.current = false; setIsRecoveryMode(false); },
        signIn,
        signUp: (d) => supabase.auth.signUp(d),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}