/*
  # Email Templates Management System

  ## Summary
  Creates a comprehensive email template management system that allows dealers to:
  - View all email templates in the system
  - Customize email subject and body for each template
  - Use dynamic variables (e.g., {{customer_name}}, {{contract_number}})
  - Test emails before sending to customers
  - Support for French and English versions
  - Track email history and status

  ## New Tables
  
  ### `email_templates`
  Stores all customizable email templates with multi-language support
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, foreign key to auth.users) - null for system templates
  - `template_key` (text) - unique identifier (e.g., 'warranty_created', 'claim_approved')
  - `name` (text) - friendly name for display
  - `description` (text) - explains when this email is sent
  - `category` (text) - groups templates (e.g., 'warranty', 'claim', 'customer')
  - `subject_fr` (text) - French email subject
  - `subject_en` (text) - English email subject
  - `body_fr` (text) - French email body
  - `body_en` (text) - English email body
  - `available_variables` (jsonb) - list of variables that can be used
  - `is_active` (boolean) - whether template can be used
  - `is_system` (boolean) - true for default system templates
  - `preview_data` (jsonb) - sample data for preview/testing
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `email_history`
  Tracks all sent emails for auditing and debugging
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, foreign key)
  - `template_key` (text)
  - `recipient_email` (text)
  - `recipient_name` (text)
  - `subject` (text)
  - `body` (text)
  - `language` (text)
  - `status` (text) - 'sent', 'failed', 'pending'
  - `error_message` (text)
  - `sent_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Dealers can only read/update their own templates
  - Dealers can read system templates (is_system = true)
  - System templates cannot be deleted, only overridden
  - Email history is private to each dealer

  ## Features
  - Variable replacement system ({{variable_name}})
  - Live preview with sample data
  - Test email functionality
  - Clone system templates to customize
  - Reset to system defaults
*/

