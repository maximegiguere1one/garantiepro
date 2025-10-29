import { supabase } from './supabase';

export interface SignatureContext {
  ipAddress?: string;
  userAgent?: string;
  geolocation?: { latitude: number; longitude: number };
  screenResolution?: string;
  language?: string;
}

export interface SignatureData {
  signerFullName: string;
  signerEmail: string;
  signerPhone?: string;
  signatureDataUrl: string;
  documentHash: string;
  consentGiven: boolean;
  termsDisclosed: boolean;
  withdrawalNoticeShown: boolean;
  context: SignatureContext;
}

export async function calculateDocumentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getSignatureContext(): Promise<SignatureContext> {
  const context: SignatureContext = {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language || 'fr'
  };

  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    context.ipAddress = data.ip;
  } catch (error) {
    console.warn('Could not fetch IP address:', error);
  }

  if ('geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 0
        });
      });

      context.geolocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (error) {
      console.warn('Geolocation not available or denied:', error);
    }
  }

  return context;
}

export async function logSignatureEvent(
  warrantyId: string,
  organizationId: string,
  eventType: string,
  eventData: Record<string, any> = {},
  sessionId: string
): Promise<void> {
  try {
    const context = await getSignatureContext();

    const { error } = await supabase.rpc('log_signature_event', {
      p_warranty_id: warrantyId,
      p_organization_id: organizationId,
      p_event_type: eventType,
      p_event_data: eventData,
      p_ip_address: context.ipAddress || null,
      p_user_agent: context.userAgent || null,
      p_geolocation: context.geolocation ? JSON.stringify(context.geolocation) : null,
      p_session_id: sessionId
    });

    if (error) {
      console.error('Error logging signature event:', error);
    }
  } catch (error) {
    console.error('Error in logSignatureEvent:', error);
  }
}

