export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
  componentStack?: string;
  additionalData?: Record<string, any>;
}

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  userMessageEn?: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  context?: ErrorContext;
  originalError?: Error;
  stack?: string;
  suggestedAction?: string;
  suggestedActionEn?: string;
  helpUrl?: string;
}

export class BaseAppError extends Error implements AppError {
  code: ErrorCode;
  userMessage: string;
  userMessageEn?: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  context?: ErrorContext;
  originalError?: Error;
  suggestedAction?: string;
  suggestedActionEn?: string;
  helpUrl?: string;

  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    options?: {
      userMessageEn?: string;
      severity?: ErrorSeverity;
      recoverable?: boolean;
      retryable?: boolean;
      context?: ErrorContext;
      originalError?: Error;
      suggestedAction?: string;
      suggestedActionEn?: string;
      helpUrl?: string;
    }
  ) {
    super(message);
    this.name = 'BaseAppError';
    this.code = code;
    this.userMessage = userMessage;
    this.userMessageEn = options?.userMessageEn;
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.recoverable = options?.recoverable ?? true;
    this.retryable = options?.retryable ?? false;
    this.context = options?.context;
    this.originalError = options?.originalError;
    this.suggestedAction = options?.suggestedAction;
    this.suggestedActionEn = options?.suggestedActionEn;
    this.helpUrl = options?.helpUrl;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BaseAppError);
    }
  }
}

export class NetworkError extends BaseAppError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(
      ErrorCode.NETWORK_ERROR,
      message,
      'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      {
        userMessageEn: 'Unable to connect to the server. Please check your internet connection.',
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        originalError,
        context,
        suggestedAction: 'Vérifiez votre connexion internet et réessayez.',
        suggestedActionEn: 'Check your internet connection and try again.',
      }
    );
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends BaseAppError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(
      ErrorCode.TIMEOUT_ERROR,
      message,
      "La requête a pris trop de temps. Veuillez réessayer.",
      {
        userMessageEn: 'The request took too long. Please try again.',
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        originalError,
        context,
        suggestedAction: 'Réessayez dans quelques instants.',
        suggestedActionEn: 'Try again in a few moments.',
      }
    );
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends BaseAppError {
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    userMessage: string,
    fieldErrors?: Record<string, string>,
    context?: ErrorContext
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, userMessage, {
      userMessageEn: userMessage,
      severity: ErrorSeverity.LOW,
      recoverable: true,
      retryable: false,
      context,
      suggestedAction: 'Corrigez les erreurs et réessayez.',
      suggestedActionEn: 'Correct the errors and try again.',
    });
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class AuthError extends BaseAppError {
  constructor(message: string, userMessage: string, originalError?: Error, context?: ErrorContext) {
    super(ErrorCode.AUTH_ERROR, message, userMessage, {
      userMessageEn: userMessage,
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      retryable: false,
      originalError,
      context,
      suggestedAction: 'Veuillez vous reconnecter.',
      suggestedActionEn: 'Please log in again.',
    });
    this.name = 'AuthError';
  }
}

export class PermissionError extends BaseAppError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(
      ErrorCode.PERMISSION_ERROR,
      message,
      "Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
      {
        userMessageEn: 'You do not have the necessary permissions to perform this action.',
        severity: ErrorSeverity.MEDIUM,
        recoverable: false,
        retryable: false,
        originalError,
        context,
        suggestedAction: 'Contactez votre administrateur pour obtenir les permissions nécessaires.',
        suggestedActionEn: 'Contact your administrator to obtain the necessary permissions.',
      }
    );
    this.name = 'PermissionError';
  }
}

export class DatabaseError extends BaseAppError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(
      ErrorCode.DATABASE_ERROR,
      message,
      'Une erreur est survenue lors de la communication avec la base de données.',
      {
        userMessageEn: 'An error occurred while communicating with the database.',
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        originalError,
        context,
        suggestedAction: 'Réessayez dans quelques instants.',
        suggestedActionEn: 'Try again in a few moments.',
      }
    );
    this.name = 'DatabaseError';
  }
}

