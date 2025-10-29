export function generateInvitationEmailHTML(params: {
  invitedUserName: string;
  invitedByName: string;
  organizationName: string;
  role: string;
  resetLink: string;
  expiresInDays: number;
}): string {
  const roleNames: Record<string, string> = {
    admin: 'Administrateur',
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

          <!-- Header avec logo -->
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

          <!-- Corps du message -->
          <tr>
            <td style="padding: 48px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="color: #1e293b; font-size: 17px; line-height: 1.6; margin: 0 0 24px;">Bonjour <strong style="color: #1e40af;">${params.invitedUserName}</strong>,</p>

                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                      <strong style="color: #1e293b;">${params.invitedByName}</strong> vous invite à rejoindre <strong style="color: #1e40af;">${params.organizationName}</strong> sur la plateforme professionnelle de gestion de garanties Location Pro-Remorque.
                    </p>

                    <!-- Card Rôle -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 5px solid #1e40af; padding: 24px 28px; border-radius: 12px;">
                          <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Votre Rôle</p>
                          <p style="margin: 8px 0 0; color: #1e293b; font-size: 22px; font-weight: 800;">${roleName}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Bouton CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0;">
                      <tr>
                        <td align="center">
                          <a href="${params.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: #ffffff; text-decoration: none; padding: 18px 56px; border-radius: 12px; font-weight: 700; font-size: 17px; box-shadow: 0 10px 15px -3px rgba(30, 64, 175, 0.3), 0 4px 6px -2px rgba(30, 64, 175, 0.1); transition: all 0.2s;">
                            Créer mon mot de passe →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; font-size: 14px; margin: 32px 0 0; text-align: center; font-weight: 500;">
                      🔒 Ce lien sécurisé expirera dans <strong style="color: #1e40af;">${params.expiresInDays} jours</strong>
                    </p>

                    <!-- Séparateur -->
                    <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 48px 0;">

                    <!-- Instructions -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td>
                          <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 20px; font-weight: 700;">🚀 Prochaines étapes</h2>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 12px 0;">
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="width: 32px; vertical-align: top;">
                                      <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">1</div>
                                    </td>
                                    <td style="padding-left: 16px; color: #475569; font-size: 15px; line-height: 1.6;">
                                      Cliquez sur le bouton <strong>"Créer mon mot de passe"</strong>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0;">
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="width: 32px; vertical-align: top;">
                                      <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">2</div>
                                    </td>
                                    <td style="padding-left: 16px; color: #475569; font-size: 15px; line-height: 1.6;">
                                      Créez un mot de passe <strong>sécurisé</strong> (minimum 6 caractères)
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0;">
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="width: 32px; vertical-align: top;">
                                      <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">3</div>
                                    </td>
                                    <td style="padding-left: 16px; color: #475569; font-size: 15px; line-height: 1.6;">
                                      Connectez-vous et <strong>explorez</strong> votre nouvel espace de travail
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Support -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px 24px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                            <strong style="color: #78350f;">💬 Besoin d'aide?</strong><br>
                            Contactez <strong>${params.invitedByName}</strong> qui vous a invité pour toute question.
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
                    <p style="color: #94a3b8; font-size: 13px; margin: 20px 0 0; line-height: 1.6;">
                      Vous recevez cet email car <strong style="color: #64748b;">${params.invitedByName}</strong> vous a invité<br>
                      à rejoindre <strong style="color: #64748b;">${params.organizationName}</strong>
                    </p>
                    <p style="color: #cbd5e1; font-size: 12px; margin: 16px 0 0;">
                      Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité.
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
                <a href="${params.resetLink}" style="color: #1e40af; font-size: 12px; word-break: break-all; text-decoration: underline;">${params.resetLink}</a>
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

export function generatePasswordResetEmailHTML(params: {
  userName: string;
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
                      Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte <strong>Location Pro-Remorque</strong>.
                    </p>

                    <!-- Alerte de sécurité -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 5px solid #dc2626; padding: 24px 28px; border-radius: 12px;">
                          <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">🔐 Sécurité</p>
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
