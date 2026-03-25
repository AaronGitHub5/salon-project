import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

const AUTH_VERSION = '7';

function nukeStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-')) localStorage.removeItem(key);
  });
}

async function fetchRole(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    console.log('fetchRole result:', { data, error, userId });
    if (error || !data) return 'customer';
    return data.role || 'customer';
  } catch (err) {
    console.log('fetchRole exception:', err);
    return 'customer';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth version check — nuke stale sessions on version bump
    const storedVersion = localStorage.getItem('auth_version');
    if (storedVersion !== AUTH_VERSION) {
      nukeStorage();
      localStorage.setItem('auth_version', AUTH_VERSION);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AUTH EVENT:', event, session?.user?.email);

        if (event === 'SIGNED_OUT' || !session) {
          console.log('AUTH: clearing state');
          setUser(null);
          setRole(null);
          setSession(null);
          setLoading(false);
          return;
        }

        const userRole = await fetchRole(session.user.id);
        console.log('ROLE FETCHED:', userRole, 'for', session?.user?.email);
        setUser(session.user);
        setRole(userRole);
        setSession(session);
        setLoading(false);
      }
    );

    // Fallback: clear loading if onAuthStateChange never fires (no session, cold load)
    const fallback = setTimeout(() => setLoading(false), 500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  const signIn = async (credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    return { data, error };
  };

  const signOut = async () => {
    nukeStorage();
    await supabase.auth.signOut().catch(() => {});
  };

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        session,
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