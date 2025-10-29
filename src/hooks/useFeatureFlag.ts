import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePersonalization } from '../contexts/PersonalizationContext';
import { useAuth } from '../contexts/AuthContext';

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function useFeatureFlag(flagKey: string): boolean {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { role } = usePersonalization();
  const { user } = useAuth();

  useEffect(() => {
    async function checkFlag() {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('*')
          .eq('flag_key', flagKey)
          .maybeSingle();

        if (error || !data) {
          setEnabled(false);
          setLoading(false);
          return;
        }

        // Check if enabled globally
        if (data.enabled) {
          setEnabled(true);
          setLoading(false);
          return;
        }

        // Check if enabled for user's role
        if (role && data.enabled_for_roles && data.enabled_for_roles.includes(role)) {
          setEnabled(true);
          setLoading(false);
          return;
        }

        // Check if enabled for specific user
        if (user && data.enabled_for_users && data.enabled_for_users.includes(user.id)) {
          setEnabled(true);
          setLoading(false);
          return;
        }

        // Check rollout percentage
        if (data.rollout_percentage > 0 && user) {
          const hash = hashUserId(user.id);
          const userBucket = hash % 100;
          setEnabled(userBucket < data.rollout_percentage);
          setLoading(false);
          return;
        }

        setEnabled(false);
        setLoading(false);
      } catch (err) {
        console.error('Error checking feature flag:', err);
        setEnabled(false);
        setLoading(false);
      }
    }

    checkFlag();
  }, [flagKey, role, user]);

  return enabled;
}

export function useFeatureFlags(flagKeys: string[]): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const { role } = usePersonalization();
  const { user } = useAuth();

  useEffect(() => {
    async function checkFlags() {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('*')
          .in('flag_key', flagKeys);

        if (error || !data) {
          const emptyFlags = flagKeys.reduce((acc, key) => ({ ...acc, [key]: false }), {});
          setFlags(emptyFlags);
          return;
        }

        const results: Record<string, boolean> = {};

        for (const flag of data) {
          let isEnabled = false;

          // Check if enabled globally
          if (flag.enabled) {
            isEnabled = true;
          }
          // Check if enabled for user's role
          else if (role && flag.enabled_for_roles && flag.enabled_for_roles.includes(role)) {
            isEnabled = true;
          }
          // Check if enabled for specific user
          else if (user && flag.enabled_for_users && flag.enabled_for_users.includes(user.id)) {
            isEnabled = true;
          }
          // Check rollout percentage
          else if (flag.rollout_percentage > 0 && user) {
            const hash = hashUserId(user.id);
            const userBucket = hash % 100;
            isEnabled = userBucket < flag.rollout_percentage;
          }

          results[flag.flag_key] = isEnabled;
        }

        // Set false for any missing flags
        flagKeys.forEach(key => {
          if (!(key in results)) {
            results[key] = false;
          }
        });

        setFlags(results);
      } catch (err) {
        console.error('Error checking feature flags:', err);
        const emptyFlags = flagKeys.reduce((acc, key) => ({ ...acc, [key]: false }), {});
        setFlags(emptyFlags);
      }
    }

    checkFlags();
  }, [flagKeys.join(','), role, user]);

  return flags;
}
