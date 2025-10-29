import { ErrorCode } from './error-types';

export type Language = 'fr' | 'en';

interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
  helpUrl?: string;
}

const ERROR_MESSAGES: Record<ErrorCode, Record<Language, ErrorMessage>> = {
  [ErrorCode.NETWORK_ERROR]: {
    fr: {
      title: 'Erreur de connexion',
      message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      action: 'Vérifier votre connexion et réessayer',
    },
    en: {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      action: 'Check your connection and try again',
    },
  },
  [ErrorCode.TIMEOUT_ERROR]: {
    fr: {
      title: 'Délai d\'attente dépassé',
      message: 'La requête a pris trop de temps. Le serveur peut être surchargé.',
      action: 'Réessayer dans quelques instants',
    },
    en: {
      title: 'Timeout Error',
      message: 'The request took too long. The server may be overloaded.',
      action: 'Try again in a few moments',
    },
  },
  [ErrorCode.API_ERROR]: {
    fr: {
      title: 'Erreur du serveur',
      message: 'Le serveur a rencontré une erreur lors du traitement de votre requête.',
      action: 'Réessayer ou contacter le support si le problème persiste',
    },
    en: {
      title: 'Server Error',
      message: 'The server encountered an error while processing your request.',
      action: 'Try again or contact support if the problem persists',
    },
  },
  [ErrorCode.VALIDATION_ERROR]: {
    fr: {
      title: 'Erreur de validation',
      message: 'Les données fournies ne sont pas valides. Veuillez vérifier vos informations.',
      action: 'Corriger les erreurs et réessayer',
    },
    en: {
      title: 'Validation Error',
      message: 'The provided data is not valid. Please check your information.',
      action: 'Correct the errors and try again',
    },
  },
  [ErrorCode.AUTH_ERROR]: {
    fr: {
      title: 'Erreur d\'authentification',
      message: 'Votre session a expiré ou vos identifiants sont incorrects.',
      action: 'Se reconnecter',
    },
    en: {
      title: 'Authentication Error',
      message: 'Your session has expired or your credentials are incorrect.',
      action: 'Log in again',
    },
  },
  [ErrorCode.PERMISSION_ERROR]: {
    fr: {
      title: 'Accès refusé',
      message: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
      action: 'Contacter votre administrateur',
    },
    en: {
      title: 'Access Denied',
      message: 'You do not have the necessary permissions to perform this action.',
      action: 'Contact your administrator',
    },
  },
  [ErrorCode.DATABASE_ERROR]: {
    fr: {
      title: 'Erreur de base de données',
      message: 'Une erreur est survenue lors de la communication avec la base de données.',
      action: 'Réessayer dans quelques instants',
    },
    en: {
      title: 'Database Error',
      message: 'An error occurred while communicating with the database.',
      action: 'Try again in a few moments',
    },
  },
  [ErrorCode.INTEGRATION_ERROR]: {
    fr: {
      title: 'Erreur d\'intégration',
      message: 'Une erreur est survenue lors de la communication avec un service externe.',
      action: 'Vérifier la configuration et réessayer',
    },
    en: {
      title: 'Integration Error',
      message: 'An error occurred while communicating with an external service.',
      action: 'Check the configuration and try again',
    },
  },
  [ErrorCode.FILE_UPLOAD_ERROR]: {
    fr: {
      title: 'Erreur de téléchargement',
      message: 'Le fichier n\'a pas pu être téléchargé. Vérifiez le type et la taille du fichier.',
      action: 'Vérifier le fichier et réessayer',
    },
    en: {
      title: 'Upload Error',
      message: 'The file could not be uploaded. Check the file type and size.',
      action: 'Check the file and try again',
    },
  },
  [ErrorCode.PAYMENT_ERROR]: {
    fr: {
      title: 'Erreur de paiement',
      message: 'Le paiement n\'a pas pu être traité. Vérifiez vos informations de paiement.',
      action: 'Vérifier vos informations et réessayer',
    },
    en: {
      title: 'Payment Error',
      message: 'The payment could not be processed. Check your payment information.',
      action: 'Check your information and try again',
    },
  },
  [ErrorCode.NOT_FOUND_ERROR]: {
    fr: {
      title: 'Ressource introuvable',
      message: 'La ressource demandée n\'existe pas ou a été supprimée.',
      action: 'Vérifier l\'URL ou revenir à l\'accueil',
    },
    en: {
      title: 'Not Found',
      message: 'The requested resource does not exist or has been deleted.',
      action: 'Check the URL or return home',
    },
  },
  [ErrorCode.CONFLICT_ERROR]: {
    fr: {
      title: 'Conflit de données',
      message: 'Les données que vous essayez de modifier ont été modifiées par quelqu\'un d\'autre.',
      action: 'Rafraîchir la page et réessayer',
    },
    en: {
      title: 'Data Conflict',
      message: 'The data you are trying to modify has been changed by someone else.',
      action: 'Refresh the page and try again',
    },
  },
  [ErrorCode.RATE_LIMIT_ERROR]: {
    fr: {
      title: 'Trop de requêtes',
      message: 'Vous avez envoyé trop de requêtes. Veuillez patienter avant de réessayer.',
      action: 'Attendre quelques instants',
    },
    en: {
      title: 'Too Many Requests',
      message: 'You have sent too many requests. Please wait before trying again.',
      action: 'Wait a few moments',
    },
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    fr: {
      title: 'Erreur inconnue',
      message: 'Une erreur inattendue s\'est produite.',
      action: 'Réessayer ou contacter le support',
    },
    en: {
      title: 'Unknown Error',
      message: 'An unexpected error occurred.',
      action: 'Try again or contact support',
    },
  },
};

