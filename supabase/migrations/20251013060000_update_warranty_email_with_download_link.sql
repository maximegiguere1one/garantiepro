/*
  # Mise à Jour du Système d'Email de Garantie avec Lien de Téléchargement

  ## Description
  Met à jour le trigger qui envoie l'email de confirmation de garantie
  pour inclure automatiquement:
  1. Génération d'un token de téléchargement sécurisé
  2. Email envoyé au client (pas juste aux admins)
  3. Lien de téléchargement dans l'email
  4. Template professionnel avec toutes les informations

  ## Changements
  - Modification du trigger notify_new_warranty
  - Ajout de la génération automatique du token de téléchargement
  - Envoi d'email au client avec le lien de téléchargement
  - Maintien de la notification aux admins
*/

-- =====================================================
-- Remplacer le trigger pour envoyer email au client
-- avec lien de téléchargement
-- =====================================================

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
BEGIN
  -- Déterminer l'URL de base (production ou développement)
  -- En production, utiliser le domaine configuré
  v_base_url := 'https://app.garantieproremorque.com';

  -- Récupérer les informations du client et de la remorque
  SELECT
    c.first_name || ' ' || c.last_name,
    c.email,
    COALESCE(c.language_preference, 'fr'),
    COALESCE(t.vin, 'VIN non disponible'),
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

  -- Si pas trouvé, utiliser des valeurs par défaut
  IF v_customer_name IS NULL THEN
    v_customer_name := 'Client';
  END IF;

  IF v_vin IS NULL THEN
    v_vin := 'VIN non disponible';
  END IF;

  IF v_trailer_info IS NULL THEN
    v_trailer_info := 'Information non disponible';
  END IF;

  IF v_plan_name IS NULL THEN
    v_plan_name := 'Plan de garantie';
  END IF;

  -- ========================================================
  -- NOUVEAU: Créer un token de téléchargement pour le client
  -- ========================================================
  BEGIN
    v_download_token := create_warranty_download_token(
      NEW.id,                    -- warranty_id
      v_customer_email,          -- customer_email
      v_customer_name,           -- customer_name
      90,                        -- expires_in_days (3 mois)
      NULL                       -- max_downloads (illimité)
    );

    -- Construire l'URL de téléchargement
    v_download_url := v_base_url || '/download-warranty?token=' || v_download_token;

    RAISE NOTICE 'Download token created: % for warranty: %', v_download_token, NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Si la création du token échoue, continuer sans lien de téléchargement
      RAISE WARNING 'Failed to create download token for warranty %: %', NEW.id, SQLERRM;
      v_download_token := NULL;
      v_download_url := v_base_url || '/warranties';
  END;

  -- ========================================================
  -- NOUVEAU: Envoyer email de confirmation AU CLIENT
  -- avec le lien de téléchargement
  -- ========================================================
  IF v_customer_email IS NOT NULL AND v_customer_email != '' THEN
    IF v_customer_language = 'fr' THEN
      v_subject := '✓ Confirmation de votre garantie - ' || NEW.contract_number;
      v_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">' ||
                '<div style="text-align: center; margin-bottom: 30px;">' ||
                '<h1 style="color: #16a34a; margin: 0;">Garantie Confirmée!</h1>' ||
                '<p style="color: #6b7280; font-size: 14px;">Votre contrat de garantie prolongée est maintenant actif</p>' ||
                '</div>' ||
                '<p style="color: #1e293b; font-size: 16px;">Bonjour <strong>' || v_customer_name || '</strong>,</p>' ||
                '<p style="color: #475569;">Merci d\'avoir choisi notre garantie prolongée! Votre contrat a été signé avec succès et est maintenant actif.</p>' ||
                '<div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 4px;">' ||
                '<h2 style="color: #16a34a; margin-top: 0; font-size: 16px;">Détails de votre garantie</h2>' ||
                '<p style="margin: 5px 0;"><strong>Numéro de contrat:</strong> ' || NEW.contract_number || '</p>' ||
                '<p style="margin: 5px 0;"><strong>Plan:</strong> ' || v_plan_name || '</p>' ||
                '<p style="margin: 5px 0;"><strong>Montant total:</strong> ' || COALESCE(NEW.total_price::text, '0') || ' $ CAD</p>' ||
                '<p style="margin: 5px 0;"><strong>Remorque:</strong> ' || v_trailer_info || '</p>' ||
                '<p style="margin: 5px 0;"><strong>VIN:</strong> ' || v_vin || '</p>' ||
                '</div>';

      -- Ajouter le lien de téléchargement si disponible
      IF v_download_url IS NOT NULL THEN
        v_body := v_body ||
                '<div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; margin: 30px 0; border-radius: 12px; text-align: center; border: 2px solid #3b82f6;">' ||
                '<p style="color: #1e40af; font-size: 14px; font-weight: bold; margin: 0 0 10px;">📄 VOS DOCUMENTS</p>' ||
                '<p style="color: #1e293b; font-size: 16px; margin: 0 0 20px;">Téléchargez votre contrat et facture</p>' ||
                '<a href="' || v_download_url || '" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Télécharger mes documents →</a>' ||
                '<p style="color: #64748b; font-size: 12px; margin: 15px 0 0;">🔒 Lien sécurisé valide pendant 90 jours</p>' ||
                '</div>';
      END IF;

      v_body := v_body ||
                '<p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Pour toute question, n\'hésitez pas à nous contacter.</p>' ||
                '<p style="color: #6b7280; font-size: 14px;">Cordialement,<br><strong>L\'équipe Location Pro-Remorque</strong></p>' ||
                '</div>';
    ELSE
      -- English version
      v_subject := '✓ Your Warranty Confirmation - ' || NEW.contract_number;
      v_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">' ||
                '<div style="text-align: center; margin-bottom: 30px;">' ||
                '<h1 style="color: #16a34a; margin: 0;">Warranty Confirmed!</h1>' ||
                '<p style="color: #6b7280; font-size: 14px;">Your extended warranty contract is now active</p>' ||
                '</div>' ||
                '<p style="color: #1e293b; font-size: 16px;">Hello <strong>' || v_customer_name || '</strong>,</p>' ||
                '<p style="color: #475569;">Thank you for choosing our extended warranty! Your contract has been successfully signed and is now active.</p>' ||
                '<div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 4px;">' ||
                '<h2 style="color: #16a34a; margin-top: 0; font-size: 16px;">Warranty Details</h2>' ||
                '<p style="margin: 5px 0;"><strong>Contract number:</strong> ' || NEW.contract_number || '</p>' ||
                '<p style="margin: 5px 0;"><strong>Plan:</strong> ' || v_plan_name || '</p>' ||
                '<p style="margin: 5px 0;"><strong>Total amount:</strong> ' || COALESCE(NEW.total_price::text, '0') || ' $ CAD</p>' ||
                '<p style="margin: 5px 0;"><strong>Trailer:</strong> ' || v_trailer_info || '</p>' ||
                '<p style="margin: 5px 0;"><strong>VIN:</strong> ' || v_vin || '</p>' ||
                '</div>';

      -- Add download link if available
      IF v_download_url IS NOT NULL THEN
        v_body := v_body ||
                '<div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; margin: 30px 0; border-radius: 12px; text-align: center; border: 2px solid #3b82f6;">' ||
                '<p style="color: #1e40af; font-size: 14px; font-weight: bold; margin: 0 0 10px;">📄 YOUR DOCUMENTS</p>' ||
                '<p style="color: #1e293b; font-size: 16px; margin: 0 0 20px;">Download your contract and invoice</p>' ||
                '<a href="' || v_download_url || '" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Download my documents →</a>' ||
                '<p style="color: #64748b; font-size: 12px; margin: 15px 0 0;">🔒 Secure link valid for 90 days</p>' ||
                '</div>';
      END IF;

      v_body := v_body ||
                '<p style="color: #6b7280; font-size: 14px; margin-top: 30px;">For any questions, please don\'t hesitate to contact us.</p>' ||
                '<p style="color: #6b7280; font-size: 14px;">Best regards,<br><strong>Location Pro-Remorque Team</strong></p>' ||
                '</div>';
    END IF;

    -- Envoyer l'email au client avec haute priorité
    PERFORM queue_email(
      v_customer_email,
      v_subject,
      v_body,
      NULL, -- from_email (use default)
      NEW.organization_id,
      'high', -- priority
      jsonb_build_object(
        'event_type', 'warranty_confirmation',
        'warranty_id', NEW.id,
        'contract_number', NEW.contract_number,
        'has_download_link', (v_download_token IS NOT NULL)
      )
    );
  END IF;

  -- ========================================================
  -- Envoyer notification aux admins (conservé tel quel)
  -- ========================================================
  v_subject := 'Nouvelle garantie créée - ' || NEW.contract_number;
  v_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' ||
            '<h2 style="color: #1e40af;">Nouvelle garantie créée</h2>' ||
            '<p>Une nouvelle garantie a été créée pour le client: <strong>' || v_customer_name || '</strong></p>' ||
            '<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">' ||
            '<h3 style="margin-top: 0;">Détails de la garantie</h3>' ||
            '<ul style="list-style: none; padding: 0;">' ||
            '<li style="padding: 5px 0;"><strong>Numéro de contrat:</strong> ' || NEW.contract_number || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Client:</strong> ' || v_customer_name || '</li>' ||
            '<li style="padding: 5px 0;"><strong>VIN:</strong> ' || v_vin || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Montant total:</strong> ' || COALESCE(NEW.total_price::text, '0') || ' $ CAD</li>' ||
            '<li style="padding: 5px 0;"><strong>Date de début:</strong> ' || TO_CHAR(NEW.start_date, 'DD/MM/YYYY') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Date de fin:</strong> ' || TO_CHAR(NEW.end_date, 'DD/MM/YYYY') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Statut:</strong> ' || NEW.status || '</li>' ||
            '</ul>' ||
            '</div>' ||
            '<p style="color: #6b7280; font-size: 12px;">Cette notification a été envoyée automatiquement par le système de gestion des garanties.</p>' ||
            '</div>';

  -- Envoyer la notification uniquement aux admins
  PERFORM send_email_notification(
    NEW.organization_id,
    'new_warranty',
    v_subject,
    v_body,
    'admin'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas bloquer l'insertion
    RAISE WARNING 'Error in notify_new_warranty: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le trigger existe déjà, pas besoin de le recréer
-- TRIGGER trigger_notify_new_warranty est déjà en place

-- =====================================================
-- Note: Cette migration améliore considérablement
-- l'expérience client en envoyant un email professionnel
-- avec un lien de téléchargement sécurisé directement
-- après la création de la garantie.
-- =====================================================
