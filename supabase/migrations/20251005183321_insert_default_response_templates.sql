/*
  # Insérer templates de réponses par défaut
*/

DO $$
DECLARE
  v_org RECORD;
  v_admin_id uuid;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE organization_id = v_org.id
      AND role = 'admin'
    LIMIT 1;
    
    INSERT INTO response_templates (
      organization_id,
      name,
      category,
      subject,
      body,
      variables,
      created_by
    ) VALUES (
      v_org.id,
      'Approbation Standard',
      'approval',
      'Votre réclamation #{{claim_number}} a été approuvée',
      'Bonjour {{customer_name}},

Nous avons le plaisir de vous informer que votre réclamation #{{claim_number}} a été approuvée.

Détails de la réclamation:
- Numéro de garantie: {{warranty_number}}
- Montant approuvé: {{approved_amount}}$
- Date d''approbation: {{approval_date}}

Le traitement de votre demande sera effectué dans les prochains jours ouvrables.

Si vous avez des questions, n''hésitez pas à nous contacter.

Cordialement,
L''équipe {{company_name}}',
      '["customer_name", "claim_number", "warranty_number", "approved_amount", "approval_date", "company_name"]'::jsonb,
      v_admin_id
    ) ON CONFLICT (organization_id, name) DO NOTHING;
    
    INSERT INTO response_templates (
      organization_id,
      name,
      category,
      subject,
      body,
      variables,
      created_by
    ) VALUES (
      v_org.id,
      'Rejet Standard',
      'rejection',
      'Votre réclamation #{{claim_number}} - Décision',
      'Bonjour {{customer_name}},

Nous avons examiné votre réclamation #{{claim_number}} avec attention.

Malheureusement, nous ne pouvons pas approuver cette réclamation pour la raison suivante:
{{rejection_reason}}

Détails de la réclamation:
- Numéro de garantie: {{warranty_number}}
- Date de soumission: {{submission_date}}

Si vous pensez qu''il s''agit d''une erreur ou si vous souhaitez des informations complémentaires, n''hésitez pas à nous contacter.

Cordialement,
L''équipe {{company_name}}',
      '["customer_name", "claim_number", "warranty_number", "rejection_reason", "submission_date", "company_name"]'::jsonb,
      v_admin_id
    ) ON CONFLICT (organization_id, name) DO NOTHING;
    
    INSERT INTO response_templates (
      organization_id,
      name,
      category,
      subject,
      body,
      variables,
      created_by
    ) VALUES (
      v_org.id,
      'Demande d''Information',
      'info_request',
      'Réclamation #{{claim_number}} - Informations supplémentaires requises',
      'Bonjour {{customer_name}},

Nous avons bien reçu votre réclamation #{{claim_number}}.

Pour poursuivre le traitement de votre dossier, nous aurions besoin des informations suivantes:
{{required_info}}

Merci de nous fournir ces éléments dans les plus brefs délais.

Cordialement,
L''équipe {{company_name}}',
      '["customer_name", "claim_number", "required_info", "company_name"]'::jsonb,
      v_admin_id
    ) ON CONFLICT (organization_id, name) DO NOTHING;
    
  END LOOP;
END $$;
