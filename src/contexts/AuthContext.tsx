import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getConnectionErrorMessage } from '../lib/supabase-health-check';
import { createLogger } from '../lib/logger';
import type { Database } from '../lib/database.types';

const logger = createLogger('[AuthContext]');

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

  const loadingRef = useRef<boolean>(false);
  const lastLoadTimeRef = useRef<number>(0);

  const loadProfile = useCallback(async (userId: string, retryCount = 0) => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      logger.debug('Profile load already in progress, skipping');
      return;
    }

    // Debounce: Don't load if we just loaded within 5 seconds
    const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current;
    if (timeSinceLastLoad < 5000 && retryCount === 0) {
      logger.debug('Debouncing profile load, too soon since last load');
      return;
    }

    loadingRef.current = true;
    lastLoadTimeRef.current = Date.now();

    const maxRetries = 3;
    const baseDelay = 1500;

    try {
      logger.debug(`Loading profile for user ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

      // Clear error on new attempt
      setProfileError(null);

      // Use cache if available and recent (5 minutes)
      if (retryCount === 0) {
        const cachedData = sessionStorage.getItem(`user_data_${userId}`);
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            // Use cache if less than 5 minutes old
            if (Date.now() - parsed.timestamp < 300000 && parsed.profile) {
              logger.debug('Using cached profile data');
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
                // Don't use cache, continue to full load to get stored org
                sessionStorage.removeItem(`user_data_${userId}`);
              } else {
                // Use cached activeOrganization
                setActiveOrganization(parsed.organization);
                setLoading(false);
                loadingRef.current = false;
                return;
              }
            }
          } catch (cacheError) {
            logger.warn('Cache parse error:', cacheError);
            sessionStorage.removeItem(`user_data_${userId}`);
          }
        }
      }

      // Fetch profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        logger.error('Profile query error:', profileError);
        throw new Error(`Database error: ${profileError.message}`);
      }

      // If no profile found, retry with exponential backoff
      if (!profileData) {
        logger.warn(`Profile not found for user ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

        if (retryCount < maxRetries) {
          const exponentialDelay = baseDelay * Math.pow(2, retryCount);
          const jitter = Math.random() * 500;
          const delay = Math.min(exponentialDelay + jitter, 10000);

          logger.debug(`Profile not created yet. Retrying in ${Math.round(delay)}ms...`);
          loadingRef.current = false;
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

      if (profileData.organization_id) {
        logger.debug('Loading organization:', profileData.organization_id);
        const { data: specificOrg, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, type, status')
          .eq('id', profileData.organization_id)
          .maybeSingle();

        if (orgError) {
          logger.error('Organization query error:', orgError);
        } else {
          orgData = specificOrg;
          ownerStatus = specificOrg?.type === 'owner' && profileData.role === 'admin';
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
        supabase.rpc('update_my_last_sign_in').catch(err => {
          logger.debug('Background last_sign_in update failed:', err);
        });
      }

    } catch (error) {
      logger.error('Error loading user data:', error);

      // Determine error type and message using improved error handling
      let errorMessage = 'Une erreur inattendue s\'est produite';

      if (error instanceof Error) {
        if (error.message === 'PROFILE_NOT_FOUND') {
          errorMessage = 'Votre profil n\'a pas pu être créé automatiquement. Veuillez cliquer sur "Réessayer" ou contacter le support.';
        } else if (error.message.includes('permission') || error.message.includes('Permission')) {
          errorMessage = 'Erreur de permission. Les règles de sécurité ont été mises à jour. Veuillez vous déconnecter complètement (Ctrl+Shift+R pour vider le cache) puis vous reconnecter.';
        } else {
          errorMessage = getConnectionErrorMessage(error);
        }
      } else {
        errorMessage = getConnectionErrorMessage(error);
      }

      setProfileError(errorMessage);

      // Retry on error with exponential backoff - but not for permission errors
      if (retryCount < maxRetries && !errorMessage.includes('permission') && !errorMessage.includes('Permission')) {
        const delay = baseDelay * Math.pow(2, retryCount);
        logger.debug(`Retrying after error in ${delay}ms...`);
        loadingRef.current = false;
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadProfile(userId, retryCount + 1);
      }

      // Clear cache on final failure
      sessionStorage.removeItem(`user_data_${userId}`);

    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const retryLoadProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    setProfileError(null);
    sessionStorage.removeItem(`user_data_${user.id}`);

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
      setIsOwner(data.type === 'owner' && profile.role === 'admin');

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
    logger.info('Attempting sign in for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

    // Mettre à jour la dernière connexion
    if (data.user?.id) {
      try {
        await supabase.rpc('update_my_last_sign_in');
        logger.debug('Last sign-in timestamp updated');
      } catch (error) {
        logger.warn('Failed to update last sign-in timestamp:', error);
      }
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
