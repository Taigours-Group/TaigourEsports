import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // Fix HashRouter conflict: if the URL has Supabase auth tokens instead of a valid route,
        // redirect back to home page so the app doesn't render a blank white screen.
        if (window.location.hash.includes('access_token=')) {
          window.location.hash = '/';
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    setLoading(true);
    const { data, error } = await authService.getProfile(userId);
    if (!error) {
      setProfile(data);
    }
    setLoading(false);
  };

  const loginWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const loginWithApple = async () => {
    await authService.signInWithApple();
  };

  const loginWithFacebook = async () => {
    await authService.signInWithFacebook();
  };

  const logout = async () => {
    await authService.signOut();
  };

  const reloadProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    loading,
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    logout,
    reloadProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
