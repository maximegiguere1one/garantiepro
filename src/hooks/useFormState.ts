import { useState, useEffect, useCallback } from 'react';

interface UseFormStateOptions<T> {
  initialValues: T;
  storageKey?: string;
  autoSaveInterval?: number;
  onAutoSave?: (values: T) => void | Promise<void>;
}

export function useFormState<T extends Record<string, any>>({
  initialValues,
  storageKey,
  autoSaveInterval = 30000,
  onAutoSave,
}: UseFormStateOptions<T>) {
  const [values, setValues] = useState<T>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return { ...initialValues, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Failed to parse saved form data:', e);
        }
      }
    }
    return initialValues;
  });

  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (storageKey && isDirty) {
      localStorage.setItem(storageKey, JSON.stringify(values));
    }
  }, [values, storageKey, isDirty]);

  useEffect(() => {
    if (!onAutoSave || !isDirty) return;

    const interval = setInterval(async () => {
      await onAutoSave(values);
      setLastSaved(new Date());
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [values, isDirty, autoSaveInterval, onAutoSave]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const setMultipleValues = useCallback((updates: Partial<T>) => {
    setValues(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setIsDirty(false);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [initialValues, storageKey]);

  const clearStorage = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setIsDirty(false);
  }, [storageKey]);

  return {
    values,
    setValue,
    setMultipleValues,
    setValues,
    reset,
    clearStorage,
    isDirty,
    lastSaved,
  };
}
