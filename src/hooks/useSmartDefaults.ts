import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SmartDefault {
  field: string;
  value: any;
  source: 'user_preference' | 'organization_default' | 'recent_value' | 'calculated';
}

export function useSmartDefaults(formType: string) {
  const { profile } = useAuth();
  const [defaults, setDefaults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSmartDefaults();
  }, [formType, profile?.id]);

  const loadSmartDefaults = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const defaultValues: Record<string, any> = {};

      if (formType === 'warranty') {
        defaultValues.province = profile.organization?.province || 'QC';
        defaultValues.languagePreference = 'fr';
        defaultValues.purchaseDate = new Date().toISOString().split('T')[0];
        defaultValues.year = new Date().getFullYear();

        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        defaultValues.manufacturerWarrantyEndDate = oneYearFromNow.toISOString().split('T')[0];
      }

      if (formType === 'claim') {
        defaultValues.incident_date = new Date().toISOString().split('T')[0];
      }

      const userPrefs = localStorage.getItem(`form_defaults_${profile.id}_${formType}`);
      if (userPrefs) {
        try {
          const prefs = JSON.parse(userPrefs);
          Object.assign(defaultValues, prefs);
        } catch (e) {
          console.error('Failed to parse user preferences:', e);
        }
      }

      setDefaults(defaultValues);
    } catch (error) {
      console.error('Error loading smart defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreference = (field: string, value: any) => {
    if (!profile?.id) return;

    const key = `form_defaults_${profile.id}_${formType}`;
    const existing = localStorage.getItem(key);
    const prefs = existing ? JSON.parse(existing) : {};
    prefs[field] = value;
    localStorage.setItem(key, JSON.stringify(prefs));
  };

  return { defaults, loading, savePreference };
}
