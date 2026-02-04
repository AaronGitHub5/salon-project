import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

// Bump version to force a clean slate for everyone
const AUTH_VERSION = '5'; 

function nukeStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-')) localStorage.removeItem(key);
  });
}

function hasExistingSession() {
  return Object.keys(localStorage).some((key) => key.startsWith('sb-'));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(hasExistingSession());
  const isSigningIn = useRef(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem('auth_version');
    if (storedVersion !== AUTH_VERSION) {
      nukeStorage();
      localStorage.setItem('auth_version', AUTH_VERSION);
      setLoading(false);
    }
  }, []);

  // --- FIXED fetchRole FUNCTION ---
  const fetchRole = async (userId) => {
    console.log(`🔍 Fetching role for User ID: ${userId}`);

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // 1. Log the EXACT result from the database
    if (error) {
      console.error('❌ Supabase Error fetching role:', error);
      // If code is 'PGRST116', it means no row exists in 'profiles' table
      if (error.code === 'PGRST116') {
        console.error('⚠️ Critical: User exists in Auth but has NO ROW in public.profiles table.');
      }
      return 'customer'; // Default to safe role on error
    }

    if (!data) {
      console.error('❌ No data returned from Supabase.');
      return 'customer';
    }

    console.log(`✅ Success! Role from DB is: "${data.role}"`);
    return data.role || 'customer';
  };
  // --------------------------------

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
      } catch (err) {
        console.error("Session init failed:", err);
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

    if (error) {
        console.error("Sign In Error:", error.message);
        isSigningIn.current = false;
        return { data, error };
    }

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