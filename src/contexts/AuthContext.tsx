import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getConnectionErrorMessage } from '../lib/supabase-health-check';
import { createLogger } from '../lib/logger';
import { supabaseCache } from '../lib/supabase-cache';
import { getOptimalTimeouts, getEnvironmentType, shouldUseAggressiveCaching } from '../lib/environment-detection';
import type { Database } from '../lib/database.types';
import { DEMO_USER_ID, DEMO_ORG_ID, DEMO_USER, DEMO_PROFILE, DEMO_ORGANIZATION } from '../lib/demo-constants';

const logger = createLogger('[AuthContext]');

const getTimeouts = () => getOptimalTimeouts();

type Profile = Database['public']['Tables']['profiles']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  activeOrganization: Organization | null;
  session: Session | null;
  loading: boolean;
  profileLoaded: boolean;
  isOwner: boolean;
  profileError: string | null;
  loadingTimedOut: boolean;
  forceSkipLoading: () => void;
  retryLoadProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: Profile['role']) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  canSwitchOrganization: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [canSwitchOrganization, setCanSwitchOrganization] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  const loadingRef = useRef<boolean>(false);
  const lastLoadTimeRef = useRef<number>(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string, retryCount = 0) => {
    const timeouts = getTimeouts();
    const envType = getEnvironmentType();
    const useAggressiveCache = shouldUseAggressiveCaching();

    // GUARD: Set loading state IMMEDIATELY and check if already loading
    if (loadingRef.current) {
      console.log('[AuthContext] Another profile load in progress (loadingRef=true), skipping');
      return;
    }

    // Set loading flag immediately to prevent concurrent loads
    loadingRef.current = true;
    activeUserIdRef.current = userId;

    console.log('[AuthContext] Starting profile load for userId:', userId, 'retryCount:', retryCount);

    try {
    lastLoadTimeRef.current = Date.now();
    setLoadingTimedOut(false);

    abortControllerRef.current = new AbortController();

    const maxRetries = timeouts.maxRetries;
    const baseDelay = timeouts.retryDelay;

    try {
      logger.debug(`Loading profile for user ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

      // Clear error on new attempt
      setProfileError(null);

      const cacheMaxAge = useAggressiveCache ? 600000 : 300000;

      if (retryCount === 0) {
        const cachedData = sessionStorage.getItem(`user_data_${userId}`);
        console.log('[AuthContext] Checking cache:', cachedData ? 'EXISTS' : 'EMPTY');
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - parsed.timestamp;
            console.log('[AuthContext] Cache age:', cacheAge, 'max:', cacheMaxAge, 'has profile:', !!parsed.profile);

            if (Date.now() - parsed.timestamp < cacheMaxAge && parsed.profile) {
              logger.debug('Using cached profile data');
              console.log('[AuthContext] ✓ Using CACHED profile:', parsed.profile.email);
              setProfile(parsed.profile);
              setOrganization(parsed.organization);
              setIsOwner(parsed.isOwner);
              setProfileLoaded(true);

              // Set activeOrganization and canSwitchOrganization from cache
              const canSwitch = parsed.profile.role === 'master' || parsed.profile.role === 'admin';
              setCanSwitchOrganization(canSwitch);

              // Check if there's a stored active organization different from cached
              const storedActiveOrgId = localStorage.getItem('active_organization_id');
              if (storedActiveOrgId && canSwitch && storedActiveOrgId !== parsed.organization?.id) {
                logger.debug('[AuthContext] Cache: stored org differs, will reload without cache');
                console.log('[AuthContext] Cache: clearing due to org mismatch');
                // Don't use cache, continue to full load to get stored org
                sessionStorage.removeItem(`user_data_${userId}`);
              } else {
                // Use cached activeOrganization
                setActiveOrganization(parsed.organization);
                setLoading(false);
                loadingRef.current = false;
                console.log('[AuthContext] Returning from cache early');
                return;
              }
            } else {
              console.log('[AuthContext] Cache expired or invalid, clearing');
              sessionStorage.removeItem(`user_data_${userId}`);
            }
          } catch (cacheError) {
            logger.warn('Cache parse error:', cacheError);
            sessionStorage.removeItem(`user_data_${userId}`);
          }
        }
      }

      // Fetch profile from database with timeout (now handled by fetchWithTimeout in supabase client)
      let profileData;
      let profileError;

      console.log('[AuthContext] About to fetch profile for user:', userId);
      try {
        console.log('[AuthContext] Calling get_my_profile() RPC...');

        // Check if we have a session first
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthContext] Current session:', session ? 'EXISTS' : 'NULL');
        console.log('[AuthContext] Session user:', session?.user?.id);

        // Try RPC function first (preferred method)
        let result = await supabase
          .rpc('get_my_profile')
          .limit(1)
          .maybeSingle();

        console.log('[AuthContext] Profile RPC result:', {
          data: result.data ? 'EXISTS' : 'NULL',
          error: result.error,
          status: result.status,
          statusText: result.statusText
        });

        // Fallback: If RPC fails OR returns null, try direct query
        if ((result.error && result.error.message?.includes('function') && result.error.message?.includes('does not exist')) || !result.data) {
          if (result.error) {
            console.warn('[AuthContext] RPC function not found, falling back to direct query');
          } else {
            console.warn('[AuthContext] RPC returned null, falling back to direct query');
          }
          result = await supabase
            .from('profiles')
            .select('id, email, full_name, role, organization_id, phone, is_master_account, last_sign_in_at, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle();

          console.log('[AuthContext] Direct query result:', {
            data: result.data ? 'EXISTS' : 'NULL',
            error: result.error
          });
        }

        profileData = result.data;
        profileError = result.error;
      } catch (err: any) {
        // Normalize abort errors to FETCH_TIMEOUT
        if (err?.name === 'AbortError' || (err?.message && err.message.toLowerCase().includes('aborted'))) {
          logger.warn('Profile fetch aborted due to timeout');
          throw new Error('FETCH_TIMEOUT');
        }
        throw err;
      }

      if (profileError) {
        logger.error('Profile query error:', profileError);
        throw new Error(`Database error: ${profileError.message}`);
      }

      // If no profile found, retry with exponential backoff
      if (!profileData) {
        logger.warn(`Profile not found for user ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

        if (retryCount < maxRetries && !abortControllerRef.current?.signal.aborted) {
          const exponentialDelay = baseDelay * Math.pow(2, retryCount);
          const jitter = Math.random() * 500;
          const delay = Math.min(exponentialDelay + jitter, 5000);

          logger.debug(`Profile not created yet. Retrying in ${Math.round(delay)}ms...`);

          // Reset loading state before retry to allow the next attempt
          loadingRef.current = false;
          activeUserIdRef.current = null;

          await new Promise(resolve => setTimeout(resolve, delay));
          return loadProfile(userId, retryCount + 1);
        } else {
          logger.error('Max retries reached, profile still not found');
          throw new Error('PROFILE_NOT_FOUND');
        }
      }

      logger.debug('Profile loaded successfully:', profileData.email);

      // Load organization if available
      let orgData = null;
      let ownerStatus = false;

      if (profileData.organization_id && !abortControllerRef.current?.signal.aborted) {
        logger.debug('Loading organization:', profileData.organization_id);

        let specificOrg;
        let orgError;

        try {
          const result = await supabase
            .from('organizations')
            .select('id, name, type, status')
            .eq('id', profileData.organization_id)
            .maybeSingle();

          specificOrg = result.data;
          orgError = result.error;
        } catch (err: any) {
          // Normalize abort errors
          if (err?.name === 'AbortError' || (err?.message && err.message.toLowerCase().includes('aborted'))) {
            logger.warn('Organization fetch aborted due to timeout');
            throw new Error('ORG_FETCH_TIMEOUT');
          }
          throw err;
        }

        if (orgError) {
          logger.error('Organization query error:', orgError);
        } else {
          orgData = specificOrg;
          // Master users are ALWAYS considered owners, admins need to be in 'owner' org
          ownerStatus = profileData.role === 'master' || (specificOrg?.type === 'owner' && profileData.role === 'admin');
          logger.debug('Organization loaded:', specificOrg?.name);
        }
      }

      // Cache successful result
      try {
        sessionStorage.setItem(`user_data_${userId}`, JSON.stringify({
          profile: profileData,
          organization: orgData,
          isOwner: ownerStatus,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        logger.warn('Failed to cache profile:', cacheError);
      }

      setProfile(profileData);
      setOrganization(orgData);
      setIsOwner(ownerStatus);
      setProfileError(null);
      setProfileLoaded(true);

      // Check if user can switch organizations (master or admin only)
      const canSwitch = profileData.role === 'master' || profileData.role === 'admin';
      setCanSwitchOrganization(canSwitch);
      logger.info(`Setting canSwitchOrganization to: ${canSwitch} (role: ${profileData.role})`);

      // Check for stored active organization FIRST (for master/admin)
      // Use localStorage for better persistence
      const storedActiveOrgId = localStorage.getItem('active_organization_id');
      console.log('[AuthContext] Checking stored active organization:', storedActiveOrgId);
      console.log('[AuthContext] User org:', orgData?.id, orgData?.name);
      console.log('[AuthContext] Can switch:', canSwitch);

      if (storedActiveOrgId && canSwitch) {
        // Master/admin has a stored active organization
        console.log('[AuthContext] 🔄 Loading stored active organization:', storedActiveOrgId);

        supabase
          .from('organizations')
          .select('*')
          .eq('id', storedActiveOrgId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              logger.warn('[AuthContext] Failed to load stored organization:', error);
              // Fallback to user's org
              if (orgData) {
                setActiveOrganization(orgData);
                logger.info(`[AuthContext] Fallback to user org: ${orgData.name}`);
              }
            } else if (data) {
              setActiveOrganization(data);
              console.log('[AuthContext] ✅ Restored active organization:', data.name, data.id);
            } else {
              logger.warn('[AuthContext] Stored organization not found');
              // Clear invalid stored org
              localStorage.removeItem('active_organization_id');
              if (orgData) {
                setActiveOrganization(orgData);
                logger.info(`[AuthContext] Fallback to user org: ${orgData.name}`);
              }
            }
          })
          .catch((err) => {
            logger.warn('[AuthContext] Exception loading stored organization:', err);
            if (orgData) {
              setActiveOrganization(orgData);
              logger.info(`[AuthContext] Fallback to user org: ${orgData.name}`);
            }
          });
      } else {
        // No stored org, or not master/admin
        // Just use user's org
        if (orgData) {
          setActiveOrganization(orgData);
          console.log('[AuthContext] 📍 Setting activeOrganization to user org:', orgData.name, orgData.id);
        } else {
          logger.warn('[AuthContext] No organization data available');
        }
      }

      // Synchroniser last_sign_in_at en arrière-plan (ne pas bloquer)
      if (retryCount === 0) {
        supabase.rpc('update_my_last_sign_in')
          .then(() => {
            logger.debug('Background last_sign_in updated');
          })
          .catch(err => {
            logger.debug('Background last_sign_in update failed:', err);
          });
      }

    } catch (error) {
      console.error('[AuthContext] ❌ CATCH BLOCK - Error loading user data:', error);
      logger.error('Error loading user data:', error);

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        logger.info('Profile load was aborted');
        return;
      }

      // Determine error type and message using improved error handling
      let errorMessage = 'Une erreur inattendue s\'est produite';
      let shouldRetry = false;

      if (error instanceof Error) {
        if (error.message === 'PROFILE_NOT_FOUND') {
          errorMessage = 'Votre profil n\'a pas pu être créé automatiquement. Veuillez cliquer sur "Réessayer" ou contacter le support.';
        } else if (error.message === 'FETCH_TIMEOUT' || error.message === 'ORG_FETCH_TIMEOUT') {
          errorMessage = 'La connexion au serveur prend trop de temps. Vérifiez votre connexion internet.';
          shouldRetry = retryCount < maxRetries;
        } else if (error.message.includes('permission') || error.message.includes('Permission')) {
          errorMessage = 'Erreur de permission. Les règles de sécurité ont été mises à jour. Veuillez vous déconnecter complètement (Ctrl+Shift+R pour vider le cache) puis vous reconnecter.';
        } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Problème de connexion détecté. Cela peut être dû à votre environnement de développement. Cliquez sur "Ignorer et continuer" ci-dessous.';
          shouldRetry = false;
        } else {
          errorMessage = getConnectionErrorMessage(error);
          shouldRetry = retryCount < maxRetries;
        }
      } else {
        errorMessage = getConnectionErrorMessage(error);
        shouldRetry = retryCount < maxRetries;
      }

      setProfileError(errorMessage);

      // Retry on error with exponential backoff
      if (shouldRetry && !abortControllerRef.current?.signal.aborted) {
        const delay = baseDelay * Math.pow(2, retryCount);
        logger.debug(`Retrying after error in ${delay}ms...`);

        // Reset loading state before retry to allow the next attempt
        loadingRef.current = false;
        activeUserIdRef.current = null;

        await new Promise(resolve => setTimeout(resolve, delay));
        return loadProfile(userId, retryCount + 1);
      }

      // Final failure - mark as loaded (failed) so UI doesn't get stuck
      console.log('[AuthContext] Final failure, setting profileLoaded=true with error');
      setProfileLoaded(true);

      // Clear cache on final failure
      sessionStorage.removeItem(`user_data_${userId}`);

    } finally {
      console.log('[AuthContext] FINALLY block - resetting loading states');

      // CRITICAL: Reset loading flags in proper order
      setLoading(false);
      loadingRef.current = false;
      activeUserIdRef.current = null;

      // DO NOT set profileLoaded here - it should only be set when we successfully load data
      // or explicitly when we've exhausted all retries

      // Clear all timeouts to prevent EMERGENCY TIMEOUT from firing
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
        console.log('[AuthContext] Cleared loading timeout');
      }
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
        console.log('[AuthContext] Cleared emergency timeout');
      }
    }
  } catch (outerError) {
    console.error('[AuthContext] ❌ OUTER CATCH - Unexpected error in loadProfile:', outerError);

    // Ensure cleanup happens even in outer catch
    loadingRef.current = false;
    activeUserIdRef.current = null;
    setLoading(false);
  }
  }, []);

  useEffect(() => {
    let mounted = true;
    const timeouts = getTimeouts();
    const envType = getEnvironmentType();

    const timeoutDuration = timeouts.emergencyTimeout;

    // Set up loading timeout
    loadingTimeoutRef.current = setTimeout(() => {
      if (mounted && loading) {
        logger.warn(`Loading timed out after ${timeoutDuration / 1000} seconds in ${envType} environment`);
        setLoadingTimedOut(true);
        if (envType === 'bolt' || envType === 'webcontainer') {
          setProfileError('Environnement Bolt: Connexion Supabase limitée. Cliquez sur "Ignorer et continuer".');
        } else {
          setProfileError('Connexion limitée. Vous pouvez ignorer et continuer.');
        }
      }
    }, timeoutDuration);

    emergencyTimeoutRef.current = setTimeout(() => {
      if (mounted && loading) {
        console.error('[AuthContext] EMERGENCY TIMEOUT triggered after', timeouts.emergencyTimeout * 2, 'ms');
        logger.error('EMERGENCY TIMEOUT - Force stopping loading after ' + (timeouts.emergencyTimeout * 2) + 'ms');

        setLoading(false);
        setLoadingTimedOut(true);

        if (envType === 'bolt' || envType === 'webcontainer') {
          setProfileError('Environnement Bolt détecté. Connexion Supabase limitée. Cliquez sur "Ignorer et continuer" pour utiliser l\'application.');
        } else {
          // In production, this might indicate missing RPC function or RLS issue
          console.error('[AuthContext] Production timeout - Check if get_my_profile() RPC exists and RLS policies are correct');
          setProfileError('Erreur de chargement du profil. Vérifiez votre connexion et réessayez. Si le problème persiste, contactez le support.');
        }
      }
    }, timeouts.emergencyTimeout * 2);

    const initAuth = async () => {
      try {
        logger.info(`Initializing authentication in ${envType} environment...`);

        let sessionResult;

        try {
          // fetchWithTimeout will handle the timeout and abort automatically
          sessionResult = await supabase.auth.getSession();
        } catch (err: any) {
          // Normalize abort errors to GET_SESSION_TIMEOUT
          if (err?.name === 'AbortError' || (err?.message && err.message.toLowerCase().includes('aborted'))) {
            logger.warn('Session fetch aborted due to timeout');
            throw new Error('GET_SESSION_TIMEOUT');
          }
          throw err;
        }

        const { data: { session }, error } = sessionResult as any;

        if (!mounted) return;

        if (error) {
          logger.error('Session error:', error);
          throw error;
        }

        logger.info('Session retrieved:', session ? 'Active' : 'None');
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          logger.info('User found, loading profile...');
          console.log('[AuthContext] initAuth - calling loadProfile for:', session.user.id);
          await loadProfile(session.user.id);
          console.log('[AuthContext] initAuth - loadProfile completed');
        } else {
          logger.info('No active session');
          setLoading(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
        }
      } catch (error) {
        if (!mounted) return;

        logger.error('Failed to initialize auth:', error);

        if (error instanceof Error && error.message === 'GET_SESSION_TIMEOUT') {
          if (envType === 'bolt' || envType === 'webcontainer') {
            setProfileError('Environnement Bolt: connexion à Supabase limitée. Cliquez sur "Ignorer et continuer" pour utiliser l\'application.');
          } else {
            setProfileError('La connexion à Supabase a échoué. Vous pouvez ignorer et continuer.');
          }
        } else if (error instanceof Error && error.message.includes('CORS')) {
          setProfileError(`Erreur CORS détectée en environnement ${envType}. Vous pouvez ignorer et continuer.`);
        } else {
          setProfileError('Impossible de récupérer la session. Vous pouvez ignorer et continuer.');
        }

        setLoading(false);
        setLoadingTimedOut(true);

        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
    };

  }, []);

  // Separate effect for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      logger.info('Auth state changed:', _event);
      console.log('[AuthContext] onAuthStateChange - event:', _event, 'has user:', !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);

      // Only load profile for SIGNED_IN event (not INITIAL_SESSION, not duplicate SIGNED_IN)
      // INITIAL_SESSION is already handled by the initAuth() useEffect
      if (session?.user && _event === 'SIGNED_IN') {
        console.log('[AuthContext] SIGNED_IN event, calling loadProfile for:', session.user.id);

        // Small delay to prevent race condition with guards
        setTimeout(() => {
          loadProfile(session.user.id).catch(err => {
            console.error('[AuthContext] Failed to load profile from SIGNED_IN:', err);
          });
        }, 100);
      } else if (session?.user && _event === 'INITIAL_SESSION') {
        console.log('[AuthContext] INITIAL_SESSION - profile loading handled by initAuth, skipping');
      } else if (!session?.user) {
        console.log('[AuthContext] No user, clearing profile');
        setProfile(null);
        setOrganization(null);
        setActiveOrganization(null);
        setProfileLoaded(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadProfile]);

  const forceSkipLoading = useCallback(() => {
    logger.info('Force skipping loading state');
    setLoading(false);
    setLoadingTimedOut(false);
    setProfileLoaded(true);

    // Clear all loading flags and timeouts
    loadingRef.current = false;
    activeUserIdRef.current = null;

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const retryLoadProfile = async () => {
    if (!user?.id) return;

    // Prevent retry if already loading
    if (loadingRef.current) {
      console.log('[AuthContext] Retry skipped - already loading');
      return;
    }

    const timeouts = getTimeouts();

    // Clear all previous state before retry
    loadingRef.current = false;
    activeUserIdRef.current = null;

    setLoading(true);
    setProfileError(null);
    setLoadingTimedOut(false);
    sessionStorage.removeItem(`user_data_${user.id}`);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        logger.warn(`Retry loading timed out after ${timeouts.emergencyTimeout / 1000} seconds`);
        setLoadingTimedOut(true);
      }
    }, timeouts.emergencyTimeout);

    await loadProfile(user.id, 0);
  };

  const refreshOrganization = async () => {
    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .maybeSingle();

    if (data) {
      setOrganization(data);
      // Master users are ALWAYS considered owners, admins need to be in 'owner' org
      setIsOwner(profile.role === 'master' || (data.type === 'owner' && profile.role === 'admin'));

      // Initialize active organization to user's organization
      if (!activeOrganization) {
        setActiveOrganization(data);
      }
    }
  };

  const switchOrganization = async (organizationId: string) => {
    if (!profile) return;

    // Only master and admin can switch
    if (profile.role !== 'master' && profile.role !== 'admin') {
      logger.warn('User does not have permission to switch organizations');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Clear ALL caches before switching
        console.log('[AuthContext] 🧹 Clearing all caches before switch');
        supabaseCache.clear();

        // Store in localStorage for persistence FIRST
        localStorage.setItem('active_organization_id', organizationId);
        console.log('[AuthContext] 💾 Saved to localStorage:', organizationId);
        console.log('[AuthContext] Verify saved:', localStorage.getItem('active_organization_id'));

        setActiveOrganization(data);
        console.log('[AuthContext] ✅ Switched to organization:', data.name, organizationId);
      }
    } catch (error) {
      logger.error('Error switching organization:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Guard: prevent concurrent sign-in calls
    if (loadingRef.current) {
      logger.debug('Sign in skipped: already loading');
      return;
    }

    // Guard: prevent sign-in if user already exists
    if (user) {
      logger.debug('Sign in skipped: user already authenticated');
      return;
    }

    logger.info(`Attempting sign in for: ${email}`);

    const envType = getEnvironmentType();
    const timeouts = getTimeouts();

    // Mark as loading to prevent concurrent calls
    loadingRef.current = true;

    // Mode démo pour WebContainer/Bolt (pas de connexion réseau disponible)
    if (envType === 'bolt' || envType === 'webcontainer') {
      logger.warn('WebContainer detected - using demo mode (no network access)');

      // Simuler une connexion réussie avec des données mockées
      const mockUser = {
        ...DEMO_USER,
        email: email,
      } as any;

      const mockProfile = {
        ...DEMO_PROFILE,
        email: email,
      };

      const mockOrganization = DEMO_ORGANIZATION;

      // Mettre à jour l'état avec les données mockées
      setUser(mockUser);
      setProfile(mockProfile);
      setOrganization(mockOrganization);
      setActiveOrganization(mockOrganization);
      setIsOwner(true);
      setLoading(false);
      setProfileLoaded(true);

      logger.info('Demo mode sign in successful');
      loadingRef.current = false;
      return;
    }

    // fetchWithTimeout will handle the timeout automatically
    logger.info(`Sign in with ${timeouts.sessionTimeout}ms timeout in ${envType} environment`);

    try {
      let signInResult;

      try {
        signInResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } catch (err: any) {
        // Normalize abort errors to SIGNIN_TIMEOUT
        if (err?.name === 'AbortError' || (err?.message && err.message.toLowerCase().includes('aborted'))) {
          logger.warn('Sign in aborted due to timeout');
          throw new Error('SIGNIN_TIMEOUT');
        }
        throw err;
      }

      const { data, error } = signInResult;

      if (error) {
        logger.error('Sign in error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: (error as any).code,
        });
        throw error;
      }

      logger.info('Sign in successful:', data.user?.email);

      // Mettre à jour la dernière connexion (en arrière-plan, non-bloquant)
      if (data.user?.id) {
        supabase.rpc('update_my_last_sign_in')
          .then(() => logger.debug('Last sign-in timestamp updated'))
          .catch(error => logger.warn('Failed to update last sign-in timestamp:', error));
      }

      // Sign-in successful, reset loading ref
      loadingRef.current = false;
    } catch (error) {
      // Reset loading ref on error
      loadingRef.current = false;

      if (error instanceof Error && error.message === 'SIGNIN_TIMEOUT') {
        logger.error('Sign in timed out');
        throw new Error('La connexion a pris trop de temps. Vérifiez votre connexion internet et réessayez.');
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: Profile['role']) => {
    logger.info('Starting signup process...');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    if (error) {
      logger.error('Signup error:', error);
      throw error;
    }

    if (data.user) {
      logger.info('User created, waiting for profile creation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      logger.info('Loading profile with retry logic...');
      await loadProfile(data.user.id, 0);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Reset all state on sign out
    setProfile(null);
    setOrganization(null);
    setActiveOrganization(null);
    setProfileLoaded(false);
    setCanSwitchOrganization(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organization,
        activeOrganization,
        session,
        loading,
        profileLoaded,
        isOwner,
        profileError,
        loadingTimedOut,
        forceSkipLoading,
        retryLoadProfile,
        signIn,
        signUp,
        signOut,
        refreshOrganization,
        switchOrganization,
        canSwitchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
