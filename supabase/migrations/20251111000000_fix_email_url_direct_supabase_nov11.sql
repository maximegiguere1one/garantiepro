/*
  # Fix Email URLs - Direct Supabase (No Proxy)

  ## Problem
  - Cloudflare Pages does NOT support proxy (200) redirects to external URLs
  - The /api/download-warranty-direct proxy in _redirects doesn't work
  - Email links are broken in production

  ## Solution
  - Use DIRECT Supabase Edge Function URLs in emails
  - Format: https://SUPABASE_PROJECT.supabase.co/functions/v1/download-warranty-direct?token=xxx
  - No proxy needed - direct client-to-Supabase connection

  ## Security
  - Still secure: token-based authentication
  - Token expires in 90 days
  - RLS policies protect data access
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

  -- Get the secure download token
  SELECT secure_token INTO v_secure_token
  FROM warranty_download_tokens
  WHERE warranty_id = NEW.id
  LIMIT 1;

  -- Build DIRECT Supabase URL (no proxy)
  -- This works with Cloudflare Pages (no _redirects proxy needed)
  IF v_secure_token IS NOT NULL THEN
    v_download_url := 'https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/download-warranty-direct?token=' || v_secure_token;
  ELSE
    -- Fallback (should never happen with trigger)
    v_download_url := 'https://www.garantieproremorque.com/warranty/' || NEW.id::text;
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

              <!-- Bouton de téléchargement direct Supabase -->
              <table width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%%, #b91c1c 100%%); border-radius: 12px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                          <a href="%s" style="display: block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                            📄 TÉLÉCHARGER MON CONTRAT
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="background: linear-gradient(to right, #f0fdf4, #dcfce7); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px; margin: 0 0 32px;">
                <tr>
                  <td>
                    <p style="color: #166534; font-size: 14px; line-height: 1.6; margin: 0 0 12px; font-weight: 600;">
                      📋 Détails de votre garantie
                    </p>
                    <p style="color: #15803d; font-size: 14px; line-height: 1.8; margin: 0;">
                      <strong>Numéro:</strong> %s<br>
                      <strong>Plan:</strong> %s<br>
                      <strong>Montant:</strong> %s $ CAD
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                <tr>
                  <td>
                    <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0;">
                      🔒 <strong>Lien sécurisé:</strong> Ce lien est unique et sécurisé pour vous. Il expire dans 90 jours.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">
                <strong style="color: #334155;">Location Pro-Remorque</strong>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Gestion professionnelle de garanties
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
      v_total_price::text
    ),
    'warranty_created',
    now(),
    jsonb_build_object(
      'warranty_id', NEW.id,
      'contract_number', v_contract_number,
      'customer_name', v_customer_name,
      'download_token', v_secure_token
    )
  );

  RETURN NEW;
END;
$function$;

-- Log de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Email trigger updated - Direct Supabase URLs';
  RAISE NOTICE '   Format: https://PROJECT.supabase.co/functions/v1/download-warranty-direct?token=xxx';
  RAISE NOTICE '   No Cloudflare proxy needed';
  RAISE NOTICE '   Works with Cloudflare Pages restrictions';
END $$;
