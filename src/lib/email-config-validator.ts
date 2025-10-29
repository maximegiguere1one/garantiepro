import { supabase } from './supabase';

export interface EmailConfigStatus {
  configured: boolean;
  healthy: boolean;
  fromEmail?: string;
  fromName?: string;
  errors: string[];
  warnings: string[];
  lastChecked: Date;
  errorCode?: string;
  suggestedAction?: string;
  helpUrl?: string;
}

export async function checkEmailConfiguration(): Promise<EmailConfigStatus> {
  const status: EmailConfigStatus = {
    configured: false,
    healthy: false,
    errors: [],
    warnings: [],
    lastChecked: new Date(),
  };

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { checkConfigOnly: true },
    });

    if (error) {
      status.errors.push(error.message || 'Impossible de vérifier la configuration');

      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          if (errorBody.errorCode === 'CONFIG_MISSING') {
            status.errorCode = errorBody.errorCode;
            status.suggestedAction = errorBody.suggestedAction;
            status.helpUrl = errorBody.helpUrl;
          }
        } catch (e) {
        }
      }

      return status;
    }

    if (data && data.success === false) {
      status.configured = false;
      status.errors.push(data.userMessage || data.error || 'Configuration manquante');
      status.errorCode = data.errorCode;
      status.suggestedAction = data.suggestedAction;
      status.helpUrl = data.helpUrl;
      return status;
    }

    if (data && data.configured) {
      status.configured = true;
      status.healthy = true;
      status.fromEmail = data.fromEmail;
      status.fromName = data.fromName;

      if (data.fromEmail && data.fromEmail.includes('resend.dev')) {
        status.warnings.push(
          'Vous utilisez un domaine de test (resend.dev). Pour la production, configurez votre propre domaine.'
        );
      }

      if (data.fromEmail && !data.fromEmail.includes('locationproremorque.ca')) {
        status.warnings.push(
          'Le domaine email ne correspond pas à votre domaine principal. Assurez-vous qu\'il est vérifié dans Resend.'
        );
      }

      return status;
    }

    status.errors.push('Réponse inattendue du serveur');
    return status;

  } catch (error: any) {
    status.errors.push(
      error.message || 'Erreur lors de la vérification de la configuration'
    );
    return status;
  }
}

export async function testEmailSending(testEmail: string): Promise<{
  success: boolean;
  error?: string;
  emailId?: string;
  errorCode?: string;
  userMessage?: string;
  suggestedAction?: string;
  helpUrl?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: testEmail,
        subject: 'Test Email - Pro-Remorque',
        body: 'Ceci est un email de test. Si vous recevez ce message, la configuration email fonctionne correctement!',
      },
    });

    if (error) {
      let errorMessage = error.message || 'Erreur inconnue';
      let errorCode = 'UNKNOWN_ERROR';
      let userMessage = errorMessage;
      let suggestedAction = '';
      let helpUrl = '';

      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          if (errorBody.errorCode) {
            errorCode = errorBody.errorCode;
            userMessage = errorBody.userMessage || errorMessage;
            suggestedAction = errorBody.suggestedAction || '';
            helpUrl = errorBody.helpUrl || '';
          }
        } catch (e) {
        }
      }

      return {
        success: false,
        error: errorMessage,
        errorCode,
        userMessage,
        suggestedAction,
        helpUrl,
      };
    }

    if (data && data.success === false) {
      return {
        success: false,
        error: data.error,
        errorCode: data.errorCode,
        userMessage: data.userMessage || data.error,
        suggestedAction: data.suggestedAction,
        helpUrl: data.helpUrl,
      };
    }

    if (data && data.success) {
      return {
        success: true,
        emailId: data.id,
      };
    }

    return {
      success: false,
      error: 'Réponse inattendue du serveur',
      userMessage: 'Le serveur a retourné une réponse inattendue',
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'envoi',
      userMessage: 'Une erreur s\'est produite lors de l\'envoi du test',
    };
  }
}

export function getConfigurationSteps(): Array<{
  step: number;
  title: string;
  description: string;
  actionUrl?: string;
  actionLabel?: string;
  completed?: boolean;
}> {
  return [
    {
      step: 1,
      title: 'Créer un compte Resend',
      description: 'Inscrivez-vous gratuitement sur Resend.com (3 000 emails/mois gratuits)',
      actionUrl: 'https://resend.com/signup',
      actionLabel: 'Créer un compte',
    },
    {
      step: 2,
      title: 'Générer une clé API',
      description: 'Dans votre dashboard Resend, créez une nouvelle clé API',
      actionUrl: 'https://resend.com/api-keys',
      actionLabel: 'Gérer les clés API',
    },
    {
      step: 3,
      title: 'Configurer les secrets Supabase',
      description: 'Ajoutez RESEND_API_KEY, FROM_EMAIL et FROM_NAME dans les secrets Supabase',
      actionUrl: 'https://supabase.com/dashboard',
      actionLabel: 'Ouvrir Supabase',
    },
    {
      step: 4,
      title: 'Vérifier votre domaine (optionnel)',
      description: 'Pour la production, vérifiez votre propre domaine dans Resend',
      actionUrl: 'https://resend.com/domains',
      actionLabel: 'Gérer les domaines',
    },
  ];
}
