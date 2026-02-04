import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to safely fetch role
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
      console.error('Role fetch failed:', err);
      return 'customer';
    }
  };

  useEffect(() => {
    // 1. Initial Session Check with Validation
    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          throw error;
        }

        if (session?.user) {
          // Validate the session is actually working by making a test call
          const { error: testError } = await supabase.auth.getUser();
          if (testError) {
            console.error('Token validation failed:', testError);
            throw testError;
          }

          setUser(session.user);
          const userRole = await fetchRole(session.user.id);
          setRole(userRole);
        }
      } catch (err) {
        console.error('Session corrupted, clearing...', err);
        // Force logout if session is invalid
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        // Clear all Supabase-related storage
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Listen for Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        const userRole = await fetchRole(session.user.id);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut: async () => {
      setRole(null);
      setUser(null);
      await supabase.auth.signOut();
      // Clear all Supabase-related storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    },
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