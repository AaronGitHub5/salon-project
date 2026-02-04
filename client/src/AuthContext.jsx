import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

// Force clear on first visit with new code
const AUTH_VERSION = '2';

function nukeStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-')) localStorage.removeItem(key);
  });
}

// Check if ANY session exists before React even renders
function hasExistingSession() {
  return Object.keys(localStorage).some((key) => key.startsWith('sb-'));
}

export function AuthProvider({ children }) {
  // If no session in storage, skip loading entirely
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(hasExistingSession());
  const isSigningIn = useRef(false);

  // One-time version check - clears old corrupted data
  useEffect(() => {
    const storedVersion = localStorage.getItem('auth_version');
    if (storedVersion !== AUTH_VERSION) {
      console.log('New auth version - clearing old data');
      nukeStorage();
      localStorage.setItem('auth_version', AUTH_VERSION);
      setLoading(false);
    }
  }, []);

  const fetchRole = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      return data?.role || 'customer';
    } catch {
      return 'customer';
    }
  };

  useEffect(() => {
    if (!hasExistingSession()) {
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
        }
      } catch {
        nukeStorage();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || isSigningIn.current) return;

        if (!session) {
          setUser(null);
          setRole(null);
          return;
        }

        const userRole = await fetchRole(session.user.id);
        setUser(session.user);
        setRole(userRole);
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

    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (data?.user) {
      const userRole = await fetchRole(data.user.id);
      setUser(data.user);
      setRole(userRole);
    }

    isSigningIn.current = false;
    return { data, error };
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    nukeStorage();
    await supabase.auth.signOut().catch(() => {});
  };

  if (loading) {
    return null; // Brief flash, not 5 seconds
  }

  return (
    <AuthContext.Provider
      value={{ user, role, signIn, signUp: (d) => supabase.auth.signUp(d), signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}