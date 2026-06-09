import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// Minimal auth provider that preserves the exact context shape the app consumes
// (isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError,
// navigateToLogin, logout, checkUserAuth, checkAppState, appPublicSettings) so no
// consumer had to change. The app's real access control is the PIN gate
// (PinGate) plus the public read-only pages — exactly as on Base44, where auth
// was not required to view/edit. We simply resolve to "not signed in, no error",
// which lets the routes render and the PIN gate take over.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // No remote app-settings call any more; auth isn't required to use the app.
    setAppPublicSettings({ public_settings: {} });
    setIsLoadingPublicSettings(false);
    await checkUserAuth();
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    try {
      // If a Supabase user happens to be signed in, surface them; otherwise this
      // throws and we fall through to the unauthenticated (PIN-gated) state.
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) throw new Error('Not authenticated');
      const u = data.user;
      setUser({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name ?? u.email,
        role: u.user_metadata?.role ?? 'user',
      });
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    supabase.auth.signOut();
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    // No external login flow in the ported app; the PIN gate handles access.
    // Kept as a no-op so existing call sites stay valid.
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
