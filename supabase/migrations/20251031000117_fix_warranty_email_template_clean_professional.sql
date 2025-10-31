/*
  # Correction Template Email de Garantie - Design Professionnel et Propre
  
  ## Problème identifié
  - HTML mal formaté avec concaténations qui créent des espaces
  - Texte étiré et mal structuré
  - Manque de responsive design
  
  ## Solution
  - Template HTML propre et bien structuré
  - Design responsive avec max-width
  - Typographie claire et lisible
  - Espacement cohérent
  - Couleurs professionnelles
*/

CREATE OR REPLACE FUNCTION notify_new_warranty()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_customer_email text;
  v_customer_language text;
  v_vin text;
  v_plan_name text;
  v_subject text;
  v_body text;
  v_download_token uuid;
  v_download_url text;
  v_trailer_info text;
  v_base_url text;
  v_total_price text;
BEGIN
  v_base_url := 'https://app.garantieproremorque.com';

  -- Récupérer les informations
  SELECT
    c.first_name || ' ' || c.last_name,
    c.email,
    COALESCE(c.language_preference, 'fr'),
    COALESCE(t.vin, 'Non disponible'),
    t.year || ' ' || t.make || ' ' || t.model,
    wp.name
  INTO
    v_customer_name,
    v_customer_email,
    v_customer_language,
    v_vin,
    v_trailer_info,
    v_plan_name
  FROM customers c
  LEFT JOIN trailers t ON t.customer_id = c.id
  LEFT JOIN warranty_plans wp ON wp.id = NEW.plan_id
  WHERE c.id = NEW.customer_id
  LIMIT 1;

  -- Valeurs par défaut
  v_customer_name := COALESCE(v_customer_name, 'Client');
  v_trailer_info := COALESCE(v_trailer_info, 'Non disponible');
  v_plan_name := COALESCE(v_plan_name, 'Plan de garantie');
  v_total_price := COALESCE(NEW.total_price::text, '0');

  -- Créer token de téléchargement
  BEGIN
    v_download_token := create_warranty_download_token(
      NEW.id,
      v_customer_email,
      v_customer_name,
      90,
      NULL
    );
    v_download_url := v_base_url || '/download-warranty?token=' || v_download_token;
  EXCEPTION
    WHEN OTHERS THEN
      v_download_token := NULL;
      v_download_url := v_base_url || '/warranties';
  END;

  -- Email au client
  IF v_customer_email IS NOT NULL AND v_customer_email != '' THEN
    IF v_customer_language = 'fr' THEN
      v_subject := 'Confirmation de votre garantie - ' || NEW.contract_number;
      
      -- Template HTML propre et responsive
      v_body := '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de garantie</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✓ Garantie Confirmée</h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Votre contrat est maintenant actif</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.5;">
                Bonjour <strong>' || v_customer_name || '</strong>,
              </p>
              
              <p style="margin: 0 0 30px; color: #475569; font-size: 15px; line-height: 1.6;">
                Merci d''avoir choisi notre garantie prolongée! Votre contrat a été signé avec succès et est maintenant actif.
              </p>
              
              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px; color: #16a34a; font-size: 18px; font-weight: bold;">Détails de votre garantie</h2>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Numéro de contrat:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || NEW.contract_number || '
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Plan:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || v_plan_name || '
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Montant total:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: bold; text-align: right;">
                          ' || v_total_price || ' $ CAD
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Remorque:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || v_trailer_info || '
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>VIN:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || v_vin || '
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>';

      -- Ajout du bouton de téléchargement si disponible
      IF v_download_url IS NOT NULL THEN
        v_body := v_body || '
              <!-- Download Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 32px 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                      📄 Vos Documents
                    </p>
                    <p style="margin: 0 0 24px; color: #1e293b; font-size: 16px;">
                      Téléchargez votre contrat et facture
                    </p>
                    <a href="' || v_download_url || '" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      Télécharger mes documents →
                    </a>
                    <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
                      🔒 Lien sécurisé valide pendant 90 jours
                    </p>
                  </td>
                </tr>
              </table>';
      END IF;

      v_body := v_body || '
              <!-- Footer -->
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Pour toute question, n''hésitez pas à nous contacter.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Cordialement,<br>
                <strong>L''équipe Location Pro-Remorque</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #f9fafb; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2025 Location Pro-Remorque. Tous droits réservés.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';

    ELSE
      -- English version
      v_subject := 'Your Warranty Confirmation - ' || NEW.contract_number;
      
      v_body := '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warranty Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✓ Warranty Confirmed</h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Your contract is now active</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.5;">
                Hello <strong>' || v_customer_name || '</strong>,
              </p>
              
              <p style="margin: 0 0 30px; color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for choosing our extended warranty! Your contract has been successfully signed and is now active.
              </p>
              
              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px; color: #16a34a; font-size: 18px; font-weight: bold;">Warranty Details</h2>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Contract number:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || NEW.contract_number || '
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Plan:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || v_plan_name || '
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Total amount:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: bold; text-align: right;">
                          ' || v_total_price || ' $ CAD
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>Trailer:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || v_trailer_info || '
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #374151; font-size: 14px;">
                          <strong>VIN:</strong>
                        </td>
                        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; text-align: right;">
                          ' || v_vin || '
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>';

      IF v_download_url IS NOT NULL THEN
        v_body := v_body || '
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 32px 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                      📄 Your Documents
                    </p>
                    <p style="margin: 0 0 24px; color: #1e293b; font-size: 16px;">
                      Download your contract and invoice
                    </p>
                    <a href="' || v_download_url || '" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      Download my documents →
                    </a>
                    <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
                      🔒 Secure link valid for 90 days
                    </p>
                  </td>
                </tr>
              </table>';
      END IF;

      v_body := v_body || '
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                For any questions, please don''t hesitate to contact us.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Best regards,<br>
                <strong>Location Pro-Remorque Team</strong>
              </p>
              
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 30px; background-color: #f9fafb; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2025 Location Pro-Remorque. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
    END IF;

    -- Envoyer l'email
    PERFORM queue_email(
      v_customer_email,
      v_subject,
      v_body,
      NULL,
      NEW.organization_id,
      'high',
      jsonb_build_object(
        'event_type', 'warranty_confirmation',
        'warranty_id', NEW.id,
        'contract_number', NEW.contract_number,
        'has_download_link', (v_download_token IS NOT NULL)
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_new_warranty: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_notify_new_warranty ON warranties;

CREATE TRIGGER trigger_notify_new_warranty
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_warranty();

COMMENT ON FUNCTION notify_new_warranty IS 
'Envoie un email de confirmation propre et professionnel au client après création d''une garantie';
