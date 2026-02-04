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
  // --- INSTANT LOAD LOGIC ---
  // 1. Check if we have a session in storage right now
  const hasSession = Object.keys(localStorage).some((key) => key.startsWith('sb-'));
  
  // 2. If we have a session, assume we are logged in immediately (optimistic UI)
  const [loading, setLoading] = useState(false); 
  
  // 3. Initialize user/role from memory if possible, or null
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  
  const isSigningIn = useRef(false);

  // Version check (keep this to clean up old messes)
  useEffect(() => {
    const storedVersion = localStorage.getItem('auth_version');
    if (storedVersion !== AUTH_VERSION) {
      nukeStorage();
      localStorage.setItem('auth_version', AUTH_VERSION);
      // If we nuked storage, we aren't logged in
      setUser(null);
      setRole(null);
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
    // If no session exists, we are definitely done loading
    if (!hasSession) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        // This is the network call that usually causes the delay
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          // Verify role in background
          const userRole = await fetchRole(session.user.id);
          setUser(session.user);
          setRole(userRole);
        } else if (hasSession) {
          // If storage said yes but server said no, clean up
          nukeStorage();
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        nukeStorage();
      }
      // We don't touch setLoading(false) here because we set it to false initially
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

  // We only render null if we are explicitly forced to wait (rare now)
  if (loading) return null;

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