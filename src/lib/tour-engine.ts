import Shepherd from 'shepherd.js';
import { supabase } from './supabase';
import { UserRole } from '../hooks/useUserRole';
import inAppGuides from '../../personalization/in-app-guides-complete.json';

interface TourStep {
  stepId: string;
  selector: string;
  title: { en: string; fr: string };
  body: { en: string; fr: string };
  placement?: string;
  action?: string;
}

interface TourConfig {
  tourId: string;
  priority: number;
  roles: string[];
  conditionType: string;
  dismissible: boolean;
  steps: TourStep[];
}

export class TourEngine {
  private tour: Shepherd.Tour | null = null;
  private currentTourId: string | null = null;
  private userRole: UserRole;
  private locale: 'en' | 'fr';
  private userId: string;

  constructor(userRole: UserRole, userId: string, locale: 'en' | 'fr' = 'fr') {
    this.userRole = userRole;
    this.userId = userId;
    this.locale = locale;
  }

  async startTour(tourId: string): Promise<void> {
    const tours = inAppGuides.tours as Record<string, TourConfig>;
    const tourConfig = tours[tourId];

    if (!tourConfig) {
      console.error(`Tour ${tourId} not found`);
      return;
    }

    // Check role permission
    if (!tourConfig.roles.includes(this.userRole)) {
      console.warn(`Tour ${tourId} not available for role ${this.userRole}`);
      return;
    }

    // Check if already completed
    const hasCompleted = await this.hasCompletedTour(tourId);
    if (hasCompleted) {
      console.log(`Tour ${tourId} already completed`);
      return;
    }

    // Track tour start
    await this.trackTourStart(tourId, tourConfig.steps.length);

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: tourConfig.dismissible,
        },
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' },
      },
    });

    // Add steps
    tourConfig.steps.forEach((step, index) => {
      const element = document.querySelector(step.selector);

      // Skip step if element doesn't exist
      if (!element) {
        console.warn(`Element not found for tour step: ${step.selector}`);
        return;
      }

      this.tour!.addStep({
        id: step.stepId,
        text: step.body[this.locale],
        title: step.title[this.locale],
        attachTo: {
          element: step.selector,
          on: (step.placement as any) || 'bottom',
        },
        buttons: this.getStepButtons(index, tourConfig.steps.length, tourConfig.dismissible),
        when: {
          show: () => {
            this.trackStepView(tourId, step.stepId, index + 1);
          },
        },
      });
    });

    // Event handlers
    this.tour.on('complete', () => this.handleTourComplete(tourId));
    this.tour.on('cancel', () => this.handleTourCancel(tourId));

    this.currentTourId = tourId;
    this.tour.start();
  }

  private getStepButtons(index: number, total: number, dismissible: boolean) {
    const buttons: any[] = [];

    // Skip button (if dismissible)
    if (dismissible && index === 0) {
      buttons.push({
        text: this.locale === 'fr' ? 'Passer' : 'Skip',
        action: () => this.tour?.cancel(),
        classes: 'shepherd-button-secondary',
      });
    }

    // Previous button
    if (index > 0) {
      buttons.push({
        text: this.locale === 'fr' ? 'Précédent' : 'Previous',
        action: () => this.tour?.back(),
        classes: 'shepherd-button-secondary',
      });
    }

    // Next/Finish button
    if (index < total - 1) {
      buttons.push({
        text: this.locale === 'fr' ? 'Suivant' : 'Next',
        action: () => this.tour?.next(),
        classes: 'shepherd-button-primary',
      });
    } else {
      buttons.push({
        text: this.locale === 'fr' ? 'Terminer' : 'Finish',
        action: () => this.tour?.complete(),
        classes: 'shepherd-button-primary',
      });
    }

    return buttons;
  }

  private async hasCompletedTour(tourId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tour_progress')
        .select('completed')
        .eq('user_id', this.userId)
        .eq('tour_id', tourId)
        .maybeSingle();

      if (error) {
        console.error('Error checking tour completion:', error);
        return false;
      }

      return data?.completed === true;
    } catch (err) {
      console.error('Error in hasCompletedTour:', err);
      return false;
    }
  }

  private async trackTourStart(tourId: string, totalSteps: number): Promise<void> {
    try {
      await supabase.from('tour_progress').upsert({
        user_id: this.userId,
        tour_id: tourId,
        started_at: new Date().toISOString(),
        total_steps: totalSteps,
        steps_completed: 0,
        completed: false,
      }, {
        onConflict: 'user_id,tour_id',
      });

      this.trackEvent('tour:started', { tourId, totalSteps });
    } catch (err) {
      console.error('Error tracking tour start:', err);
    }
  }

  private async trackStepView(tourId: string, stepId: string, stepNumber: number): Promise<void> {
    try {
      await supabase
        .from('tour_progress')
        .update({
          current_step_id: stepId,
          steps_completed: stepNumber,
        })
        .eq('user_id', this.userId)
        .eq('tour_id', tourId);

      this.trackEvent('tour:step_viewed', { tourId, stepId, stepNumber });
    } catch (err) {
      console.error('Error tracking step view:', err);
    }
  }

  private async handleTourComplete(tourId: string): Promise<void> {
    try {
      await supabase
        .from('tour_progress')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId)
        .eq('tour_id', tourId);

      this.trackEvent('tour:completed', { tourId });

      // Store in localStorage as backup
      localStorage.setItem(`tour_completed_${tourId}`, 'true');
    } catch (err) {
      console.error('Error tracking tour complete:', err);
    }
  }

  private async handleTourCancel(tourId: string): Promise<void> {
    try {
      await supabase
        .from('tour_progress')
        .update({
          skipped_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId)
        .eq('tour_id', tourId);

      this.trackEvent('tour:skipped', { tourId });
    } catch (err) {
      console.error('Error tracking tour cancel:', err);
    }
  }

  private trackEvent(eventName: string, properties: Record<string, any>): void {
    // Track to analytics if available
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(eventName, {
        ...properties,
        userId: this.userId,
        userRole: this.userRole,
        locale: this.locale,
        timestamp: new Date().toISOString(),
      });
    }

    console.log('Tour Event:', eventName, properties);
  }

  public cleanup(): void {
    if (this.tour) {
      this.tour.complete();
      this.tour = null;
      this.currentTourId = null;
    }
  }
}
