import { supabase } from './supabase';

export interface SMSOptions {
  to: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export async function sendSMS(options: SMSOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: options,
    });

    if (error) throw error;

    await supabase.from('notifications').insert({
      recipient_phone: options.to,
      type: 'sms',
      template_name: options.templateId || 'custom',
      subject: null,
      body: options.body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending SMS:', error);

    await supabase.from('notifications').insert({
      recipient_phone: options.to,
      type: 'sms',
      template_name: options.templateId || 'custom',
      subject: null,
      body: options.body,
      status: 'failed',
      error_message: error.message,
    });

    return { success: false, error: error.message };
  }
}

export async function sendWarrantyCreatedSMS(
  phone: string,
  customerName: string,
  contractNumber: string,
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  const body = language === 'fr'
    ? `Bonjour ${customerName}, votre garantie #${contractNumber} a été créée avec succès. Consultez votre espace client pour plus de détails.`
    : `Hello ${customerName}, your warranty #${contractNumber} has been created successfully. Check your customer portal for details.`;

  return sendSMS({
    to: phone,
    body,
    templateId: 'warranty_created_sms',
  });
}

export async function sendClaimStatusSMS(
  phone: string,
  customerName: string,
  claimNumber: string,
  status: string,
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  const statusText = {
    fr: {
      submitted: 'soumise',
      under_review: 'en révision',
      approved: 'approuvée',
      denied: 'refusée',
      completed: 'complétée',
    },
    en: {
      submitted: 'submitted',
      under_review: 'under review',
      approved: 'approved',
      denied: 'denied',
      completed: 'completed',
    },
  };

  const body = language === 'fr'
    ? `Bonjour ${customerName}, votre réclamation #${claimNumber} a été ${statusText.fr[status as keyof typeof statusText.fr] || status}.`
    : `Hello ${customerName}, your claim #${claimNumber} has been ${statusText.en[status as keyof typeof statusText.en] || status}.`;

  return sendSMS({
    to: phone,
    body,
    templateId: 'claim_status_sms',
  });
}

export async function sendAppointmentReminderSMS(
  phone: string,
  customerName: string,
  appointmentDate: string,
  location: string,
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  const body = language === 'fr'
    ? `Rappel: Votre rendez-vous est prévu le ${appointmentDate} à ${location}. Pro-Remorque`
    : `Reminder: Your appointment is scheduled for ${appointmentDate} at ${location}. Pro-Remorque`;

  return sendSMS({
    to: phone,
    body,
    templateId: 'appointment_reminder_sms',
  });
}

export async function sendWarrantyExpirationReminderSMS(
  phone: string,
  customerName: string,
  contractNumber: string,
  daysRemaining: number,
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  const body = language === 'fr'
    ? `Rappel: Votre garantie #${contractNumber} expire dans ${daysRemaining} jours. Contactez-nous pour renouveler.`
    : `Reminder: Your warranty #${contractNumber} expires in ${daysRemaining} days. Contact us to renew.`;

  return sendSMS({
    to: phone,
    body,
    templateId: 'warranty_expiration_sms',
  });
}

export async function sendClaimApprovedSMS(
  phone: string,
  customerName: string,
  claimNumber: string,
  approvedAmount: number,
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  const formattedAmount = new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(approvedAmount);

  const body = language === 'fr'
    ? `Bonne nouvelle! Votre réclamation #${claimNumber} a été approuvée pour ${formattedAmount}. Détails dans votre espace client.`
    : `Good news! Your claim #${claimNumber} has been approved for ${formattedAmount}. Details in your customer portal.`;

  return sendSMS({
    to: phone,
    body,
    templateId: 'claim_approved_sms',
  });
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  return `+1${cleaned}`;
}

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

export async function testSMS(phone: string): Promise<{ success: boolean; error?: string }> {
  return sendSMS({
    to: formatPhoneNumber(phone),
    body: 'Test SMS - Pro-Remorque. Si vous recevez ce message, la configuration SMS fonctionne correctement!',
  });
}
