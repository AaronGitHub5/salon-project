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

  useEffect(() => {
    // Auth version check — nuke stale sessions on version bump
    const storedVersion = localStorage.getItem('auth_version');
    if (storedVersion !== AUTH_VERSION) {
      nukeStorage();
      localStorage.setItem('auth_version', AUTH_VERSION);
    }

    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setRole(null);
          setSession(null);
          setLoading(false);
          return;
        }

        // INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED  all handled here
        const userRole = await fetchRole(session.user.id);
        setUser(session.user);
        setRole(userRole);
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // signIn just triggers Supabase auth 
  const signIn = async (credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    return { data, error };
  };

  const signOut = async () => {
    nukeStorage();
    await supabase.auth.signOut().catch(() => {});
    // onAuthStateChange fires SIGNED_OUT and clears state
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