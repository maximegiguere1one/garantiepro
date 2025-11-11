import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'noreply@garantieproremorque.com';
const FROM_NAME = 'Garantie Pro-Remorque';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.garantieproremorque.com';

interface ResendInvitationRequest {
  invitationId?: string;
  email?: string;
}

function generateInvitationEmailHTML(params: {
  invitedUserName: string;
  invitedByName: string;
  organizationName: string;
  role: string;
  resetLink: string;
  expiresInDays: number;
}): string {
  const roleNames: Record<string, string> = {
    super_admin: 'Super Administrateur',
    admin: 'Administrateur',
    dealer: 'Concessionnaire',
    f_and_i: 'Finance et Assurance',
    operations: 'Opérations',
    client: 'Client',
  };

  const roleName = roleNames[params.role] || params.role;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation - Garantie Pro-Remorque</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 50px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background-color: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid rgba(255, 255, 255, 0.2);">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <path d="M9 12l2 2 4-4"></path>
                      </svg>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Rappel d'invitation</h1>
                    <p style="color: #dbeafe; margin: 12px 0 0; font-size: 17px; font-weight: 500;">Rejoignez Garantie Pro-Remorque</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="color: #1e293b; font-size: 17px; line-height: 1.6; margin: 0 0 24px;">Bonjour <strong style="color: #1e40af;">${params.invitedUserName}</strong>,</p>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                      <strong style="color: #1e293b;">${params.invitedByName}</strong> vous a invité à rejoindre <strong style="color: #1e40af;">${params.organizationName}</strong> sur la plateforme professionnelle de gestion de garanties Garantie Pro-Remorque.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 5px solid #1e40af; padding: 24px 28px; border-radius: 12px;">
                          <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Votre Rôle</p>
                          <p style="margin: 8px 0 0; color: #1e293b; font-size: 22px; font-weight: 800;">${roleName}</p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0;">
                      <tr>
                        <td align="center">
                          <a href="${params.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: #ffffff; text-decoration: none; padding: 18px 56px; border-radius: 12px; font-weight: 700; font-size: 17px; box-shadow: 0 10px 15px -3px rgba(30, 64, 175, 0.3), 0 4px 6px -2px rgba(30, 64, 175, 0.1);">
                            Créer mon mot de passe →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #64748b; font-size: 14px; margin: 32px 0 0; text-align: center; font-weight: 500;">
                      🔒 Ce lien sécurisé expirera dans <strong style="color: #1e40af;">${params.expiresInDays} jours</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px;">
                      <strong style="color: #1e40af; font-size: 18px; font-weight: 800;">Garantie Pro-Remorque</strong>
                    </p>
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 8px; font-weight: 500;">
                      Plateforme professionnelle de gestion de garanties
                    </p>
                    <p style="color: #94a3b8; font-size: 13px; margin: 20px 0 0;">
                      <a href="https://www.garantieproremorque.com" style="color: #1e40af; text-decoration: none; font-weight: 600;">www.garantieproremorque.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: requestingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !requestingProfile) {
      throw new Error('Profile not found');
    }

    if (!['admin', 'super_admin'].includes(requestingProfile.role)) {
      throw new Error('Only administrators can resend invitations');
    }

    const { invitationId, email }: ResendInvitationRequest = await req.json();

    let invitation;

    if (invitationId) {
      const { data, error } = await supabase
        .from('franchisee_invitations')
        .select('*, organization:organizations(name)')
        .eq('id', invitationId)
        .single();

      if (error || !data) {
        throw new Error('Invitation not found');
      }
      invitation = data;
    } else if (email) {
      const { data, error } = await supabase
        .from('franchisee_invitations')
        .select('*, organization:organizations(name)')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        throw new Error('No invitation found for this email');
      }
      invitation = data;
    } else {
      throw new Error('Either invitationId or email is required');
    }

    if (invitation.status === 'accepted') {
      throw new Error('This invitation has already been accepted');
    }

    if (invitation.attempts >= 5) {
      throw new Error('Maximum resend attempts reached. Please create a new invitation.');
    }

    const { data: authUser } = await supabase.auth.admin.getUserByEmail(invitation.email);

    if (!authUser?.user) {
      throw new Error('User account not found. Please create a new invitation.');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: resetLinkData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: invitation.email,
      options: {
        redirectTo: `${SITE_URL}/reset-password`,
      },
    });

    if (resetError || !resetLinkData?.properties?.action_link) {
      throw new Error('Failed to generate recovery link');
    }

    let resetLink = resetLinkData.properties.action_link;

    const linkUrl = new URL(resetLink);
    linkUrl.searchParams.set('redirect_to', `${SITE_URL}/reset-password`);
    resetLink = linkUrl.toString();

    const organizationName = invitation.organization?.name || 'votre organisation';
    const invitedUserName = invitation.email.split('@')[0];
    const invitedByName = requestingProfile.full_name || user.email?.split('@')[0] || 'Un administrateur';

    let emailSent = false;
    let emailError = null;

    if (RESEND_API_KEY) {
      try {
        const emailHTML = generateInvitationEmailHTML({
          invitedUserName,
          invitedByName,
          organizationName,
          role: invitation.role,
          resetLink,
          expiresInDays: 7,
        });

        const emailData = {
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [invitation.email],
          subject: `Rappel - Votre invitation chez Garantie Pro-Remorque`,
          html: emailHTML,
        };

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        });

        if (emailResponse.ok) {
          emailSent = true;
          const emailResult = await emailResponse.json();
          console.log('Invitation resent successfully. Resend ID:', emailResult.id);

          await supabase
            .from('franchisee_invitations')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              attempts: invitation.attempts + 1,
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invitation.id);
        } else {
          const errorData = await emailResponse.json();
          emailError = errorData.message || 'Failed to send email';
          console.error('Failed to resend invitation email:', errorData);

          await supabase
            .from('franchisee_invitations')
            .update({
              status: 'failed',
              attempts: invitation.attempts + 1,
              last_error: emailError,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invitation.id);
        }
      } catch (error) {
        console.error('Error resending invitation email:', error);
        emailError = error instanceof Error ? error.message : 'Unknown email error';

        await supabase
          .from('franchisee_invitations')
          .update({
            status: 'failed',
            attempts: invitation.attempts + 1,
            last_error: emailError,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);
      }
    } else {
      emailError = 'RESEND_API_KEY not configured';
    }

    return new Response(
      JSON.stringify({
        success: emailSent,
        message: emailSent
          ? `Invitation renvoyée avec succès à ${invitation.email}`
          : `Échec de l'envoi. ${emailError}`,
        emailSent,
        emailError: emailError || undefined,
        resetLink: !emailSent ? resetLink : undefined,
        attempts: invitation.attempts + 1,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: emailSent ? 200 : 400,
      }
    );
  } catch (error) {
    console.error('Error in resend-invitation function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});