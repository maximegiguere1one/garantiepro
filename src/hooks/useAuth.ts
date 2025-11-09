/**
 * useAuth Hook
 *
 * Provides access to authentication context.
 * Throws error if used outside AuthProvider.
 */

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthProvider';

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