export function getErrorMessage(
  errorCode: ErrorCode,
  language: Language = 'fr'
): ErrorMessage {
  return ERROR_MESSAGES[errorCode]?.[language] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR][language];
}

export function formatErrorMessage(
  errorCode: ErrorCode,
  language: Language = 'fr',
  customMessage?: string
): string {
  const errorMessage = getErrorMessage(errorCode, language);
  return customMessage || errorMessage.message;
}

export function getErrorAction(
  errorCode: ErrorCode,
  language: Language = 'fr'
): string | undefined {
  const errorMessage = getErrorMessage(errorCode, language);
  return errorMessage.action;
}

const FIELD_VALIDATION_MESSAGES: Record<string, Record<Language, string>> = {
  required: {
    fr: 'Ce champ est requis',
    en: 'This field is required',
  },
  email: {
    fr: 'Adresse email invalide',
    en: 'Invalid email address',
  },
  minLength: {
    fr: 'Ce champ doit contenir au moins {min} caractères',
    en: 'This field must contain at least {min} characters',
  },
  maxLength: {
    fr: 'Ce champ ne peut pas contenir plus de {max} caractères',
    en: 'This field cannot contain more than {max} characters',
  },
  min: {
    fr: 'La valeur doit être au moins {min}',
    en: 'The value must be at least {min}',
  },
  max: {
    fr: 'La valeur ne peut pas dépasser {max}',
    en: 'The value cannot exceed {max}',
  },
  pattern: {
    fr: 'Le format est invalide',
    en: 'The format is invalid',
  },
  phone: {
    fr: 'Numéro de téléphone invalide',
    en: 'Invalid phone number',
  },
  postalCode: {
    fr: 'Code postal invalide',
    en: 'Invalid postal code',
  },
  vin: {
    fr: 'NIV invalide (doit contenir 17 caractères)',
    en: 'Invalid VIN (must contain 17 characters)',
  },
  date: {
    fr: 'Date invalide',
    en: 'Invalid date',
  },
  uniqueConstraint: {
    fr: 'Cette valeur existe déjà',
    en: 'This value already exists',
  },
};

export function getValidationMessage(
  validationType: string,
  language: Language = 'fr',
  params?: Record<string, any>
): string {
  let message = FIELD_VALIDATION_MESSAGES[validationType]?.[language] || FIELD_VALIDATION_MESSAGES.required[language];

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });
  }

  return message;
}

const INTEGRATION_ERROR_MESSAGES: Record<string, Record<Language, ErrorMessage>> = {
  quickbooks: {
    fr: {
      title: 'Erreur QuickBooks',
      message: 'Impossible de se connecter à QuickBooks. Vérifiez votre configuration.',
      action: 'Vérifier la connexion QuickBooks dans les paramètres',
      helpUrl: '/settings?tab=integrations',
    },
    en: {
      title: 'QuickBooks Error',
      message: 'Unable to connect to QuickBooks. Check your configuration.',
      action: 'Check QuickBooks connection in settings',
      helpUrl: '/settings?tab=integrations',
    },
  },
  stripe: {
    fr: {
      title: 'Erreur de paiement Stripe',
      message: 'Le paiement n\'a pas pu être traité. Vérifiez vos informations de carte.',
      action: 'Vérifier vos informations de paiement',
    },
    en: {
      title: 'Stripe Payment Error',
      message: 'The payment could not be processed. Check your card information.',
      action: 'Check your payment information',
    },
  },
  email: {
    fr: {
      title: 'Erreur d\'envoi d\'email',
      message: 'L\'email n\'a pas pu être envoyé. Vérifiez la configuration email.',
      action: 'Vérifier la configuration email dans les paramètres',
      helpUrl: '/settings?tab=email',
    },
    en: {
      title: 'Email Sending Error',
      message: 'The email could not be sent. Check the email configuration.',
      action: 'Check email configuration in settings',
      helpUrl: '/settings?tab=email',
    },
  },
  sms: {
    fr: {
      title: 'Erreur d\'envoi de SMS',
      message: 'Le SMS n\'a pas pu être envoyé. Vérifiez la configuration SMS.',
      action: 'Vérifier la configuration SMS dans les paramètres',
    },
    en: {
      title: 'SMS Sending Error',
      message: 'The SMS could not be sent. Check the SMS configuration.',
      action: 'Check SMS configuration in settings',
    },
  },
};

export function getIntegrationErrorMessage(
  integration: string,
  language: Language = 'fr'
): ErrorMessage {
  return INTEGRATION_ERROR_MESSAGES[integration]?.[language] || getErrorMessage(ErrorCode.INTEGRATION_ERROR, language);
}
