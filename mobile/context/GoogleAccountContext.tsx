import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearGoogleAuth,
  fetchGoogleUser,
  getAccessToken,
  isGoogleConfigured,
  loadSavedAccount,
  saveGoogleAuth,
  type GoogleAccount,
  useGoogleDriveAuthRequest,
} from '@/lib/googleDrive';

type GoogleAccountContextValue = {
  ready: boolean;
  configured: boolean;
  account: GoogleAccount | null;
  signingIn: boolean;
  /** Same OAuth session used for Drive backup. */
  signInWithGoogle: () => Promise<GoogleAccount>;
  signOutGoogle: () => Promise<void>;
  refreshAccount: () => Promise<void>;
};

const GoogleAccountContext = createContext<GoogleAccountContextValue | null>(null);

/**
 * Shared Google identity for Mine “Sign in” and Backup → Drive.
 * One Gmail session; Drive scope is requested at sign-in.
 */
export function GoogleAccountProvider({ children }: { children: React.ReactNode }) {
  const [request, , promptAsync] = useGoogleDriveAuthRequest();
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const configured = isGoogleConfigured();

  const refreshAccount = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setAccount(null);
        return;
      }
      const saved = await loadSavedAccount();
      if (saved?.email) {
        setAccount(saved);
        return;
      }
      const profile = await fetchGoogleUser(token);
      setAccount(profile);
    } catch {
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshAccount();
      setReady(true);
    })();
  }, [refreshAccount]);

  const signInWithGoogle = useCallback(async () => {
    if (!configured) {
      throw new Error(
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile/.env (Google Cloud OAuth Web client), add redirect https://diary-api-2xnl.onrender.com/oauth/google/callback, enable Drive API, then restart Expo.'
      );
    }
    if (!request) {
      throw new Error('Google sign-in is still preparing — try again in a moment.');
    }
    setSigningIn(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success' || !result.authentication?.accessToken) {
        if (result.type === 'dismiss' || result.type === 'cancel') {
          throw new Error('Google sign-in was cancelled.');
        }
        throw new Error(
          ('error' in result && result.error?.message) || 'Google sign-in failed.'
        );
      }
      const profile = await fetchGoogleUser(result.authentication.accessToken);
      await saveGoogleAuth(result.authentication, profile);
      setAccount(profile);
      return profile;
    } finally {
      setSigningIn(false);
    }
  }, [configured, request, promptAsync]);

  const signOutGoogle = useCallback(async () => {
    await clearGoogleAuth();
    setAccount(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      configured,
      account,
      signingIn,
      signInWithGoogle,
      signOutGoogle,
      refreshAccount,
    }),
    [ready, configured, account, signingIn, signInWithGoogle, signOutGoogle, refreshAccount]
  );

  return (
    <GoogleAccountContext.Provider value={value}>{children}</GoogleAccountContext.Provider>
  );
}

export function useGoogleAccount() {
  const ctx = useContext(GoogleAccountContext);
  if (!ctx) throw new Error('useGoogleAccount must be used within GoogleAccountProvider');
  return ctx;
}

export function useGoogleAccountOptional() {
  return useContext(GoogleAccountContext);
}
