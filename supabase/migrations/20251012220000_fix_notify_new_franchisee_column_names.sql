/*
  # Correction du Trigger notify_new_franchisee - Noms de Colonnes

  ## Problème Identifié
  Le trigger `notify_new_franchisee()` tente d'accéder aux colonnes:
  - NEW.email → n'existe pas
  - NEW.phone → n'existe pas

  La table organizations utilise en réalité:
  - billing_email
  - billing_phone

  ## Solution
  Recréer la fonction trigger avec les bons noms de colonnes et ajouter
  une gestion d'erreur robuste pour ne jamais bloquer l'insertion.

  ## Impact
  - Permet la création de franchises sans erreur
  - Les notifications email continueront de fonctionner correctement
  - Gestion d'erreur ajoutée pour la résilience
*/

-- =====================================================
-- Fonction corrigée pour notifier nouvelle franchise
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_franchisee()
RETURNS TRIGGER AS $$
DECLARE
  v_subject text;
  v_body text;
  v_owner_org_id uuid;
BEGIN
  -- Notifier uniquement pour les franchisés
  IF NEW.type != 'franchisee' THEN
    RETURN NEW;
  END IF;

  -- Trouver l'organisation propriétaire
  SELECT id INTO v_owner_org_id
  FROM organizations
  WHERE type = 'owner' OR is_master = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- Si pas d'organisation propriétaire, ne pas envoyer de notification
  IF v_owner_org_id IS NULL THEN
    RAISE WARNING 'No owner organization found for new franchisee notification';
    RETURN NEW;
  END IF;

  -- Construire le sujet et le corps de l'email
  v_subject := 'Nouveau franchisé créé - ' || NEW.name;
  v_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' ||
            '<h2 style="color: #10b981;">Nouveau franchisé créé</h2>' ||
            '<p>Un nouveau franchisé a été ajouté au système.</p>' ||
            '<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">' ||
            '<h3 style="margin-top: 0;">Détails du franchisé</h3>' ||
            '<ul style="list-style: none; padding: 0;">' ||
            '<li style="padding: 5px 0;"><strong>Nom:</strong> ' || NEW.name || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Email de facturation:</strong> ' || COALESCE(NEW.billing_email, 'N/A') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Téléphone:</strong> ' || COALESCE(NEW.billing_phone, 'N/A') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Adresse:</strong> ' || COALESCE(NEW.address, 'N/A') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Ville:</strong> ' || COALESCE(NEW.city, 'N/A') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Province:</strong> ' || COALESCE(NEW.province, 'N/A') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Code postal:</strong> ' || COALESCE(NEW.postal_code, 'N/A') || '</li>';

  -- Ajouter le code de franchise si disponible
  IF NEW.franchise_code IS NOT NULL THEN
    v_body := v_body || '<li style="padding: 5px 0;"><strong>Code de franchise:</strong> ' || NEW.franchise_code || '</li>';
  END IF;

  v_body := v_body ||
            '</ul>' ||
            '</div>' ||
            '<p style="color: #6b7280; font-size: 12px;">Cette notification a été envoyée automatiquement par le système de gestion des franchises.</p>' ||
            '</div>';

  -- Envoyer la notification au propriétaire principal
  PERFORM send_email_notification(
    v_owner_org_id,
    'new_franchisee',
    v_subject,
    v_body,
    'admin'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur mais NE PAS bloquer l'insertion
    RAISE WARNING 'Error in notify_new_franchisee trigger: %. Franchisee creation will continue.', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Recréer le trigger (s'assurer qu'il existe)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notify_new_franchisee ON organizations;
CREATE TRIGGER trigger_notify_new_franchisee
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_franchisee();

-- =====================================================
-- Commentaires et documentation
-- =====================================================

COMMENT ON FUNCTION notify_new_franchisee IS 'Trigger corrigé: notifie les admins lors de la création d''un nouveau franchisé. Utilise billing_email et billing_phone. Ne bloque jamais l''insertion en cas d''erreur.';

-- =====================================================
-- Vérification finale
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRECTION TRIGGER APPLIQUÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Fonction notify_new_franchisee() corrigée';
  RAISE NOTICE '✓ Utilise maintenant: billing_email, billing_phone';
  RAISE NOTICE '✓ Gestion d''erreur robuste ajoutée';
  RAISE NOTICE '✓ Trigger recréé sur organizations';
  RAISE NOTICE '========================================';
END $$;
