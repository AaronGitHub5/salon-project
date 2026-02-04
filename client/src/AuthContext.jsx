import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

function clearCorruptedStorage() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    localStorage.clear();
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) return 'customer';
      return data.role;
    } catch (err) {
      return 'customer';
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) throw error;

        if (session?.user) {
          const { data: userData, error: userError } =
            await supabase.auth.getUser();

          if (userError || !userData?.user) {
            throw new Error('Invalid session');
          }

          setUser(session.user);
          const userRole = await fetchRole(session.user.id);
          if (isMounted) setRole(userRole);
        }
      } catch (err) {
        console.error('Session invalid, clearing...', err);
        clearCorruptedStorage();
        await supabase.auth.signOut().catch(() => {});
        if (isMounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth timeout - forcing login screen');
        clearCorruptedStorage();
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    }, 5000);

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        // Always fetch fresh role on auth change
        const userRole = await fetchRole(session.user.id);
        if (isMounted) setRole(userRole);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setUser(null);
    setRole(null);
    clearCorruptedStorage();
    await supabase.auth.signOut().catch(() => {});
  };

  // FIXED: Sign in now clears old state and fetches fresh role
  const signIn = async (data) => {
    // Clear old user/role FIRST
    setUser(null);
    setRole(null);

    const result = await supabase.auth.signInWithPassword(data);

    // If sign in succeeded, immediately set user and fetch role
    if (result.data?.user && !result.error) {
      setUser(result.data.user);
      const freshRole = await fetchRole(result.data.user.id);
      setRole(freshRole);
    }

    return result;
  };

  // FIXED: Sign up also handles role properly
  const signUp = async (data) => {
    setUser(null);
    setRole(null);
    return supabase.auth.signUp(data);
  };

  const value = {
    signUp,
    signIn,
    signOut,
    user,
    role,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}