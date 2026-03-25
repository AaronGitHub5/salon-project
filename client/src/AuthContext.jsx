import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

const AUTH_VERSION = '6';

function nukeStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-')) localStorage.removeItem(key);
  });
}

export function AuthProvider({ children }) {
  const hasSession = Object.keys(localStorage).some((key) => key.startsWith('sb-'));

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [session, setSession] = useState(null);

  const isSigningIn = useRef(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem('auth_version');
    if (storedVersion !== AUTH_VERSION) {
      nukeStorage();
      localStorage.setItem('auth_version', AUTH_VERSION);
      setUser(null);
      setRole(null);
      setSession(null);
    }
  }, []);

  const fetchRole = async (userId) => {
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
  };

  useEffect(() => {
    if (!hasSession) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          const userRole = await fetchRole(session.user.id);
          setUser(session.user);
          setRole(userRole);
          setSession(session);
        } else if (hasSession) {
          nukeStorage();
          setUser(null);
          setRole(null);
          setSession(null);
        }
      } catch (err) {
        nukeStorage();
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || isSigningIn.current) return;

        if (!session) {
          setUser(null);
          setRole(null);
          setSession(null);
          return;
        }

        const userRole = await fetchRole(session.user.id);
        setUser(session.user);
        setRole(userRole);
        setSession(session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (credentials) => {
    isSigningIn.current = true;
    setUser(null);
    setRole(null);
    setSession(null);

    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (data?.user) {
      const userRole = await fetchRole(data.user.id);
      setUser(data.user);
      setRole(userRole);
      setSession(data.session);
    }

    isSigningIn.current = false;
    return { data, error };
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    setSession(null);
    nukeStorage();
    await supabase.auth.signOut().catch(() => {});
  };

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{ user, role, session, signIn, signUp: (d) => supabase.auth.signUp(d), signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}