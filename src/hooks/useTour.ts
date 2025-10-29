import { useEffect, useMemo, useCallback } from 'react';
import { TourEngine } from '../lib/tour-engine';
import { usePersonalization } from '../contexts/PersonalizationContext';
import { useTranslation } from './useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlag } from './useFeatureFlag';

export function useTour() {
  const { role } = usePersonalization();
  const { locale } = useTranslation();
  const { user } = useAuth();
  const toursEnabled = useFeatureFlag('product_tours_enabled');

  const tourEngine = useMemo(() => {
    if (!role || !user || !toursEnabled) return null;
    return new TourEngine(role, user.id, locale as 'en' | 'fr');
  }, [role, user, locale, toursEnabled]);

  const startTour = useCallback((tourId: string) => {
    if (!tourEngine) {
      console.warn('Tour engine not initialized');
      return;
    }
    tourEngine.startTour(tourId);
  }, [tourEngine]);

  // Auto-start welcome tour on first visit
  useEffect(() => {
    if (!tourEngine || !role) return;

    const checkAndStartWelcomeTour = async () => {
      // Check localStorage first for quick check
      const hasSeenWelcome = localStorage.getItem(`tour_completed_welcome_${role}`);

      if (!hasSeenWelcome) {
        // Small delay to ensure page is fully rendered
        setTimeout(() => {
          const welcomeTourId = `welcome_${role}`;
          tourEngine.startTour(welcomeTourId);
        }, 1000);
      }
    };

    checkAndStartWelcomeTour();

    // Cleanup on unmount
    return () => {
      tourEngine.cleanup();
    };
  }, [tourEngine, role]);

  return { startTour, tourEngine };
}
