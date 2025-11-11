import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getConnectionErrorMessage } from '../lib/supabase-health-check';
import { createLogger } from '../lib/logger';
import { supabaseCache } from '../lib/supabase-cache';
import { getOptimalTimeouts, getEnvironmentType, shouldUseAggressiveCaching } from '../lib/environment-detection';
import type { Database } from '../lib/database.types';
import { DEMO_USER_ID, DEMO_ORG_ID, DEMO_USER, DEMO_PROFILE, DEMO_ORGANIZATION } from '../lib/demo-constants';
import { profileService } from '../services/profileService';

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
  isOwner: boolean;
  profileError: string | null;
  loadingTimedOut: boolean;
  profileLoadAttempted: boolean;
  showContinueOption: boolean;
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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [canSwitchOrganization, setCanSwitchOrganization] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false);

  const loadingRef = useRef<boolean>(false);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const continueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showContinueOption, setShowContinueOption] = useState(false);

  const clearAllTimeouts = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }
    if (continueTimeoutRef.current) {
      clearTimeout(continueTimeoutRef.current);
      continueTimeoutRef.current = null;
    }
  }, []);

  const abortCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[AuthContext] Aborting current request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const resetLoadingState = useCallback(() => {
    console.log('[AuthContext] Resetting loading state');
    clearAllTimeouts();
    abortCurrentRequest();
    loadingRef.current = false;
    loadingPromiseRef.current = null;
    setLoading(false);
    setLoadingTimedOut(false);
    setShowContinueOption(false);
  }, [clearAllTimeouts, abortCurrentRequest]);

  const loadProfile = useCallback(async (userId: string, retryCount = 0, isAuthenticationEvent = false) => {
    console.log('[AuthContext] loadProfile called for userId:', userId, 'retryCount:', retryCount, 'isAuthEvent:', isAuthenticationEvent);

    const timeouts = getTimeouts();
    const envType = getEnvironmentType();
    const useAggressiveCache = shouldUseAggressiveCaching();

    // If already loading, wait for the existing promise during authentication events
    if (loadingRef.current && loadingPromiseRef.current) {
      if (isAuthenticationEvent) {
        console.log('[AuthContext] ⏳ Auth event - waiting for in-progress load to complete...');
        try {
          await loadingPromiseRef.current;
          console.log('[AuthContext] ✓ In-progress load completed');
          return;
        } catch (error) {
          console.error('[AuthContext] In-progress load failed, continuing with new attempt:', error);
        }
      } else {
        console.warn('[AuthContext] ⚠️ Profile load already in progress, skipping!');
        logger.debug('Profile load already in progress, skipping');
        return;
      }
    }
    console.log('[AuthContext] ✓ No concurrent load, proceeding...');

    // Create a promise that tracks this load operation
    const loadOperation = (async () => {
      try {
        // Clear any existing timeouts and abort ongoing requests
        clearAllTimeouts();
        abortCurrentRequest();

        // Skip debounce check for authentication events and retries
        if (!isAuthenticationEvent && retryCount === 0) {
          const debounceTime = envType === 'bolt' ? 1000 : 2000;
          const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current;
          console.log('[AuthContext] Debounce check:', timeSinceLastLoad, 'ms since last load, threshold:', debounceTime);
          if (timeSinceLastLoad < debounceTime) {
            console.warn('[AuthContext] ⚠️ Debouncing - too soon since last load!');
            logger.debug(`Debouncing profile load (${debounceTime}ms), too soon since last load`);
            return;
          }
        } else {
          console.log('[AuthContext] ✓ Skipping debounce (auth event or retry)');
        }

        // Reset state for new load
        loadingRef.current = true;
        lastLoadTimeRef.current = Date.now();
        setLoadingTimedOut(false);
        setProfileLoadAttempted(true);
        setShowContinueOption(false);
        setProfileError(null);

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        // Set up timeouts
        // 1. Show "Continue Anyway" option early
        continueTimeoutRef.current = setTimeout(() => {
          console.log('[AuthContext] Showing continue option after', timeouts.continueAnywayTimeout, 'ms');
          setShowContinueOption(true);
        }, timeouts.continueAnywayTimeout);

        // 2. Show warning message
        warningTimeoutRef.current = setTimeout(() => {
          if (loadingRef.current) {
            logger.warn(`Loading warning after ${timeouts.warningTimeout / 1000} seconds`);
            setProfileError('La connexion prend plus de temps que prévu. Vous pouvez continuer quand même.');
          }
        }, timeouts.warningTimeout);

        // 3. Emergency timeout - force stop
        emergencyTimeoutRef.current = setTimeout(() => {
          if (loadingRef.current) {
            logger.error('EMERGENCY TIMEOUT - Force stopping loading');
            abortCurrentRequest();
            setLoading(false);
            setLoadingTimedOut(true);
            loadingRef.current = false;
            if (envType === 'bolt' || envType === 'webcontainer') {
              setProfileError('Environnement Bolt détecté. Connexion limitée. Cliquez "Continuer quand même".');
            } else {
              setProfileError('La connexion a pris trop de temps. Cliquez "Continuer quand même" ci-dessous.');
            }
          }
        }, timeouts.emergencyTimeout);

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
      console.log('[AuthContext] About to fetch profile for user:', userId);

      // Check if aborted before making request
      if (abortControllerRef.current?.signal.aborted) {
        logger.info('Profile load aborted before RPC call');
        return;
      }

      // Direct RPC call - simpler and more reliable
      console.log('[AuthContext] Calling get_my_profile RPC');
      let profileData;
      let profileError;

      try {
        const { data, error } = await supabase
          .rpc('get_my_profile')
          .maybeSingle();

        profileData = data;
        profileError = error;

        console.log('[AuthContext] RPC result:', {
          hasData: !!data,
          hasError: !!error,
          errorMessage: error?.message
        });
      } catch (err: any) {
        console.error('[AuthContext] RPC exception:', err);
        if (err?.name === 'AbortError' || (err?.message && err.message.toLowerCase().includes('aborted'))) {
          logger.warn('Profile fetch aborted due to timeout');
          throw new Error('FETCH_TIMEOUT');
        }
        throw err;
      }

      if (profileError) {
        logger.error('Profile query error:', profileError);
        throw profileError;
      }

      if (!profileData) {
        logger.warn(`Profile not found for user ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

        if (retryCount < maxRetries && !abortControllerRef.current?.signal.aborted) {
          // Exponential backoff with jitter starting at 500ms
          const exponentialDelay = baseDelay * Math.pow(2, retryCount);
          const jitter = Math.random() * 200;
          const delay = Math.min(exponentialDelay + jitter, 3000); // Cap at 3s

          logger.debug(`Profile not created yet. Retrying in ${Math.round(delay)}ms...`);

          // Don't fully reset loading state, just clear current promise
          loadingPromiseRef.current = null;

          await new Promise(resolve => setTimeout(resolve, delay));

          // Check again if aborted during delay
          if (!abortControllerRef.current?.signal.aborted) {
            return loadProfile(userId, retryCount + 1);
          } else {
            logger.info('Profile load aborted during retry delay');
            return;
          }
        } else {
          logger.error('Max retries reached, profile still not found');
          throw new Error('PROFILE_NOT_FOUND');
        }
      }

      logger.debug('Profile loaded successfully:', profileData.email);

      // Load organization if profile has organization_id
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
          logger.debug('Organization loaded:', specificOrg?.name);
        }
      }

      // Master users are ALWAYS considered owners, admins need to be in 'owner' org
      ownerStatus = profileData.role === 'master' || (orgData?.type === 'owner' && profileData.role === 'admin');

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

      // Set profile data in state BEFORE clearing loading flags
      setProfile(profileData);
      setOrganization(orgData);
      setIsOwner(ownerStatus);
      setProfileError(null);

      // Small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 50));

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
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 200;
        const delay = Math.min(exponentialDelay + jitter, 3000);
        logger.debug(`Retrying after error in ${Math.round(delay)}ms...`);

        loadingPromiseRef.current = null;
        await new Promise(resolve => setTimeout(resolve, delay));

        if (!abortControllerRef.current?.signal.aborted) {
          return loadProfile(userId, retryCount + 1);
        } else {
          logger.info('Profile load aborted during error retry delay');
          return;
        }
      }

      // Clear cache on final failure
        sessionStorage.removeItem(`user_data_${userId}`);

      } finally {
        console.log('[AuthContext] FINALLY block - resetting loading states');

        // Clear all timeouts to prevent them from firing after completion
        clearAllTimeouts();
        console.log('[AuthContext] All timeouts cleared');

        // Small delay to ensure state updates propagate
        await new Promise(resolve => setTimeout(resolve, 50));

        // Reset loading state
        setLoading(false);
        loadingRef.current = false;
        loadingPromiseRef.current = null;

        console.log('[AuthContext] Loading state reset complete');
      }
    } catch (outerError) {
      console.error('[AuthContext] ❌ OUTER CATCH - Unexpected error in loadProfile:', outerError);
      loadingRef.current = false;
      loadingPromiseRef.current = null;
      setLoading(false);
    }
    })();

    // Store the promise so concurrent calls can wait for it
    loadingPromiseRef.current = loadOperation;
    await loadOperation;
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const envType = getEnvironmentType();
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
          clearAllTimeouts();
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
        clearAllTimeouts();
      }
    };

    initAuth();

    return () => {
      mounted = false;
      clearAllTimeouts();
      abortCurrentRequest();
    };

  }, []);

  // Separate effect for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      logger.info('Auth state changed:', _event);
      console.log('[AuthContext] onAuthStateChange - event:', _event, 'has user:', !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);

      // Only load profile for non-INITIAL_SESSION events
      // INITIAL_SESSION is already handled by the initAuth() useEffect
      if (session?.user && _event !== 'INITIAL_SESSION') {
        console.log('[AuthContext] User exists (non-initial), calling loadProfile for:', session.user.id);
        // Mark as authentication event so it can wait for in-progress loads
        await loadProfile(session.user.id, 0, true);
      } else if (session?.user && _event === 'INITIAL_SESSION') {
        console.log('[AuthContext] INITIAL_SESSION - profile loading handled by initAuth, skipping');
      } else if (!session?.user) {
        console.log('[AuthContext] No user, clearing profile');
        setProfile(null);
        setOrganization(null);
        setActiveOrganization(null);
        setProfileLoadAttempted(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      abortCurrentRequest();
    };
  }, [loadProfile, abortCurrentRequest]);

  const forceSkipLoading = useCallback(() => {
    logger.info('Force skipping loading state (Continue Anyway clicked)');
    resetLoadingState();
    setProfileError(null);
  }, [resetLoadingState]);

  const retryLoadProfile = async () => {
    if (!user?.id) return;

    logger.info('Retry requested - clearing cache and reloading');

    // Full reset
    resetLoadingState();
    profileService.clearCache();
    sessionStorage.removeItem(`user_data_${user.id}`);

    // Start fresh load
    setLoading(true);
    setProfileError(null);

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
        isOwner,
        profileError,
        loadingTimedOut,
        profileLoadAttempted,
        showContinueOption,
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
