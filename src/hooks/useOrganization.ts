/**
 * useOrganization Hook
 *
 * Provides access to organization context.
 * Throws error if used outside OrganizationProvider.
 */

import { useContext } from 'react';
import { OrganizationContext } from '../contexts/OrganizationContext';

export function useOrganization() {
  const context = useContext(OrganizationContext);

  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }

  return context;
}
