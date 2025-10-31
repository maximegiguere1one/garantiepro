/*
  # Mettre à jour le Trigger Email avec Lien de Téléchargement Direct
  
  1. Changement
     - Remplacer l'ancien lien qui nécessite connexion
     - Utiliser le nouveau secure_token pour téléchargement direct
     - Format: /api/download-warranty-direct?token=[secure_token]
  
  2. Avantages
     - Client télécharge le PDF directement depuis l'email
     - Pas besoin de se connecter au site
     - Expérience utilisateur simplifiée
*/

CREATE OR REPLACE FUNCTION notify_new_warranty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_customer_email text;
  v_customer_name text;
  v_contract_number text;
  v_plan_name text;
  v_total_price numeric;
  v_base_url text;
  v_download_url text;
  v_secure_token text;
BEGIN
  -- Get customer info
  SELECT email, CONCAT(first_name, ' ', last_name)
  INTO v_customer_email, v_customer_name
  FROM customers 
  WHERE id = NEW.customer_id;

  -- Get plan name
  SELECT name INTO v_plan_name FROM warranty_plans WHERE id = NEW.plan_id;

  v_contract_number := NEW.contract_number;
  v_total_price := NEW.total_price;

  -- Build base URL
  v_base_url := 'https://www.garantieproremorque.com';

  -- Get the secure download token
  SELECT secure_token INTO v_secure_token
  FROM warranty_download_tokens
  WHERE warranty_id = NEW.id
  LIMIT 1;

  -- Build DIRECT download URL with secure token
  IF v_secure_token IS NOT NULL THEN
    v_download_url := v_base_url || '/api/download-warranty-direct?token=' || v_secure_token;
  ELSE
    -- Fallback to old URL if no token (shouldn't happen with trigger)
    v_download_url := v_base_url || '/warranty/download/' || NEW.id::text;
  END IF;

  -- Insert into email queue
  INSERT INTO email_queue (
    to_email,
    subject,
    html_body,
    template_name,
    scheduled_for,
    metadata
  ) VALUES (
    v_customer_email,
    'Votre garantie ' || v_contract_number || ' - Location Pro-Remorque',
    format('<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre garantie</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

          <!-- Header avec gradient rouge -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%%, #b91c1c 100%%); padding: 50px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 800; margin: 0 0 12px;">Location Pro-Remorque</h1>
              <p style="color: rgba(255, 255, 255, 0.95); font-size: 18px; margin: 0; font-weight: 500;">Votre garantie est prête!</p>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Bonjour <strong>%s</strong>,</p>

              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                Votre garantie <strong>%s</strong> a été créée avec succès. Vous pouvez maintenant télécharger votre contrat PDF en cliquant sur le bouton ci-dessous.
              </p>

              <!-- Bouton de téléchargement DIRECT -->
              <table width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%%, #b91c1c 100%%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);">
                      📄 Télécharger mon contrat PDF
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Note importante -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 24px; border-radius: 8px;">
                <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">💡 Téléchargement direct</p>
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                  Cliquez sur le bouton ci-dessus pour télécharger votre contrat PDF immédiatement, sans avoir besoin de vous connecter au site.
                </p>
              </div>

              <!-- Informations -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin: 0 0 24px; border-left: 4px solid #dc2626;">
                <p style="color: #64748b; font-size: 14px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;">Détails de votre garantie</p>
                <table width="100%%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #475569; font-size: 15px;">Numéro de contrat:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 15px; text-align: right;">%s</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #475569; font-size: 15px;">Plan:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 15px; text-align: right;">%s</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #475569; font-size: 15px;">Montant:</td>
                    <td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 16px; text-align: right;">%s $</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                Si vous avez des questions, n''hésitez pas à nous contacter.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #475569; font-size: 15px; font-weight: 600; margin: 0 0 8px;">Location Pro-Remorque</p>
              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">Plateforme de gestion de garanties</p>
              <p style="color: #94a3b8; font-size: 13px; margin: 20px 0 0;">
                <a href="https://www.garantieproremorque.com" style="color: #dc2626; text-decoration: none; font-weight: 600;">www.garantieproremorque.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>', 
      v_customer_name, 
      v_contract_number, 
      v_download_url, 
      v_contract_number, 
      v_plan_name, 
      v_total_price
    ),
    'warranty_created',
    now(),
    jsonb_build_object(
      'warranty_id', NEW.id,
      'customer_id', NEW.customer_id,
      'contract_number', v_contract_number,
      'download_token', v_secure_token
    )
  );

  RETURN NEW;
END;
$function$;

-- Commentaire pour documentation
COMMENT ON FUNCTION notify_new_warranty() IS 'Envoie un email au client avec un lien de téléchargement DIRECT du contrat PDF (pas besoin de connexion)';
