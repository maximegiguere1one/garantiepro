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

interface InviteUserRequest {
  email: string;
  role: 'master' | 'super_admin' | 'admin' | 'franchisee_admin' | 'franchisee_employee' | 'dealer' | 'f_and_i' | 'operations' | 'client';
  full_name?: string;
  organization_id?: string;
  manualPassword?: string;
  skipEmail?: boolean;
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
    master: 'Master',
    super_admin: 'Super Administrateur',
    admin: 'Administrateur',
    franchisee_admin: 'Administrateur Franchisé',
    franchisee_employee: 'Employé',
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
  <title>Invitation - Location Pro-Remorque</title>
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
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Bienvenue!</h1>
                    <p style="color: #dbeafe; margin: 12px 0 0; font-size: 17px; font-weight: 500;">Votre invitation à rejoindre Location Pro-Remorque</p>
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
                      <strong style="color: #1e293b;">${params.invitedByName}</strong> vous invite à rejoindre <strong style="color: #1e40af;">${params.organizationName}</strong> sur la plateforme professionnelle de gestion de garanties Location Pro-Remorque.
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[invite-user] Missing Authorization header');
      throw new Error('Authorization header is required. Please ensure you are logged in.');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token === 'undefined' || token === 'null') {
      console.error('[invite-user] Invalid token format');
      throw new Error('Invalid authorization token. Please log out and log back in.');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[invite-user] Authentication failed:', userError);
      throw new Error('Authentication failed. Please log out and log back in.');
    }

    console.log('[invite-user] ✓ Authenticated user:', user.id, user.email);

    const { data: requestingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !requestingProfile) {
      console.error('[invite-user] ✗ Profile not found for user:', user.id, profileError);
      throw new Error('PROFILE_NOT_FOUND: Your profile could not be found. Please contact support.');
    }

    console.log('[invite-user] ✓ Requesting user profile:', {
      userId: user.id,
      role: requestingProfile.role,
      organizationId: requestingProfile.organization_id,
      fullName: requestingProfile.full_name
    });

    if (!['super_admin', 'admin', 'master', 'franchisee_admin'].includes(requestingProfile.role)) {
      console.error('[invite-user] ✗ Insufficient permissions:', requestingProfile.role);
      throw new Error(`INSUFFICIENT_PERMISSIONS: Seuls les administrateurs peuvent inviter des utilisateurs. Votre rôle actuel: ${requestingProfile.role}`);
    }
    console.log('[invite-user] ✓ Permissions validated');

    const { data: requestingOrg } = await supabase
      .from('organizations')
      .select('type')
      .eq('id', requestingProfile.organization_id)
      .single();

    const organizationType = requestingOrg?.type || null;

    let requestBody: InviteUserRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('[invite-user] Failed to parse request body:', parseError);
      throw new Error('Invalid request format. Please try again.');
    }

    const { email, role, full_name, organization_id, manualPassword, skipEmail } = requestBody;

    if (!email || !role) {
      console.error('[invite-user] ✗ Missing required fields:', { email: !!email, role: !!role });
      throw new Error('MISSING_FIELDS: Email and role are required fields.');
    }
    console.log('[invite-user] ✓ Required fields present:', { email, role });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.error('[invite-user] Invalid email format:', email);
      throw new Error('Invalid email format.');
    }

    if (manualPassword) {
      if (manualPassword.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }
      console.log('[invite-user] Manual password mode enabled');
    }

    console.log('[invite-user] Invitation request:', { email, role, organization_id });

    // Validation des permissions selon le rôle de l'utilisateur qui invite
    const canInviteRole = (requestingRole: string, targetRole: string): boolean => {
      // Master peut tout inviter
      if (requestingRole === 'master') return true;

      // Super admin peut inviter tous sauf master
      if (requestingRole === 'super_admin' && targetRole !== 'master') return true;

      // Admin peut inviter tous sauf master, super_admin, et admin
      if (requestingRole === 'admin' && !['master', 'super_admin', 'admin'].includes(targetRole)) return true;

      // Franchisee admin peut inviter des employés et autres franchisee_admin
      if (requestingRole === 'franchisee_admin' && ['franchisee_admin', 'franchisee_employee', 'dealer', 'f_and_i', 'operations', 'client'].includes(targetRole)) return true;

      return false;
    };

    if (!canInviteRole(requestingProfile.role, role)) {
      console.error('[invite-user] ✗ Role invitation not allowed:', {
        requestingRole: requestingProfile.role,
        targetRole: role
      });
      throw new Error(`ROLE_RESTRICTION: Votre rôle (${requestingProfile.role}) ne peut pas inviter le rôle ${role}`);
    }

    console.log('[invite-user] ✓ Role invitation permissions validated:', {
      requestingRole: requestingProfile.role,
      targetRole: role,
      allowed: true
    });

    const targetOrgId = organization_id || requestingProfile.organization_id;

    console.log('[invite-user] Target organization:', {
      targetOrgId,
      requestingOrgId: requestingProfile.organization_id,
      requestingOrgType: organizationType
    });

    const isOwnerAdmin = organizationType === 'owner';

    if (!isOwnerAdmin && targetOrgId !== requestingProfile.organization_id) {
      console.error('[invite-user] ✗ Organization mismatch:', {
        isOwnerAdmin,
        targetOrgId,
        requestingOrgId: requestingProfile.organization_id
      });
      throw new Error('ORG_MISMATCH: You can only invite users to your own organization');
    }

    console.log('[invite-user] ✓ Organization access validated');

    const { data: targetOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, type')
      .eq('id', targetOrgId)
      .maybeSingle();

    if (orgError) {
      console.error('[invite-user] ✗ Error fetching organization:', orgError);
      throw new Error(`ORG_FETCH_ERROR: ${orgError.message}`);
    }

    if (!targetOrg) {
      console.error('[invite-user] ✗ Organization not found:', targetOrgId);
      throw new Error(`ORG_NOT_FOUND: Target organization not found: ${targetOrgId}`);
    }

    console.log('[invite-user] ✓ Target organization found:', targetOrg);

    console.log('Invitation details:', {
      requestingUser: user.id,
      requestingOrg: requestingProfile.organization_id,
      targetOrg: targetOrgId,
      targetOrgName: targetOrg.name,
      isOwnerAdmin,
      invitedEmail: email,
      invitedRole: role,
    });

    // Vérifier d'abord dans auth.users (source de vérité)
    const { data: existingAuthUser, error: authCheckError } = await supabase.auth.admin.listUsers();

    let existingAuthUserId = null;
    if (!authCheckError && existingAuthUser?.users) {
      const foundUser = existingAuthUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (foundUser) {
        existingAuthUserId = foundUser.id;
        console.log('[invite-user] Found existing user in auth.users:', foundUser.id, foundUser.email);
      }
    }

    // Vérifier aussi dans profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, organization_id, role')
      .eq('email', email)
      .maybeSingle();

    // Déterminer l'ID à supprimer (priorité à auth.users)
    const userIdToDelete = existingAuthUserId || existingProfile?.id;

    if (userIdToDelete) {
      console.log('[invite-user] User already exists with ID:', userIdToDelete);

      if (userIdToDelete === user.id) {
        throw new Error('Vous ne pouvez pas vous inviter vous-même. Cet email correspond à votre compte actuel.');
      }

      if (existingProfile?.organization_id && existingProfile.organization_id !== targetOrgId) {
        throw new Error(`Un utilisateur avec l'email ${email} existe déjà dans une autre organisation.`);
      }

      console.log('[invite-user] Deleting existing user to allow re-invitation...');

      const { error: deleteAuthError } = await supabase.rpc('delete_auth_user', {
        user_id: userIdToDelete
      });

      if (deleteAuthError) {
        console.error('[invite-user] ✗ Error deleting auth user:', deleteAuthError);
        throw new Error(`Impossible de supprimer l'utilisateur existant: ${deleteAuthError.message}`);
      }

      console.log('[invite-user] ✓ Existing user deleted successfully, proceeding with re-invitation');

      // Attendre un peu pour que la suppression soit propagée
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('[invite-user] ✓ No existing user found, proceeding with new invitation');
    }

    const { data: existingInvitation } = await supabase
      .from('franchisee_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      console.log('[invite-user] Deleting old pending invitation...');
      await supabase
        .from('franchisee_invitations')
        .delete()
        .eq('id', existingInvitation.id);
    }

    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: inviteError } = await supabase
      .from('franchisee_invitations')
      .insert({
        email,
        role,
        organization_id: targetOrgId,
        invited_by: user.id,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError || !invitation) {
      console.error('[invite-user] ✗ Error creating invitation:', inviteError);
      console.error('[invite-user] Invitation data attempted:', {
        email,
        role,
        organization_id: targetOrgId,
        invited_by: user.id
      });
      throw new Error('INVITATION_CREATE_FAILED: ' + (inviteError?.message || 'Unknown error'));
    }

    console.log('[invite-user] ✓ Invitation created:', invitation.id);

    const temporaryPassword = manualPassword || crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0],
        role,
        organization_id: targetOrgId,
        invitation_token: invitationToken,
      },
    });

    if (createError || !newUser.user) {
      console.error('[invite-user] ✗ Error creating user:', createError);
      console.error('[invite-user] User creation data:', {
        email,
        hasPassword: !!temporaryPassword,
        metadata: { full_name, role, organization_id: targetOrgId }
      });
      await supabase
        .from('franchisee_invitations')
        .delete()
        .eq('id', invitation.id);
      throw new Error('USER_CREATE_FAILED: ' + (createError?.message || 'Unknown error'));
    }

    console.log('[invite-user] ✓ User created in auth.users:', newUser.user.id);

    let profileCreated = false;
    let profileCheckAttempts = 0;
    const maxProfileCheckAttempts = 10;
    const profileCheckDelay = 500;

    console.log('Waiting for profile to be created by database trigger...');

    while (!profileCreated && profileCheckAttempts < maxProfileCheckAttempts) {
      profileCheckAttempts++;
      await new Promise(resolve => setTimeout(resolve, profileCheckDelay));

      const { data: profileCheck, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, email, organization_id')
        .eq('id', newUser.user.id)
        .maybeSingle();

      if (profileCheckError) {
        console.error(`Profile check attempt ${profileCheckAttempts} error:`, profileCheckError);
        continue;
      }

      if (profileCheck) {
        console.log(`Profile found after ${profileCheckAttempts} attempts:`, profileCheck);
        profileCreated = true;

        if (profileCheck.organization_id !== targetOrgId) {
          console.log('Updating profile organization_id...');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ organization_id: targetOrgId })
            .eq('id', newUser.user.id);

          if (updateError) {
            console.error('Error updating profile organization_id:', updateError);
          } else {
            console.log('Profile organization_id updated successfully');
          }
        }
        break;
      }

      console.log(`Profile not found yet, attempt ${profileCheckAttempts}/${maxProfileCheckAttempts}`);
    }

    if (!profileCreated) {
      console.error('Profile was not created within expected timeframe');
      await supabase
        .from('franchisee_invitations')
        .delete()
        .eq('id', invitation.id);

      await supabase.rpc('delete_auth_user', {
        user_id: newUser.user.id
      });

      throw new Error('Failed to create user profile. Please try again.');
    }

    console.log('Profile creation verified successfully');

    const { data: resetLinkData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${SITE_URL}/reset-password`,
      },
    });

    let resetLink = null;
    if (resetError) {
      console.error('Error generating recovery link:', resetError);
    } else {
      resetLink = resetLinkData?.properties?.action_link || null;

      if (resetLink) {
        const linkUrl = new URL(resetLink);

        // CORRECTION: Forcer le bon domaine même si Supabase Auth n'est pas configuré
        // Remplacer localhost ou tout autre domaine par le domaine de production
        const token = linkUrl.searchParams.get('token');
        const type = linkUrl.searchParams.get('type');

        if (token) {
          // Reconstruire le lien avec le bon domaine
          resetLink = `${SITE_URL}/auth/confirm?token=${encodeURIComponent(token)}&type=recovery&redirect_to=${encodeURIComponent(`${SITE_URL}/reset-password`)}`;

          console.log('Generated invitation link with correct domain:', resetLink);
          console.log('Domain used:', SITE_URL);
        } else {
          // Fallback: juste changer le domaine
          linkUrl.hostname = new URL(SITE_URL).hostname;
          linkUrl.protocol = new URL(SITE_URL).protocol;
          linkUrl.searchParams.set('redirect_to', `${SITE_URL}/reset-password`);
          resetLink = linkUrl.toString();
        }
      }
    }

    const organizationName = targetOrg.name || 'votre organisation';
    const invitedUserName = full_name || email.split('@')[0];
    const invitedByName = requestingProfile.full_name || user.email?.split('@')[0] || 'Un administrateur';

    let emailSent = false;
    let emailError = null;

    if (!skipEmail && RESEND_API_KEY && resetLink) {
      try {
        const emailHTML = generateInvitationEmailHTML({
          invitedUserName,
          invitedByName,
          organizationName,
          role,
          resetLink,
          expiresInDays: 7,
        });

        const emailData = {
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [email],
          subject: `Bienvenue chez Location Pro-Remorque - Votre invitation`,
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
          console.log('Invitation email sent successfully. Resend ID:', emailResult.id);

          await supabase
            .from('franchisee_invitations')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', invitation.id);
        } else {
          const errorData = await emailResponse.json();
          emailError = errorData.message || 'Failed to send email';
          console.error('Failed to send invitation email:', errorData);
        }
      } catch (error) {
        console.error('Error sending invitation email:', error);
        emailError = error instanceof Error ? error.message : 'Unknown email error';
      }
    } else {
      emailError = !RESEND_API_KEY ? 'RESEND_API_KEY not configured' : 'No reset link generated';
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: skipEmail
          ? `Utilisateur créé avec succès. Partagez les informations de connexion manuellement.`
          : emailSent
            ? `Invitation envoyée par email à ${email}.`
            : `Utilisateur créé, mais l'email n'a pas pu être envoyé. Partagez le lien manuellement.`,
        emailSent,
        emailError: emailError || undefined,
        resetLink: !emailSent ? resetLink : undefined,
        temporaryPassword: skipEmail || manualPassword ? temporaryPassword : undefined,
        instructions: skipEmail
          ? `Partagez ces informations avec ${email}:\nEmail: ${email}\nMot de passe: ${temporaryPassword}\nURL: ${SITE_URL}`
          : !emailSent && resetLink
            ? `IMPORTANT: Partagez ce lien avec ${email}: ${resetLink}`
            : undefined,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role,
          organization_id: targetOrgId,
          organization_name: organizationName,
        },
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
    console.error('[invite-user] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue s\'est produite';
    const statusCode = errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized') ? 401 : 400;

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: statusCode,
      }
    );
  }
});