export class IntegrationError extends BaseAppError {
  integrationName: string;

  constructor(
    integrationName: string,
    message: string,
    userMessage: string,
    originalError?: Error,
    context?: ErrorContext
  ) {
    super(ErrorCode.INTEGRATION_ERROR, message, userMessage, {
      userMessageEn: userMessage,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: true,
      originalError,
      context,
      suggestedAction: `Vérifiez la configuration de ${integrationName} et réessayez.`,
      suggestedActionEn: `Check the ${integrationName} configuration and try again.`,
    });
    this.name = 'IntegrationError';
    this.integrationName = integrationName;
  }
}

export class PaymentError extends BaseAppError {
  constructor(message: string, userMessage: string, originalError?: Error, context?: ErrorContext) {
    super(ErrorCode.PAYMENT_ERROR, message, userMessage, {
      userMessageEn: userMessage,
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      retryable: false,
      originalError,
      context,
      suggestedAction: 'Vérifiez vos informations de paiement et réessayez.',
      suggestedActionEn: 'Check your payment information and try again.',
    });
    this.name = 'PaymentError';
  }
}

export class RateLimitError extends BaseAppError {
  retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: ErrorContext) {
    super(
      ErrorCode.RATE_LIMIT_ERROR,
      message,
      'Trop de requêtes ont été envoyées. Veuillez patienter avant de réessayer.',
      {
        userMessageEn: 'Too many requests have been sent. Please wait before trying again.',
        severity: ErrorSeverity.LOW,
        recoverable: true,
        retryable: true,
        context,
        suggestedAction: retryAfter
          ? `Attendez ${retryAfter} secondes avant de réessayer.`
          : 'Attendez quelques instants avant de réessayer.',
        suggestedActionEn: retryAfter
          ? `Wait ${retryAfter} seconds before trying again.`
          : 'Wait a few moments before trying again.',
      }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class FileUploadError extends BaseAppError {
  constructor(message: string, userMessage: string, originalError?: Error, context?: ErrorContext) {
    super(ErrorCode.FILE_UPLOAD_ERROR, message, userMessage, {
      userMessageEn: userMessage,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: true,
      originalError,
      context,
      suggestedAction: 'Vérifiez le fichier et réessayez.',
      suggestedActionEn: 'Check the file and try again.',
    });
    this.name = 'FileUploadError';
  }
}

export function isAppError(error: any): error is BaseAppError {
  return error instanceof BaseAppError;
}

export function createErrorContext(additionalData?: Record<string, any>): ErrorContext {
  return {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    additionalData,
  };
}

export function parseSupabaseError(error: any): BaseAppError {
  const context = createErrorContext({ supabaseError: error });

  if (error.message?.includes('JWT')) {
    return new AuthError(
      error.message,
      'Votre session a expiré. Veuillez vous reconnecter.',
      error,
      context
    );
  }

  if (error.code === '23505') {
    return new DatabaseError(
      'Unique constraint violation',
      error,
      { ...context, additionalData: { ...context.additionalData, code: error.code } }
    );
  }

  if (error.code === '23503') {
    return new DatabaseError(
      'Foreign key constraint violation',
      error,
      { ...context, additionalData: { ...context.additionalData, code: error.code } }
    );
  }

  if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
    return new PermissionError(error.message, error, context);
  }

  return new DatabaseError(error.message || 'Database error', error, context);
}

export function parseNetworkError(error: any): BaseAppError {
  const context = createErrorContext({ networkError: error });

  if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
    return new TimeoutError(error.message || 'Request timeout', error, context);
  }

  if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
    return new NetworkError(error.message || 'Network error', error, context);
  }

  return new NetworkError(error.message || 'Unknown network error', error, context);
}
