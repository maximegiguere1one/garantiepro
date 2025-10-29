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
  <title>Garantie confirmée</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(31, 41, 55, 0.08);">

          <!-- Header avec branding rouge Pro-Remorque -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 28px 24px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 24px; margin: 0 auto 12px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block;">
                  <path d="M20 6L9 17l-5-5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="margin: 0 0 4px; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.3px;">Garantie confirmée</h1>
              <p style="margin: 0; color: #FEE2E2; font-size: 14px; font-weight: 600;">Location Pro-Remorque</p>
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 24px;">

              <!-- Message personnalisé -->
              <p style="margin: 0 0 20px; color: #111827; font-size: 15px; line-height: 1.5;">
                Bonjour <strong style="color: #DC2626;">${customerName}</strong>, votre contrat de garantie prolongée est maintenant actif.
              </p>

              <!-- Carte d'informations -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FEF2F2; border-radius: 8px; border: 2px solid #FEE2E2; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Contrat</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">#${contractNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Plan</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Véhicule</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${trailerInfo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Durée</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${durationYears} an${durationYears > 1 ? 's' : ''}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0 0; border-top: 2px solid #FECACA;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color: #111827; font-size: 14px; font-weight: 700;">Total payé</td>
                              <td style="color: #DC2626; font-size: 18px; font-weight: 800; text-align: right;">${totalPrice.toFixed(2)} $</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA avec branding rouge -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); border-radius: 8px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);">
                          <a href="${downloadUrl}" style="display: block; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 15px; font-weight: 600;">
                            Télécharger mes documents
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note compacte -->
              <p style="margin: 0 0 16px; text-align: center; color: #6B7280; font-size: 12px; line-height: 1.5;">
                Lien valide ${expiresInDays} jours • Téléchargements illimités
              </p>

              <!-- Divider -->
              <div style="border-top: 1px solid #E5E7EB; margin: 16px 0;"></div>

              <!-- Footer simple -->
              <p style="margin: 0; text-align: center; color: #9CA3AF; font-size: 12px;">
                Des questions ? Nous sommes là pour vous aider.
              </p>
            </td>
          </tr>

          <!-- Footer noir du logo -->
          <tr>
            <td style="background-color: #1F2937; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 13px; font-weight: 700;">Location Pro-Remorque</p>
              <p style="margin: 4px 0 0; color: #D1D5DB; font-size: 11px;">Garanties prolongées professionnelles</p>
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
  <title>Warranty confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(31, 41, 55, 0.08);">

          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 28px 24px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 24px; margin: 0 auto 12px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block;">
                  <path d="M20 6L9 17l-5-5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="margin: 0 0 4px; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.3px;">Warranty confirmed</h1>
              <p style="margin: 0; color: #FEE2E2; font-size: 14px; font-weight: 600;">Location Pro-Remorque</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px;">

              <p style="margin: 0 0 20px; color: #111827; font-size: 15px; line-height: 1.5;">
                Hello <strong style="color: #DC2626;">${customerName}</strong>, your extended warranty contract is now active.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FEF2F2; border-radius: 8px; border: 2px solid #FEE2E2; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Contract</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">#${contractNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Plan</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Vehicle</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${trailerInfo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Coverage</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${durationYears} year${durationYears > 1 ? 's' : ''}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0 0; border-top: 2px solid #FECACA;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color: #111827; font-size: 14px; font-weight: 700;">Total paid</td>
                              <td style="color: #DC2626; font-size: 18px; font-weight: 800; text-align: right;">${totalPrice.toFixed(2)} $</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); border-radius: 8px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);">
                          <a href="${downloadUrl}" style="display: block; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 15px; font-weight: 600;">
                            Download my documents
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; text-align: center; color: #6B7280; font-size: 12px; line-height: 1.5;">
                Link valid ${expiresInDays} days • Unlimited downloads
              </p>

              <div style="border-top: 1px solid #E5E7EB; margin: 16px 0;"></div>

              <p style="margin: 0; text-align: center; color: #9CA3AF; font-size: 12px;">
                Questions? We're here to help.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #1F2937; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 13px; font-weight: 700;">Location Pro-Remorque</p>
              <p style="margin: 4px 0 0; color: #D1D5DB; font-size: 11px;">Professional Extended Warranties</p>
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
