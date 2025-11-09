/**
 * Data Layer Types
 *
 * Defines interfaces for data access across production and demo modes.
 * Uses Repository pattern for clean separation of concerns.
 */

export interface User {
  id: string;
  email: string;
  role?: string;
  aud?: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  role: 'master' | 'owner' | 'admin' | 'franchisee_admin' | 'employee';
  organization_id: string;
  phone?: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  type: 'owner' | 'franchisee';
  status: 'active' | 'inactive';
  parent_organization_id?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  tax_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type: string;
  user: User;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: Error | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  full_name?: string;
  role?: Profile['role'];
}

/**
 * Profile Repository Interface
 * Handles all profile-related data operations
 */
export interface ProfileRepo {
  /**
   * Get profile by user ID
   */
  getProfile(userId: string): Promise<Profile | null>;

  /**
   * Update profile
   */
  updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile>;

  /**
   * Create profile (usually called during signup)
   */
  createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile>;
}

/**
 * Organization Repository Interface
 * Handles all organization-related data operations
 */
export interface OrgRepo {
  /**
   * Get organization by ID
   */
  getOrg(orgId: string): Promise<Organization | null>;

  /**
   * Get all organizations (master only)
   */
  getAllOrgs(): Promise<Organization[]>;

  /**
   * Get organizations by parent ID (for franchisees)
   */
  getOrgsByParent(parentId: string): Promise<Organization[]>;

  /**
   * Create organization
   */
  createOrg(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization>;

  /**
   * Update organization
   */
  updateOrg(orgId: string, updates: Partial<Organization>): Promise<Organization>;
}

/**
 * Auth Repository Interface
 * Handles authentication operations
 */
export interface AuthRepo {
  /**
   * Sign in with email and password
   */
  signIn(credentials: SignInCredentials): Promise<AuthResponse>;

  /**
   * Sign up new user
   */
  signUp(credentials: SignUpCredentials): Promise<AuthResponse>;

  /**
   * Sign out current user
   */
  signOut(): Promise<void>;

  /**
   * Get current session
   */
  getSession(): Promise<{ session: Session | null; error?: Error | null }>;

  /**
   * Refresh session
   */
  refreshSession(): Promise<{ session: Session | null; error?: Error | null }>;

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

/**
 * Main Data Client Interface
 * Aggregates all repositories
 */
export interface DataClient {
  auth: AuthRepo;
  profiles: ProfileRepo;
  orgs: OrgRepo;
}
