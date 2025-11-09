/**
 * AuthProvider - Simplified and Secure
 *
 * Uses dataClient adapter pattern for clean separation of demo/production logic.
 * All timeout handling is in the adapters.
 */

import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { dataClient, type User, type Profile, type Session } from '@/data';
import { getEnvironmentType } from '@/lib/environment-detection';
import { DEMO_USER, DEMO_PROFILE } from '@/lib/demo-constants';

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  retryLoadProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const envType = getEnvironmentType();
  const isDemo = envType === 'webcontainer' || envType === 'bolt' || envType === 'stackblitz';

  const loadProfile = useCallback(async (userId: string, silent = false) => {
    try {
      console.log('[AuthProvider] Loading profile for user:', userId, silent ? '(silent)' : '');

      if (isDemo) {
        console.log('[AuthProvider] Demo mode - using DEMO_PROFILE');
        setProfile(DEMO_PROFILE);
        return;
      }

      const profileData = await dataClient.profiles.getProfile(userId);

      if (!profileData) {
        throw new Error('Profile not found');
      }

      setProfile(profileData);
      console.log('[AuthProvider] Profile loaded successfully');
    } catch (err: any) {
      console.error('[AuthProvider] Profile load error:', err);

      // In silent mode (background retry), don't throw errors
      if (silent) {
        console.warn('[AuthProvider] Silent profile load failed - will retry later');
        return;
      }

      if (err?.message === 'FETCH_TIMEOUT') {
        throw new Error('Profile loading timed out. Please check your connection.');
      }

      throw err;
    }
  }, [isDemo]);

  const initializeAuth = useCallback(async () => {
    console.log('[AuthProvider] Initializing auth...');

    try {
      if (isDemo) {
        console.log('[AuthProvider] Demo mode - using DEMO_USER');
        setUser(DEMO_USER);
        setProfile(DEMO_PROFILE);
        setSession({
          access_token: 'demo_token',
          refresh_token: 'demo_refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: DEMO_USER,
        });
        setLoading(false);
        return;
      }

      const { session: currentSession, error } = await dataClient.auth.getSession();

      if (error) {
        throw error;
      }

      if (currentSession?.user) {
        console.log('[AuthProvider] Session found:', currentSession.user.email);
        setSession(currentSession);
        setUser({
          id: currentSession.user.id,
          email: currentSession.user.email!,
          role: currentSession.user.role,
        });

        // Try to load profile, but don't block on timeout
        try {
          await loadProfile(currentSession.user.id);
        } catch (profileErr) {
          console.warn('[AuthProvider] Profile load failed, continuing with user only');
          // Start background retry after 2 seconds
          setTimeout(() => {
            console.log('[AuthProvider] Retrying profile load in background...');
            loadProfile(currentSession.user.id, true);
          }, 2000);
        }
      } else {
        console.log('[AuthProvider] No active session');
      }
    } catch (err: any) {
      console.error('[AuthProvider] Init error:', err);

      if (err?.message === 'GET_SESSION_TIMEOUT') {
        console.warn('[AuthProvider] Session timeout - continuing without auth');
      }
    } finally {
      setLoading(false);
    }
  }, [isDemo, loadProfile]);

  useEffect(() => {
    initializeAuth();

    const unsubscribe = dataClient.auth.onAuthStateChange((newSession) => {
      if (newSession?.user) {
        setSession(newSession);
        setUser({
          id: newSession.user.id,
          email: newSession.user.email!,
          role: newSession.user.role,
        });
        loadProfile(newSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, [initializeAuth, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (loadingRef.current || user) {
      console.log('[AuthProvider] Sign in skipped: already loading or authenticated');
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      console.log('[AuthProvider] Signing in...');

      const response = await dataClient.auth.signIn({ email, password });

      if (response.error) {
        throw response.error;
      }

      if (!response.user || !response.session) {
        throw new Error('Invalid response from auth service');
      }

      console.log('[AuthProvider] Sign in successful');
      setUser(response.user);
      setSession(response.session);

      await loadProfile(response.user.id);
    } catch (err: any) {
      console.error('[AuthProvider] Sign in error:', err);

      if (err?.message === 'SIGNIN_TIMEOUT') {
        throw new Error('Sign in timed out. Please check your connection and try again.');
      }

      throw err;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [user, loadProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    if (loadingRef.current) {
      console.log('[AuthProvider] Sign up skipped: already loading');
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      console.log('[AuthProvider] Signing up...');

      const response = await dataClient.auth.signUp({
        email,
        password,
        full_name: fullName,
      });

      if (response.error) {
        throw response.error;
      }

      if (!response.user) {
        throw new Error('Sign up failed');
      }

      console.log('[AuthProvider] Sign up successful');
      setUser(response.user);
      setSession(response.session);

      if (response.session) {
        await loadProfile(response.user.id);
      }
    } catch (err: any) {
      console.error('[AuthProvider] Sign up error:', err);

      if (err?.message === 'SIGNUP_TIMEOUT') {
        throw new Error('Sign up timed out. Please check your connection and try again.');
      }

      throw err;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    try {
      console.log('[AuthProvider] Signing out...');

      await dataClient.auth.signOut();

      setUser(null);
      setProfile(null);
      setSession(null);

      console.log('[AuthProvider] Sign out successful');
    } catch (err) {
      console.error('[AuthProvider] Sign out error:', err);
      throw err;
    }
  }, []);

  const retryLoadProfile = useCallback(async () => {
    if (!user) {
      console.warn('[AuthProvider] Cannot retry: no user');
      return;
    }

    console.log('[AuthProvider] Retrying profile load...');
    await loadProfile(user.id);
  }, [user, loadProfile]);

  const value: AuthContextValue = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    retryLoadProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
