import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'noreply@locationproremorque.ca';
const FROM_NAME = 'Location Pro-Remorque';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.garantieproremorque.com';

interface PasswordResetRequest {
  email?: string;
  userId?: string;
  newPassword?: string;
  adminReset?: boolean;
}

function generatePasswordResetEmailHTML(params: {
  userName: string;
  organizationName: string;
  resetLink: string;
  expiresInHours: number;
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe - Location Pro-Remorque</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 50px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background-color: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid rgba(255, 255, 255, 0.2);">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Réinitialisation</h1>
                    <p style="color: #fecaca; margin: 12px 0 0; font-size: 17px; font-weight: 500;">Demande de nouveau mot de passe</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding: 48px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="color: #1e293b; font-size: 17px; line-height: 1.6; margin: 0 0 24px;">Bonjour <strong style="color: #dc2626;">${params.userName}</strong>,</p>

                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                      Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte <strong>${params.organizationName}</strong> sur la plateforme <strong>Location Pro-Remorque</strong>.
                    </p>

                    <!-- Alerte de sécurité -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 5px solid #dc2626; padding: 24px 28px; border-radius: 12px;">
                          <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">🔒 Sécurité</p>
                          <p style="margin: 8px 0 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                            Si vous n'avez pas demandé cette réinitialisation, <strong>ignorez cet email</strong>. Votre mot de passe actuel reste inchangé.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Bouton CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0;">
                      <tr>
                        <td align="center">
                          <a href="${params.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 18px 56px; border-radius: 12px; font-weight: 700; font-size: 17px; box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.3), 0 4px 6px -2px rgba(220, 38, 38, 0.1);">
                            Réinitialiser mon mot de passe →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; font-size: 14px; margin: 32px 0 0; text-align: center; font-weight: 500;">
                      ⏰ Ce lien expirera dans <strong style="color: #dc2626;">${params.expiresInHours} heures</strong>
                    </p>

                    <!-- Instructions -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 40px 0 0;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            <strong style="color: #1e293b;">💡 Conseil de sécurité:</strong><br>
                            Choisissez un mot de passe fort avec au moins 8 caractères, incluant des lettres majuscules, minuscules, chiffres et symboles.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px;">
                      <strong style="color: #1e40af; font-size: 18px; font-weight: 800;">Location Pro-Remorque</strong>
                    </p>
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 8px; font-weight: 500;">
                      Plateforme professionnelle de gestion de garanties
                    </p>
                    <p style="color: #94a3b8; font-size: 13px; margin: 20px 0 0;">
                      <a href="https://app.garantieproremorque.com" style="color: #1e40af; text-decoration: none; font-weight: 600;">app.garantieproremorque.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Lien de secours -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 24px auto 0;">
          <tr>
            <td style="text-align: center; padding: 0 20px;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:
              </p>
              <p style="margin: 0;">
                <a href="${params.resetLink}" style="color: #dc2626; font-size: 12px; word-break: break-all; text-decoration: underline;">${params.resetLink}</a>
              </p>
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
      .select('role, organization_id, organization:organizations(type)')
      .eq('id', user.id)
      .single();

    console.log('Requesting user profile:', {
      userId: user.id,
      email: user.email,
      profile: requestingProfile,
      error: profileError
    });

    if (profileError || !requestingProfile) {
      console.error('Profile not found:', profileError);
      throw new Error('Profil utilisateur introuvable. Veuillez vous reconnecter.');
    }

    const allowedRoles = ['admin', 'super_admin', 'master', 'franchisee_admin'];
    console.log('Role check:', {
      userRole: requestingProfile.role,
      allowedRoles,
      isAllowed: allowedRoles.includes(requestingProfile.role)
    });

    if (!allowedRoles.includes(requestingProfile.role)) {
      throw new Error(`Accès refusé. Votre rôle (${requestingProfile.role}) n'est pas autorisé à réinitialiser les mots de passe.`);
    }

    const { email, userId, newPassword, adminReset }: PasswordResetRequest = await req.json();

    console.log('Password reset request body:', {
      hasEmail: !!email,
      hasUserId: !!userId,
      hasNewPassword: !!newPassword,
      adminReset,
      userIdType: typeof userId,
      userId: userId
    });

    // Admin direct password reset
    if (adminReset && userId && newPassword) {
      console.log('Processing admin direct password reset for userId:', userId, 'type:', typeof userId);

      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('Invalid user ID provided');
      }

      if (newPassword.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      // Verify user exists first
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);

      if (getUserError || !authUser.user) {
        console.error('User not found in auth.users:', getUserError);
        throw new Error('Utilisateur introuvable dans le système d\'authentification');
      }

      console.log('Found user in auth.users:', authUser.user.email);

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error('Échec de la mise à jour du mot de passe: ' + updateError.message);
      }

      console.log('Password updated successfully for user:', userId, authUser.user.email);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Mot de passe changé avec succès',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }

    console.log('Admin reset conditions not met, falling back to email reset');

    if (!email) {
      throw new Error('Email is required');
    }

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, full_name, organization_id')
      .eq('email', email)
      .maybeSingle();

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Validate access: owner admins can reset any password, franchise admins only their org
    const isOwnerAdmin = requestingProfile.organization?.type === 'owner';

    if (!isOwnerAdmin && targetUser.organization_id !== requestingProfile.organization_id) {
      throw new Error('You can only reset passwords for users in your organization');
    }

    console.log('Password reset request:', {
      requestingUser: user.id,
      requestingOrg: requestingProfile.organization_id,
      targetUser: targetUser.id,
      targetOrg: targetUser.organization_id,
      isOwnerAdmin,
      targetEmail: email,
      siteUrl: SITE_URL,
    });

    const { data: resetLinkData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${SITE_URL}/reset-password`,
      },
    });

    if (resetError || !resetLinkData) {
      console.error('Error generating recovery link:', resetError);
      throw new Error('Failed to generate password reset link');
    }

    let resetLink = resetLinkData.properties.action_link;

    const linkUrl = new URL(resetLink);
    linkUrl.searchParams.set('redirect_to', `${SITE_URL}/reset-password`);
    resetLink = linkUrl.toString();

    console.log('🔍 Debug reset link generation:', {
      action_link: resetLink,
      site_url_env: SITE_URL,
      redirect_to_param: linkUrl.searchParams.get('redirect_to'),
      full_url_params: Object.fromEntries(linkUrl.searchParams.entries())
    });

    // Get organization name
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', targetUser.organization_id)
      .maybeSingle();

    const userName = targetUser.full_name || email.split('@')[0];
    const organizationName = orgData?.name || 'votre organisation';

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailHTML = generatePasswordResetEmailHTML({
      userName,
      organizationName,
      resetLink,
      expiresInHours: 24,
    });

    const emailData = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject: 'Réinitialisation de votre mot de passe - Location Pro-Remorque',
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

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Failed to send password reset email:', errorData);
      throw new Error('Failed to send password reset email: ' + (errorData.message || 'Unknown error'));
    }

    const emailResult = await emailResponse.json();
    console.log('Password reset email sent successfully. Resend ID:', emailResult.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email de réinitialisation envoyé à ${email}`,
        emailId: emailResult.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-password-reset function:', error);
    
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