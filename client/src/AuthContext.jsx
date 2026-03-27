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
  // Track last auth event so the role effect can distinguish fresh login vs browser reopen
  const lastEventRef = useRef(null);

  // 1) Auth listener — synchronous only, no async work here.
  //    Sets user/session state; role is fetched in a separate effect.
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
          setUser(null);
          setRole(null);
          setSession(null);
          setIsRecoveryMode(false);
          setLoading(false);
          return;
        }

        // SIGNED_IN fires after PASSWORD_RECOVERY — suppress it
        if (recoveryRef.current) {
          clearTimeout(fallbackTimer);
          setLoading(false);
          return;
        }

        clearTimeout(fallbackTimer);

        // TOKEN_REFRESHED just means the token was renewed — same user, same role.
        // Only update the session silently; don't reset role or show spinner.
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          return;
        }

        setUser(session.user);
        setSession(session);
        setRole(null);       // Clear role — will be fetched by the role effect
        setLoading(true);    // Show spinner until role is resolved
      }
    );

    // Safety net: if onAuthStateChange never fires, stop the spinner
    fallbackTimer = setTimeout(() => setLoading(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // 2) Role fetch — runs whenever user.id changes.
  //    Automatically cancels the previous fetch if the user changes mid-flight.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchRole(user.id).then((userRole) => {
      if (cancelled) return;

      // Admin sessions expire when the browser closes.
      // sessionStorage is cleared on close, so if the flag is missing
      // and this isn't a fresh login, force re-login.
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
