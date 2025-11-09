import { useEffect, useState } from 'react';
import { profilesAdapter } from '../lib/supabase-adapter';
import { useAuth } from '../contexts/AuthContext';

export type UserRole = 'dealer' | 'operator' | 'support' | 'admin' | 'master' | 'employee' | 'customer';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await profilesAdapter.getById(user.id);

        if (fetchError) {
          console.error('Error fetching user role:', fetchError);
          setError(fetchError);
          setRole(null);
        } else {
          setRole((data?.role as UserRole) || 'customer');
        }
      } catch (err) {
        console.error('Error in useUserRole:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return { role, loading, error };
}
