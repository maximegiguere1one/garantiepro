/**
 * Template Email - Couleurs officielles Pro-Remorque (Rouge #DC2626 et Noir #1F2937)
 */
export function generateWarrantyConfirmationEmailHTML(params: {
  customerName: string;
  contractNumber: string;
  planName: string;
  totalPrice: number;
  startDate: string;
  endDate: string;
  trailerInfo: string;
  vin: string;
  downloadUrl: string;
  expiresInDays: number;
  language: 'fr' | 'en';
}): string {
  const {
    customerName,
    contractNumber,
    planName,
    totalPrice,
    startDate,
    endDate,
    trailerInfo,
    vin,
    downloadUrl,
    expiresInDays,
    language,
  } = params;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationYears = Math.round((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  if (language === 'fr') {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Garantie confirmée - Garantie Pro-Remorque</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">

          <!-- Header professionnel -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 48px 32px; text-align: center; position: relative;">
              <!-- Logo -->
              <div style="width: 64px; height: 64px; background-color: #ffffff; border-radius: 16px; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="display: block;">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Garantie Confirmée</h1>
              <p style="margin: 0; color: #FEE2E2; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">GARANTIE PRO-REMORQUE</p>
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 24px;">

              <!-- Message de bienvenue professionnel -->
              <div style="background: linear-gradient(to right, #FEF2F2, #ffffff); border-left: 4px solid #DC2626; padding: 20px; border-radius: 8px; margin-bottom: 28px;">
                <p style="margin: 0 0 8px; color: #1F2937; font-size: 16px; line-height: 1.6; font-weight: 600;">
                  Bonjour <span style="color: #DC2626; font-weight: 700;">${customerName}</span>,
                </p>
                <p style="margin: 0; color: #4B5563; font-size: 15px; line-height: 1.6;">
                  Nous avons le plaisir de confirmer que votre contrat de garantie prolongée est maintenant <strong>actif et en vigueur</strong>. Votre véhicule est désormais protégé.
                </p>
              </div>

              <!-- Carte d'informations professionnelle -->
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 700;">📋 Détails de votre contrat</h2>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #FEF2F2 0%, #ffffff 100%); border-radius: 12px; border: 1px solid #FEE2E2; margin: 0 0 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">📄 Numéro de contrat</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right; font-family: 'Courier New', monospace;">#${contractNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">🛡️ Plan de garantie</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">🚛 Véhicule assuré</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${trailerInfo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">📅 Période de couverture</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${durationYears} an${durationYears > 1 ? 's' : ''}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 20px 0 0; border-top: 2px solid #DC2626;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color: #1F2937; font-size: 16px; font-weight: 700;">💰 Montant total</td>
                              <td style="color: #DC2626; font-size: 24px; font-weight: 900; text-align: right; letter-spacing: -0.5px;">${totalPrice.toFixed(2)} $</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA professionnel premium -->
              <div style="background: linear-gradient(to bottom, #FEF2F2, #ffffff); border: 2px solid #FEE2E2; border-radius: 12px; padding: 24px; margin: 0 0 28px; text-align: center;">
                <h3 style="margin: 0 0 12px; color: #1F2937; font-size: 16px; font-weight: 700;">📥 Accédez à vos documents</h3>
                <p style="margin: 0 0 20px; color: #6B7280; font-size: 14px; line-height: 1.5;">
                  Téléchargez votre contrat de garantie et tous les documents associés en un seul clic.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.4), 0 4px 6px -2px rgba(220, 38, 38, 0.3);">
                            <a href="${downloadUrl}" style="display: inline-flex; align-items: center; gap: 8px; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display: inline-block; vertical-align: middle;">
                                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                              <span style="vertical-align: middle;">Télécharger mes documents</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 16px; padding: 12px; background-color: #FEF9C3; border: 1px solid #FDE047; border-radius: 8px;">
                  <p style="margin: 0; color: #854D0E; font-size: 13px; font-weight: 600; line-height: 1.4;">
                    🔒 Lien sécurisé valide ${expiresInDays} jours • Téléchargements illimités • Aucune connexion requise
                  </p>
                </div>
              </div>

              <!-- Informations importantes -->
              <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; border-radius: 8px; margin: 0 0 24px;">
                <h4 style="margin: 0 0 8px; color: #1E40AF; font-size: 14px; font-weight: 700;">ℹ️ Informations importantes</h4>
                <ul style="margin: 0; padding-left: 20px; color: #1F2937; font-size: 13px; line-height: 1.6;">
                  <li style="margin-bottom: 4px;">Conservez ce courriel pour vos dossiers</li>
                  <li style="margin-bottom: 4px;">Le contrat prend effet immédiatement</li>
                  <li style="margin-bottom: 4px;">En cas de réclamation, utilisez votre numéro de contrat</li>
                </ul>
              </div>

              <!-- Contact professionnel -->
              <div style="background: linear-gradient(to right, #F9FAFB, #ffffff); border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 12px; color: #1F2937; font-size: 15px; font-weight: 700;">💬 Besoin d'assistance ?</p>
                <p style="margin: 0 0 16px; color: #6B7280; font-size: 14px; line-height: 1.5;">
                  Notre équipe est à votre disposition pour répondre à toutes vos questions.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <a href="mailto:info@garantieproremorque.com" style="display: inline-block; color: #DC2626; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 24px; border: 2px solid #DC2626; border-radius: 8px; transition: all 0.3s;">
                        Nous contacter
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer professionnel premium -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); padding: 32px 24px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: #DC2626; border-radius: 12px; margin: 0 auto 16px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block;">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <p style="margin: 0 0 4px; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">GARANTIE PRO-REMORQUE</p>
              <p style="margin: 0 0 16px; color: #D1D5DB; font-size: 13px; font-weight: 500;">Garanties prolongées professionnelles</p>

              <div style="border-top: 1px solid #374151; padding-top: 16px; margin-top: 16px;">
                <p style="margin: 0 0 8px; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
                  📧 info@garantieproremorque.com<br>
                  📍 Québec, Canada
                </p>
                <p style="margin: 0; color: #6B7280; font-size: 11px;">
                  © ${new Date().getFullYear()} Garantie Pro-Remorque. Tous droits réservés.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  } else {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Warranty Confirmed - Garantie Pro-Remorque</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">

          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 48px 32px; text-align: center; position: relative;">
              <div style="width: 64px; height: 64px; background-color: #ffffff; border-radius: 16px; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="display: block;">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Warranty Confirmed</h1>
              <p style="margin: 0; color: #FEE2E2; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">GARANTIE PRO-REMORQUE</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px;">

              <div style="background: linear-gradient(to right, #FEF2F2, #ffffff); border-left: 4px solid #DC2626; padding: 20px; border-radius: 8px; margin-bottom: 28px;">
                <p style="margin: 0 0 8px; color: #1F2937; font-size: 16px; line-height: 1.6; font-weight: 600;">
                  Hello <span style="color: #DC2626; font-weight: 700;">${customerName}</span>,
                </p>
                <p style="margin: 0; color: #4B5563; font-size: 15px; line-height: 1.6;">
                  We are pleased to confirm that your extended warranty contract is now <strong>active and in effect</strong>. Your vehicle is now protected.
                </p>
              </div>

              <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 700;">📋 Contract Details</h2>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #FEF2F2 0%, #ffffff 100%); border-radius: 12px; border: 1px solid #FEE2E2; margin: 0 0 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">📄 Contract Number</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right; font-family: 'Courier New', monospace;">#${contractNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">🛡️ Warranty Plan</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">🚛 Insured Vehicle</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${trailerInfo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">📅 Coverage Period</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${durationYears} year${durationYears > 1 ? 's' : ''}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 20px 0 0; border-top: 2px solid #DC2626;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color: #1F2937; font-size: 16px; font-weight: 700;">💰 Total Amount</td>
                              <td style="color: #DC2626; font-size: 24px; font-weight: 900; text-align: right; letter-spacing: -0.5px;">${totalPrice.toFixed(2)} $</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background: linear-gradient(to bottom, #FEF2F2, #ffffff); border: 2px solid #FEE2E2; border-radius: 12px; padding: 24px; margin: 0 0 28px; text-align: center;">
                <h3 style="margin: 0 0 12px; color: #1F2937; font-size: 16px; font-weight: 700;">📥 Access Your Documents</h3>
                <p style="margin: 0 0 20px; color: #6B7280; font-size: 14px; line-height: 1.5;">
                  Download your warranty contract and all associated documents with a single click.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.4), 0 4px 6px -2px rgba(220, 38, 38, 0.3);">
                            <a href="${downloadUrl}" style="display: inline-flex; align-items: center; gap: 8px; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display: inline-block; vertical-align: middle;">
                                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                              <span style="vertical-align: middle;">Download My Documents</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 16px; padding: 12px; background-color: #FEF9C3; border: 1px solid #FDE047; border-radius: 8px;">
                  <p style="margin: 0; color: #854D0E; font-size: 13px; font-weight: 600; line-height: 1.4;">
                    🔒 Secure link valid ${expiresInDays} days • Unlimited downloads • No login required
                  </p>
                </div>
              </div>

              <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; border-radius: 8px; margin: 0 0 24px;">
                <h4 style="margin: 0 0 8px; color: #1E40AF; font-size: 14px; font-weight: 700;">ℹ️ Important Information</h4>
                <ul style="margin: 0; padding-left: 20px; color: #1F2937; font-size: 13px; line-height: 1.6;">
                  <li style="margin-bottom: 4px;">Keep this email for your records</li>
                  <li style="margin-bottom: 4px;">Your contract is effective immediately</li>
                  <li style="margin-bottom: 4px;">Use your contract number for any claims</li>
                </ul>
              </div>

              <div style="background: linear-gradient(to right, #F9FAFB, #ffffff); border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 12px; color: #1F2937; font-size: 15px; font-weight: 700;">💬 Need Assistance?</p>
                <p style="margin: 0 0 16px; color: #6B7280; font-size: 14px; line-height: 1.5;">
                  Our team is available to answer all your questions.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <a href="mailto:info@garantieproremorque.com" style="display: inline-block; color: #DC2626; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 24px; border: 2px solid #DC2626; border-radius: 8px;">
                        Contact Us
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); padding: 32px 24px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: #DC2626; border-radius: 12px; margin: 0 auto 16px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block;">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <p style="margin: 0 0 4px; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">GARANTIE PRO-REMORQUE</p>
              <p style="margin: 0 0 16px; color: #D1D5DB; font-size: 13px; font-weight: 500;">Professional Extended Warranties</p>

              <div style="border-top: 1px solid #374151; padding-top: 16px; margin-top: 16px;">
                <p style="margin: 0 0 8px; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
                  📧 info@garantieproremorque.com<br>
                  📍 Quebec, Canada
                </p>
                <p style="margin: 0; color: #6B7280; font-size: 11px;">
                  © ${new Date().getFullYear()} Garantie Pro-Remorque. All rights reserved.
                </p>
              </div>
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
}