-- =====================================================
-- 1. Create email_templates table
-- =====================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  subject_fr text NOT NULL,
  subject_en text NOT NULL,
  body_fr text NOT NULL,
  body_en text NOT NULL,
  available_variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  preview_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_dealer ON email_templates(dealer_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_dealer_key ON email_templates(dealer_id, template_key) WHERE dealer_id IS NOT NULL;

-- =====================================================
-- 2. Create email_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body text NOT NULL,
  language text DEFAULT 'fr',
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_history_dealer ON email_history(dealer_id);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_created ON email_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_history_recipient ON email_history(recipient_email);

-- =====================================================
-- 3. Enable RLS
-- =====================================================

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS Policies for email_templates
-- =====================================================

CREATE POLICY "Dealers can view system templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_system = true OR dealer_id = auth.uid());

CREATE POLICY "Dealers can create their own templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update their own templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can delete their own templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (dealer_id = auth.uid() AND is_system = false);

-- =====================================================
-- 5. RLS Policies for email_history
-- =====================================================

CREATE POLICY "Dealers can view their email history"
  ON email_history FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert their email history"
  ON email_history FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

-- =====================================================
-- 6. Insert System Email Templates
-- =====================================================

INSERT INTO email_templates (
  dealer_id,
  template_key,
  name,
  description,
  category,
  subject_fr,
  subject_en,
  body_fr,
  body_en,
  available_variables,
  is_system,
  preview_data
) VALUES
(
  NULL,
  'warranty_created',
  'Confirmation de Garantie',
  'Envoyé automatiquement lorsqu''une nouvelle garantie est créée',
  'warranty',
  'Confirmation de votre garantie #{{contract_number}}',
  'Your Warranty Confirmation #{{contract_number}}',
  'Bonjour {{customer_name}},

Nous confirmons la création de votre garantie prolongée.

Numéro de contrat: {{contract_number}}
Date de début: {{start_date}}
Date d''expiration: {{end_date}}
Produit: {{product_name}}

Vous pouvez consulter les détails de votre garantie en utilisant ce lien:
{{warranty_link}}

Pour toute question, n''hésitez pas à nous contacter.

Cordialement,
{{company_name}}',
  'Hello {{customer_name}},

We confirm the creation of your extended warranty.

Contract Number: {{contract_number}}
Start Date: {{start_date}}
Expiration Date: {{end_date}}
Product: {{product_name}}

You can view your warranty details using this link:
{{warranty_link}}

For any questions, please don''t hesitate to contact us.

Best regards,
{{company_name}}',
  '["customer_name", "contract_number", "start_date", "end_date", "product_name", "warranty_link", "company_name"]'::jsonb,
  true,
  '{"customer_name": "Jean Dupont", "contract_number": "W-2025-001", "start_date": "2025-10-04", "end_date": "2028-10-04", "product_name": "Remorque Cargo Pro", "warranty_link": "https://app.example.com/warranty/123", "company_name": "Location Pro-Remorque"}'::jsonb
),
(
  NULL,
  'claim_submitted',
  'Réclamation Soumise',
  'Envoyé lorsqu''un client soumet une nouvelle réclamation',
  'claim',
  'Réclamation #{{claim_number}} - Confirmation de réception',
  'Claim #{{claim_number}} - Receipt Confirmation',
  'Bonjour {{customer_name}},

Nous avons bien reçu votre réclamation.

Numéro de réclamation: {{claim_number}}
Date de soumission: {{submission_date}}
Garantie: {{contract_number}}

Notre équipe va examiner votre demande et vous contactera dans les 24-48 heures.

Vous pouvez suivre l''état de votre réclamation ici:
{{claim_link}}

Cordialement,
{{company_name}}',
  'Hello {{customer_name}},

We have received your claim.

Claim Number: {{claim_number}}
Submission Date: {{submission_date}}
Warranty: {{contract_number}}

Our team will review your request and contact you within 24-48 hours.

You can track your claim status here:
{{claim_link}}

Best regards,
{{company_name}}',
  '["customer_name", "claim_number", "submission_date", "contract_number", "claim_link", "company_name"]'::jsonb,
  true,
  '{"customer_name": "Marie Tremblay", "claim_number": "C-2025-042", "submission_date": "2025-10-04", "contract_number": "W-2025-001", "claim_link": "https://app.example.com/claim/456", "company_name": "Location Pro-Remorque"}'::jsonb
),
(
  NULL,
  'claim_approved',
  'Réclamation Approuvée',
  'Envoyé lorsqu''une réclamation est approuvée',
  'claim',
  'Bonne nouvelle! Réclamation #{{claim_number}} approuvée',
  'Good News! Claim #{{claim_number}} Approved',
  'Bonjour {{customer_name}},

Excellente nouvelle! Votre réclamation a été approuvée.

Numéro de réclamation: {{claim_number}}
Montant approuvé: {{approved_amount}}

{{approval_notes}}

Prochaines étapes:
{{next_steps}}

Pour toute question, contactez-nous.

Cordialement,
{{company_name}}',
  'Hello {{customer_name}},

Great news! Your claim has been approved.

Claim Number: {{claim_number}}
Approved Amount: {{approved_amount}}

{{approval_notes}}

Next Steps:
{{next_steps}}

For any questions, please contact us.

Best regards,
{{company_name}}',
  '["customer_name", "claim_number", "approved_amount", "approval_notes", "next_steps", "company_name"]'::jsonb,
  true,
  '{"customer_name": "Pierre Gagnon", "claim_number": "C-2025-042", "approved_amount": "850.00$", "approval_notes": "Votre réclamation est couverte par votre garantie.", "next_steps": "Un technicien vous contactera dans les 2 jours ouvrables.", "company_name": "Location Pro-Remorque"}'::jsonb
),
(
  NULL,
  'claim_denied',
  'Réclamation Refusée',
  'Envoyé lorsqu''une réclamation est refusée',
  'claim',
  'Réclamation #{{claim_number}} - Décision',
  'Claim #{{claim_number}} - Decision',
  'Bonjour {{customer_name}},

Après examen de votre réclamation #{{claim_number}}, nous devons malheureusement vous informer qu''elle ne peut être approuvée.

Raison: {{denial_reason}}

{{additional_details}}

Si vous avez des questions ou souhaitez discuter de cette décision, n''hésitez pas à nous contacter.

Cordialement,
{{company_name}}',
  'Hello {{customer_name}},

After reviewing your claim #{{claim_number}}, we must unfortunately inform you that it cannot be approved.

Reason: {{denial_reason}}

{{additional_details}}

If you have questions or wish to discuss this decision, please don''t hesitate to contact us.

Best regards,
{{company_name}}',
  '["customer_name", "claim_number", "denial_reason", "additional_details", "company_name"]'::jsonb,
  true,
  '{"customer_name": "Luc Bouchard", "claim_number": "C-2025-043", "denial_reason": "Dommage causé par une mauvaise utilisation", "additional_details": "Selon les termes de votre garantie, les dommages causés par une utilisation incorrecte ne sont pas couverts.", "company_name": "Location Pro-Remorque"}'::jsonb
),
(
  NULL,
  'warranty_expiration_30days',
  'Rappel - Expiration dans 30 jours',
  'Envoyé 30 jours avant l''expiration de la garantie',
  'warranty',
  'Votre garantie expire dans 30 jours - #{{contract_number}}',
  'Your Warranty Expires in 30 Days - #{{contract_number}}',
  'Bonjour {{customer_name}},

Votre garantie #{{contract_number}} expire dans 30 jours.

Date d''expiration: {{end_date}}
Produit: {{product_name}}

Nous vous recommandons de renouveler votre garantie pour continuer à bénéficier de notre protection complète.

Contactez-nous dès maintenant pour renouveler:
{{contact_phone}}
{{contact_email}}

Cordialement,
{{company_name}}',
  'Hello {{customer_name}},

Your warranty #{{contract_number}} expires in 30 days.

Expiration Date: {{end_date}}
Product: {{product_name}}

We recommend renewing your warranty to continue benefiting from our complete protection.

Contact us now to renew:
{{contact_phone}}
{{contact_email}}

Best regards,
{{company_name}}',
  '["customer_name", "contract_number", "end_date", "product_name", "contact_phone", "contact_email", "company_name"]'::jsonb,
  true,
  '{"customer_name": "Sophie Lavoie", "contract_number": "W-2024-089", "end_date": "2025-11-03", "product_name": "Remorque Premium", "contact_phone": "1-800-123-4567", "contact_email": "info@locationproremorque.ca", "company_name": "Location Pro-Remorque"}'::jsonb
),
(
  NULL,
  'test_email',
  'Email de Test',
  'Template pour tester la configuration email',
  'system',
  'Test - Configuration Email',
  'Test - Email Configuration',
  'Ceci est un email de test.

Si vous recevez ce message, votre configuration email fonctionne correctement! ✓

Détails techniques:
- Domaine: locationproremorque.ca
- Service: Resend
- Heure d''envoi: {{send_time}}

Cordialement,
{{company_name}}',
  'This is a test email.

If you receive this message, your email configuration is working correctly! ✓

Technical details:
- Domain: locationproremorque.ca
- Service: Resend
- Send time: {{send_time}}

Best regards,
{{company_name}}',
  '["send_time", "company_name"]'::jsonb,
  true,
  '{"send_time": "2025-10-04 14:30", "company_name": "Location Pro-Remorque"}'::jsonb
);

-- =====================================================
-- 7. Function to get effective template for a dealer
-- =====================================================

CREATE OR REPLACE FUNCTION get_email_template(
  p_dealer_id uuid,
  p_template_key text,
  p_language text DEFAULT 'fr'
)
RETURNS TABLE (
  subject text,
  body text,
  available_variables jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p_language = 'en' THEN et.subject_en
      ELSE et.subject_fr
    END as subject,
    CASE 
      WHEN p_language = 'en' THEN et.body_en
      ELSE et.body_fr
    END as body,
    et.available_variables
  FROM email_templates et
  WHERE et.template_key = p_template_key
    AND et.is_active = true
    AND (et.dealer_id = p_dealer_id OR (et.dealer_id IS NULL AND et.is_system = true))
  ORDER BY et.dealer_id NULLS LAST
  LIMIT 1;
END;
$$;

-- =====================================================
-- 8. Function to replace variables in template
-- =====================================================

CREATE OR REPLACE FUNCTION replace_template_variables(
  template_text text,
  variables jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
  var_key text;
  var_value text;
BEGIN
  result := template_text;
  
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    result := replace(result, '{{' || var_key || '}}', COALESCE(var_value, ''));
  END LOOP;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 9. Update timestamp trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_timestamp
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_timestamp();
