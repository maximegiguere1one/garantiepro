/**
 * UI Components V2 - Barrel Export
 *
 * Professional UI component library for Pro-Remorque
 * All components are WCAG 2.1 AA compliant and fully typed
 */

// Buttons
export { PrimaryButton } from './PrimaryButton';
export type { PrimaryButtonProps, PrimaryButtonSize } from './PrimaryButton';

export { SecondaryButton } from './SecondaryButton';
export type { SecondaryButtonProps, SecondaryButtonSize } from './SecondaryButton';

// Form Components
export { EnhancedInputField } from './EnhancedInputField';
export type { EnhancedInputFieldProps } from './EnhancedInputField';

// Layout Components
export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardContent,
  EnhancedCardFooter,
} from './EnhancedCard';
export type {
  EnhancedCardProps,
  EnhancedCardHeaderProps,
  EnhancedCardContentProps,
  EnhancedCardFooterProps,
} from './EnhancedCard';

// Dashboard Components
export { KPICard } from './KPICard';
export type { KPICardProps } from './KPICard';

// Complex Components
export { MultiStepWarrantyForm } from './MultiStepWarrantyForm';
export type { FormStep, MultiStepWarrantyFormProps } from './MultiStepWarrantyForm';

export { ClaimsTimeline } from './ClaimsTimeline';
export type {
  TimelineEvent,
  TimelineEventType,
  ClaimsTimelineProps,
} from './ClaimsTimeline';

// Notification System
export { EnhancedToastProvider, useEnhancedToast } from './EnhancedToast';
export type { Toast, ToastType, ToastAction } from './EnhancedToast';

// Modal Components
export { SignatureModal } from './SignatureModal';
export type { SignatureModalProps, SignatureProof } from './SignatureModal';
