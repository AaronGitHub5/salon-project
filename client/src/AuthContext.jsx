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

  useEffect(() => {
    let ignore = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignore) return;

        // PASSWORD_RECOVERY: set recovery mode flag, keep session for updateUser()
        // but do NOT set role — prevents redirect to dashboard.
        if (event === 'PASSWORD_RECOVERY') {
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
          recoveryRef.current = false;
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
          setLoading(false);
          return;
        }

        const userRole = await fetchRole(session.user.id);
        if (ignore) return;
        setUser(session.user);
        setRole(userRole);
        setSession(session);
        setLoading(false);
      }
    );

    // Fallback: clear loading if onAuthStateChange never fires
    const fallback = setTimeout(() => setLoading(false), 500);

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
    supabase.auth.signOut().catch(() => {});
    window.location.href = '/login';
  };

  if (loading) return null;

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