export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_ORG_ID = '00000000-0000-4000-8000-0000000000ab';

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: 'demo@proremorque.com',
  role: 'master',
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as const;

export const DEMO_PROFILE = {
  id: DEMO_USER_ID,
  full_name: 'Mode Démo',
  email: 'demo@proremorque.com',
  role: 'master' as const,
  organization_id: DEMO_ORG_ID,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  phone: null,
  last_sign_in_at: null,
};

export const DEMO_ORGANIZATION = {
  id: DEMO_ORG_ID,
  name: 'Organisation Démo',
  type: 'owner' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  parent_organization_id: null,
  address: null,
  city: null,
  province: null,
  postal_code: null,
  phone: null,
  email: null,
  tax_number: null,
  notes: null,
};
