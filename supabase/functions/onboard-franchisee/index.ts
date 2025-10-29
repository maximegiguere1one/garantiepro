import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.garantieproremorque.com';

interface OnboardingData {
  franchiseeId: string;
  email: string;
  name: string;
  organizationName: string;
  phone?: string;
  resendInvitation?: boolean;
}

interface ErrorResponse {
  success: false;
  errorCode: string;
  error: string;
  userMessage: string;
  technicalDetails?: any;
}

function createErrorResponse(
  errorCode: string,
  error: string,
  userMessage: string,
  statusCode: number,
  technicalDetails?: any
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      errorCode,
      error,
      userMessage,
      technicalDetails,
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { franchiseeId, email, name, organizationName, phone, resendInvitation }: OnboardingData = await req.json();

    console.log('=== ONBOARD FRANCHISEE START ===');
    console.log('Franchisee ID:', franchiseeId);
    console.log('Email:', email);
    console.log('Name:', name);
    console.log('Resend:', resendInvitation);

    // Validate required fields
    if (!franchiseeId || !email || !name || !organizationName) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Missing required fields',
        'Tous les champs requis doivent être fournis (ID, email, nom, organisation).',
        400,
        { franchiseeId, email, name, organizationName }
      );
    }

    // Verify organization exists
    const { data: organization, error: orgCheckError } = await supabaseClient
      .from('organizations')
      .select('id, name, type')
      .eq('id', franchiseeId)
      .maybeSingle();

    if (orgCheckError || !organization) {
      console.error('Organization not found:', franchiseeId);
      return createErrorResponse(
        'ORG_NOT_FOUND',
        'Organization does not exist',
        'L\'organisation spécifiée n\'existe pas.',
        404,
        { franchiseeId }
      );
    }

    // Check rate limiting
    const { data: rateLimitCheck } = await supabaseClient
      .rpc('check_invitation_rate_limit', {
        p_organization_id: franchiseeId,
        p_hours: 1,
        p_max_attempts: 3
      });

    if (rateLimitCheck === false) {
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many invitation attempts',
        'Trop de tentatives d\'invitation. Veuillez réessayer dans une heure.',
        429,
        { organizationId: franchiseeId }
      );
    }

    let userId: string;
    let password: string;
    let isNewUser = true;

    // Check if user already exists
    const { data: existingAuth } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingAuth?.users?.find(u => u.email === email);

    if (existingUser && !resendInvitation) {
      console.error('User already exists:', email);
      return createErrorResponse(
        'USER_EXISTS',
        'User with this email already exists',
        'Un utilisateur avec cet email existe déjà. Utilisez "Renvoyer l\'invitation" si nécessaire.',
        409,
        { email }
      );
    }

    if (existingUser && resendInvitation) {
      console.log('Resending invitation to existing user:', email);
      userId = existingUser.id;
      isNewUser = false;
      // Generate new password for existing user
      password = `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`;

      // Update password
      const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (passwordError) {
        console.error('Password update error:', passwordError);
        return createErrorResponse(
          'PASSWORD_UPDATE_FAILED',
          passwordError.message,
          'Impossible de réinitialiser le mot de passe.',
          500,
          passwordError
        );
      }
    } else {
      // Create new user
      password = `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`;
      console.log('Creating new user:', email);

      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: 'admin',
          organization_id: franchiseeId,
        },
      });

      if (authError) {
        console.error('User creation error:', authError);
        return createErrorResponse(
          'USER_CREATION_FAILED',
          authError.message,
          'Impossible de créer le compte utilisateur.',
          500,
          authError
        );
      }

      userId = authData.user.id;
      console.log('User created successfully:', userId);

      // Wait a bit for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify and update profile
      const { data: profile, error: profileCheckError } = await supabaseClient
        .from('profiles')
        .select('id, organization_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileCheckError || !profile) {
        console.error('Profile not found after creation:', userId);
        // Try to create profile manually
        const { error: profileCreateError } = await supabaseClient
          .from('profiles')
          .insert({
            id: userId,
            email,
            full_name: name,
            role: 'admin',
            organization_id: franchiseeId,
          });

        if (profileCreateError) {
          console.error('Manual profile creation failed:', profileCreateError);
        }
      } else if (!profile.organization_id) {
        // Update profile if organization_id is missing
        const { error: profileUpdateError } = await supabaseClient
          .from('profiles')
          .update({
            full_name: name,
            role: 'admin',
            organization_id: franchiseeId,
          })
          .eq('id', userId);

        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError);
        }
      }
    }

    const setupLink = `${SITE_URL}/setup?token=${userId}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .credentials { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .checklist { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .checklist-item { padding: 12px 0; border-bottom: 1px solid #e0f2fe; }
    .checklist-item:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 32px;">🎉 Bienvenue dans le réseau!</h1>
      <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Votre franchise est prête</p>
    </div>

    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${name}!</h2>

      <p>Félicitations! Votre franchise <strong>${organizationName}</strong> a été créée avec succès. Vous êtes maintenant prêt à vendre des garanties et gérer votre business.</p>

      <div class="credentials">
        <h3 style="margin-top: 0; color: #1f2937;">🔐 Vos identifiants de connexion</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mot de passe temporaire:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
        <p style="color: #ef4444; margin-bottom: 0;"><strong>⚠️ Important:</strong> Changez ce mot de passe dès votre première connexion!</p>
      </div>

      <div style="text-align: center;">
        <a href="${setupLink}" class="button">🚀 Configurer mon compte</a>
      </div>

      <div class="checklist">
        <h3 style="margin-top: 0; color: #1f2937;">📋 Checklist de démarrage</h3>
        <div class="checklist-item">
          <strong>1. Première connexion</strong><br>
          <span style="color: #6b7280;">Connectez-vous et changez votre mot de passe</span>
        </div>
        <div class="checklist-item">
          <strong>2. Configurez votre entreprise</strong><br>
          <span style="color: #6b7280;">Logo, coordonnées, informations de contact</span>
        </div>
        <div class="checklist-item">
          <strong>3. Créez vos plans de garantie</strong><br>
          <span style="color: #6b7280;">Définissez les options que vous proposez</span>
        </div>
        <div class="checklist-item">
          <strong>4. Ajoutez votre inventaire</strong><br>
          <span style="color: #6b7280;">Importez vos remorques disponibles</span>
        </div>
        <div class="checklist-item">
          <strong>5. Vendez votre première garantie!</strong><br>
          <span style="color: #6b7280;">En moins de 5 minutes chrono ⚡</span>
        </div>
      </div>

      <h3 style="color: #1f2937;">💡 Ce que vous pouvez faire:</h3>
      <ul style="color: #4b5563;">
        <li>Vendre des garanties en moins de 5 minutes</li>
        <li>Gérer vos réclamations en temps réel</li>
        <li>Suivre vos performances et analytics</li>
        <li>Gérer votre inventaire de remorques</li>
        <li>Accéder à tous vos clients</li>
        <li>Générer automatiquement tous les documents</li>
      </ul>

      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="margin: 0; color: #92400e;"><strong>💰 Rappel:</strong> Vous économisez ~1,470$ par garantie vendue en éliminant les intermédiaires!</p>
      </div>

      <p style="margin-top: 32px;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>

      <p style="margin-bottom: 0;">L'équipe de support</p>
    </div>

    <div class="footer">
      <p>Cet email a été envoyé à ${email}</p>
      <p>© ${new Date().getFullYear()} Plateforme de Gestion de Garanties. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Create invitation record
    const { data: invitationRecord, error: invitationError } = await supabaseClient.auth.getUser();

    let invitedById: string | null = null;
    if (invitationRecord?.user) {
      invitedById = invitationRecord.user.id;
    }

    const { data: invitation, error: insertInvitationError } = await supabaseClient
      .from('franchisee_invitations')
      .insert({
        organization_id: franchiseeId,
        email,
        invited_by: invitedById,
        status: 'pending',
        attempts: 1,
      })
      .select()
      .single();

    if (insertInvitationError) {
      console.error('Failed to create invitation record:', insertInvitationError);
    }

    const invitationId = invitation?.id;

    // Try to send email with retry logic
    console.log('Attempting to send email via send-email function...');
    let emailSent = false;
    let emailError: any = null;
    let detailedErrorInfo: any = null;
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000];

    for (let attempt = 0; attempt < maxRetries && !emailSent; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${retryDelays[attempt - 1]}ms delay`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
        }

        console.log(`Email send attempt ${attempt + 1}/${maxRetries} to ${email}`);

        const emailRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            to: email,
            subject: `🎉 Bienvenue ${name} - Votre franchise ${organizationName} est prête!`,
            html: emailHtml,
            body: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          let errorData;
          try {
            errorData = await emailRes.json();
          } catch {
            errorData = { error: await emailRes.text() };
          }

          console.error(`Email sending failed (attempt ${attempt + 1}):`, JSON.stringify(errorData, null, 2));
          emailError = errorData.error || errorData.userMessage || `HTTP ${emailRes.status}`;
          detailedErrorInfo = errorData;

          if (attempt === maxRetries - 1) {
            if (invitationId) {
              await supabaseClient
                .from('franchisee_invitations')
                .update({
                  status: 'failed',
                  last_error: JSON.stringify(errorData).substring(0, 500),
                  attempts: attempt + 1,
                })
                .eq('id', invitationId);
            }

            await supabaseClient.from('error_logs').insert({
              error_type: errorData.errorCode || 'EMAIL_SEND_FAILED',
              error_message: emailError,
              context: {
                email,
                organizationName,
                userId,
                attempts: attempt + 1,
                detailedError: errorData,
                resendStatus: emailRes.status
              },
              severity: 'error',
            });
          }
        } else {
          const successData = await emailRes.json();
          emailSent = true;
          console.log(`Email sent successfully on attempt ${attempt + 1}. Resend ID:`, successData.id);

          if (invitationId) {
            await supabaseClient
              .from('franchisee_invitations')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                attempts: attempt + 1,
              })
              .eq('id', invitationId);
          }
        }
      } catch (emailCatchError: any) {
        console.error(`Email sending exception (attempt ${attempt + 1}):`, emailCatchError);
        emailError = emailCatchError.message;
        detailedErrorInfo = { exception: emailCatchError.message, stack: emailCatchError.stack };

        if (attempt === maxRetries - 1) {
          if (invitationId) {
            await supabaseClient
              .from('franchisee_invitations')
              .update({
                status: 'failed',
                last_error: emailCatchError.message.substring(0, 500),
                attempts: attempt + 1,
              })
              .eq('id', invitationId);
          }

          await supabaseClient.from('error_logs').insert({
            error_type: 'EMAIL_NETWORK_ERROR',
            error_message: emailCatchError.message,
            stack_trace: emailCatchError.stack,
            context: { email, organizationName, userId, attempts: attempt + 1 },
            severity: 'error',
          });
        }
      }
    }

    console.log('=== ONBOARD FRANCHISEE SUCCESS ===');
    console.log('User ID:', userId);
    console.log('Email sent:', emailSent);
    console.log('Total attempts:', emailSent ? 'Success' : maxRetries);

    const setupLinkFinal = `${SITE_URL}/setup?token=${userId}`;

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent
          ? 'Franchisé créé avec succès! Email d\'intégration envoyé.'
          : 'Franchisé créé mais l\'email n\'a pas pu être envoyé après plusieurs tentatives. Utilisez le lien manuel ci-dessous.',
        userId,
        temporaryPassword: password,
        emailSent,
        emailError: emailError ? String(emailError).substring(0, 200) : null,
        detailedErrorInfo: !emailSent ? detailedErrorInfo : null,
        invitationId,
        setupLink: setupLinkFinal,
        warning: !emailSent ? 'EMAIL_NOT_SENT' : null,
        userMessage: !emailSent
          ? 'L\'email n\'a pas pu être envoyé automatiquement. Partagez le lien d\'invitation manuellement avec le franchisé.'
          : 'Invitation envoyée avec succès par email.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: emailSent ? 200 : 207,
      }
    );
  } catch (error: any) {
    console.error('=== ONBOARD FRANCHISEE ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    // Log to error_logs table
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient.from('error_logs').insert({
        error_type: 'ONBOARD_FRANCHISEE_ERROR',
        error_message: error.message,
        stack_trace: error.stack,
        context: { error: error.toString() },
        severity: 'critical',
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      error.message || 'Unknown error',
      'Une erreur interne s\'est produite. Veuillez réessayer ou contacter le support.',
      500,
      { errorType: error.name, message: error.message }
    );
  }
});
