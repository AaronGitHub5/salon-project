import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

const AUTH_VERSION = '7';
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];

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
  const lastEventRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  const signOut = useCallback(() => {
    nukeStorage();
    sessionStorage.removeItem('admin_session_active');
    supabase.auth.signOut().catch(() => {});
    window.location.href = '/';
  }, []);

  // Inactivity timer — only active when a user is logged in
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        signOut();
      }, INACTIVITY_TIMEOUT);
    };

    // Start timer immediately on login
    resetTimer();

    // Reset on any user activity
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimeout(inactivityTimerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, signOut]);

  useEffect(() => {
    let fallbackTimer;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        lastEventRef.current = event;

        if (event === 'PASSWORD_RECOVERY') {
          clearTimeout(fallbackTimer);
          recoveryRef.current = true;
          setIsRecoveryMode(true);
          setSession(session);
          setUser(session.user);
          setLoading(false);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return;
        }

        if (event === 'SIGNED_OUT' || !session) {
          clearTimeout(fallbackTimer);
          recoveryRef.current = false;
          currentUserIdRef.current = null;
          setUser(null);
          setRole(null);
          setSession(null);
          setIsRecoveryMode(false);
          setLoading(false);
          return;
        }

        if (recoveryRef.current) {
          clearTimeout(fallbackTimer);
          setLoading(false);
          return;
        }

        clearTimeout(fallbackTimer);

        if (session.user.id === currentUserIdRef.current) {
          setSession(session);
          return;
        }

        currentUserIdRef.current = session.user.id;
        setUser(session.user);
        setSession(session);
        setRole(null);
        setLoading(true);
      }
    );

    fallbackTimer = setTimeout(() => setLoading(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchRole(user.id).then((userRole) => {
      if (cancelled) return;

      if (
        userRole === 'admin' &&
        lastEventRef.current !== 'SIGNED_IN' &&
        !sessionStorage.getItem('admin_session_active')
      ) {
        nukeStorage();
        window.location.href = '/login';
        return;
      }

      if (userRole === 'admin') {
        sessionStorage.setItem('admin_session_active', '1');
      } else {
        sessionStorage.removeItem('admin_session_active');
      }

      setRole(userRole);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id]);

  const signIn = async (credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    return { data, error };
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