export function generateSessionId(): string {
  return `SIG-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function formatDateForLegal(date: Date): string {
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Toronto',
    timeZoneName: 'short'
  }).format(date);
}

export function getWithdrawalDeadline(signatureDate: Date): Date {
  const deadline = new Date(signatureDate);
  let businessDays = 0;

  while (businessDays < 10) {
    deadline.setDate(deadline.getDate() + 1);
    const dayOfWeek = deadline.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }

  return deadline;
}

export function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let browserName = 'Navigateur inconnu';
  let browserVersion = '';

  if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
  } else if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
  } else if (ua.indexOf('Edge') > -1) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edge\/([0-9.]+)/)?.[1] || '';
  }

  const os = ua.indexOf('Windows') > -1 ? 'Windows' :
            ua.indexOf('Mac') > -1 ? 'macOS' :
            ua.indexOf('Linux') > -1 ? 'Linux' :
            ua.indexOf('Android') > -1 ? 'Android' :
            ua.indexOf('iOS') > -1 ? 'iOS' : 'Système inconnu';

  return `${browserName} ${browserVersion} sur ${os}`;
}

export const LEGAL_TEXTS = {
  fr: {
    electronicSignatureDisclosure: `IMPORTANT - SIGNATURE ÉLECTRONIQUE

En signant électroniquement ce document, vous reconnaissez et acceptez que:

✓ Vous avez lu et compris l'intégralité du contrat de garantie
✓ Vous acceptez tous les termes, conditions et obligations qui y sont énoncés
✓ Votre signature électronique a la même valeur juridique qu'une signature manuscrite
✓ Vous comprenez que ce contrat vous lie légalement

DROIT DE RÉTRACTATION:
Conformément à la Loi sur la protection du consommateur (L.R.Q., c. P-40.1),
vous disposez d'un délai de 10 jours ouvrables pour annuler ce contrat sans
frais, pénalité ni justification. Ce délai commence à la réception de votre
exemplaire du contrat.

Pour exercer ce droit, vous devez transmettre un avis écrit au commerçant
avant l'expiration du délai.

PROTECTION DE VOS RENSEIGNEMENTS PERSONNELS:
Les informations que vous fournissez sont collectées, utilisées et conservées
conformément à la Loi sur la protection des renseignements personnels et les
documents électroniques (LPRPDE) et à la Loi concernant le cadre juridique des
technologies de l'information (LCCJTI).

Vos données seront utilisées uniquement pour:
- L'exécution du contrat de garantie
- La gestion de votre dossier client
- Le respect de nos obligations légales

AUTHENTIFICATION ET INTÉGRITÉ:
Cette signature électronique est capturée et conservée de manière sécurisée
conformément aux articles 39 à 48 de la LCCJTI. Un certificat de signature
sera généré et vous sera transmis avec votre exemplaire du contrat.`,

    consentCheckbox: "Je comprends mes droits et j'accepte de signer électroniquement ce contrat",

    identityVerification: `VÉRIFICATION D'IDENTITÉ

Pour assurer la validité juridique de votre signature électronique, nous devons
vérifier votre identité. Les informations que vous fournissez ci-dessous seront
associées à votre signature et conservées de manière sécurisée.

Conformément à l'article 40 de la LCCJTI, ces informations permettent d'identifier
le signataire de manière fiable.`,

    identityConfirmation: "Je certifie que les informations ci-dessus sont exactes et complètes",

    signatureInstructions: `Veuillez apposer votre signature dans la zone ci-dessous en utilisant
votre souris, votre pavé tactile ou votre doigt (sur appareil tactile).

Votre signature sera capturée avec les informations suivantes pour assurer
la conformité légale et l'intégrité du document.`,

    completionMessage: `SIGNATURE COMPLÉTÉE AVEC SUCCÈS

Votre contrat de garantie est maintenant signé et légalement valide.

Un exemplaire de votre contrat signé ainsi qu'un certificat de signature
électronique vous ont été envoyés par courriel.

Vous disposez de 10 jours ouvrables pour exercer votre droit de rétractation.`
  },

  en: {
    electronicSignatureDisclosure: `IMPORTANT - ELECTRONIC SIGNATURE

By electronically signing this document, you acknowledge and accept that:

✓ You have read and understood the entire warranty contract
✓ You accept all terms, conditions and obligations set forth therein
✓ Your electronic signature has the same legal value as a handwritten signature
✓ You understand that this contract is legally binding

RIGHT OF WITHDRAWAL:
In accordance with the Consumer Protection Act (R.S.Q., c. P-40.1), you have
10 business days to cancel this contract without charge, penalty or justification.
This period begins upon receipt of your copy of the contract.

To exercise this right, you must send written notice to the merchant before
the deadline expires.

PROTECTION OF YOUR PERSONAL INFORMATION:
The information you provide is collected, used and retained in accordance with
the Personal Information Protection and Electronic Documents Act (PIPEDA) and
the Act to establish a legal framework for information technology (AECST).

Your data will be used only for:
- Execution of the warranty contract
- Management of your customer file
- Compliance with our legal obligations

AUTHENTICATION AND INTEGRITY:
This electronic signature is captured and retained securely in accordance with
sections 39 to 48 of AECST. A signature certificate will be generated and sent
to you with your copy of the contract.`,

    consentCheckbox: "I understand my rights and agree to electronically sign this contract",

    identityVerification: `IDENTITY VERIFICATION

To ensure the legal validity of your electronic signature, we must verify your
identity. The information you provide below will be associated with your signature
and securely retained.

In accordance with section 40 of AECST, this information reliably identifies
the signatory.`,

    identityConfirmation: "I certify that the above information is accurate and complete",

    signatureInstructions: `Please affix your signature in the area below using your mouse,
trackpad or finger (on touch device).

Your signature will be captured with the following information to ensure
legal compliance and document integrity.`,

    completionMessage: `SIGNATURE COMPLETED SUCCESSFULLY

Your warranty contract is now signed and legally valid.

A copy of your signed contract and an electronic signature certificate
have been sent to you by email.

You have 10 business days to exercise your right of withdrawal.`
  }
};
