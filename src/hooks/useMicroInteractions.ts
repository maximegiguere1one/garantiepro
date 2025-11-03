import { useEffect, useCallback } from 'react';
import { microInteractions, injectAnimations } from '../lib/micro-interactions';

interface UseMicroInteractionsOptions {
  enableHaptics?: boolean;
  enableSounds?: boolean;
  enableAnimations?: boolean;
}

export function useMicroInteractions(options: UseMicroInteractionsOptions = {}) {
  const {
    enableHaptics = true,
    enableSounds = true,
    enableAnimations = true,
  } = options;

  useEffect(() => {
    if (enableAnimations) {
      injectAnimations();
    }
  }, [enableAnimations]);

  const playHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
      if (enableHaptics) {
        microInteractions.haptic[type]();
      }
    },
    [enableHaptics]
  );

  const playSound = useCallback(
    (type: 'click' | 'pop' | 'success') => {
      if (enableSounds) {
        microInteractions.sound[type]();
      }
    },
    [enableSounds]
  );

  const showConfetti = useCallback(
    (count = 50) => {
      if (enableAnimations) {
        microInteractions.interactive.confetti(count);
      }
    },
    [enableAnimations]
  );

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      microInteractions.interactive.toast(message, type);
    },
    []
  );

  const celebrateSuccess = useCallback(() => {
    if (enableHaptics) microInteractions.haptic.success();
    if (enableSounds) microInteractions.sound.success();
    if (enableAnimations) microInteractions.interactive.confetti(30);
  }, [enableHaptics, enableSounds, enableAnimations]);

  const celebrateAchievement = useCallback(
    (badge: string) => {
      microInteractions.celebrate.achievement(badge);
    },
    []
  );

  const celebrateMilestone = useCallback(
    (title: string, description: string) => {
      microInteractions.celebrate.milestone(title, description);
    },
    []
  );

  const handleButtonPress = useCallback(
    (element: HTMLElement) => {
      microInteractions.feedback.buttonPress(element);
    },
    []
  );

  const handleFormSuccess = useCallback(
    (message: string) => {
      microInteractions.feedback.formSuccess(message);
    },
    []
  );

  const handleFormError = useCallback(
    (message: string) => {
      microInteractions.feedback.formError(message);
    },
    []
  );

  const handleProgressUpdate = useCallback(
    (percentage: number) => {
      microInteractions.feedback.progressUpdate(percentage);
    },
    []
  );

  const ripple = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (enableAnimations) {
        microInteractions.interactive.ripple(event);
      }
    },
    [enableAnimations]
  );

  return {
    playHaptic,
    playSound,
    showConfetti,
    showToast,
    celebrateSuccess,
    celebrateAchievement,
    celebrateMilestone,
    handleButtonPress,
    handleFormSuccess,
    handleFormError,
    handleProgressUpdate,
    ripple,
    animations: microInteractions.animations,
    transitions: microInteractions.transitions,
    hover: microInteractions.hover,
    focus: microInteractions.focus,
    loading: microInteractions.loading,
  };
}

export function useProgressCelebration(
  progress: number,
  previousProgress: number
) {
  const { celebrateSuccess, playHaptic, playSound } = useMicroInteractions();

  useEffect(() => {
    const milestones = [25, 50, 75, 100];

    milestones.forEach((milestone) => {
      if (previousProgress < milestone && progress >= milestone) {
        if (milestone === 100) {
          celebrateSuccess();
        } else {
          playHaptic('light');
          playSound('pop');
        }
      }
    });
  }, [progress, previousProgress, celebrateSuccess, playHaptic, playSound]);
}

export function useOnboardingCelebrations(completedSteps: {
  [key: string]: boolean;
}) {
  const { celebrateAchievement } = useMicroInteractions();

  useEffect(() => {
    const achievements: { [key: string]: string } = {
      has_completed_profile: 'Profil Complété',
      has_created_first_warranty: 'Première Garantie Créée',
      has_viewed_dashboard: 'Tableau de Bord Découvert',
      has_explored_settings: 'Paramètres Explorés',
      has_created_customer: 'Premier Client Ajouté',
      has_used_search: 'Recherche Utilisée',
      has_viewed_analytics: 'Analytics Consulté',
      has_completed_tour: 'Tour Guidé Terminé',
    };

    Object.entries(completedSteps).forEach(([key, completed]) => {
      if (completed && achievements[key]) {
        const wasAlreadyCompleted = localStorage.getItem(`achievement_${key}`);
        if (!wasAlreadyCompleted) {
          celebrateAchievement(achievements[key]);
          localStorage.setItem(`achievement_${key}`, 'true');
        }
      }
    });
  }, [completedSteps, celebrateAchievement]);
}
