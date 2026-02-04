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
      
      if (error || !data) return 'customer'; // Default safe fallback
      return data.role;
    } catch (err) {
      console.error("Role fetch failed:", err);
      return 'customer';
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          const userRole = await fetchRole(session.user.id);
          setRole(userRole);
        }
      } catch (err) {
        console.error("Session corrupted, clearing...", err);
        //  Force logout if session is weird
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        localStorage.clear(); // Nuclear option for safety
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Listen for Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      localStorage.clear(); // Ensure clean exit
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