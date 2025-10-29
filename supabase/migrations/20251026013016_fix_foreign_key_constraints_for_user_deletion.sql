/*
  # Fix Foreign Key Constraints for User Deletion

  1. Problem
    - Many tables have foreign key constraints to profiles with ON DELETE NO ACTION
    - This prevents user deletion because the cascade doesn't work properly
    - User deletion fails with "Database error deleting user"

  2. Solution
    - Change all NO ACTION constraints to either:
      - CASCADE: Delete related records when user is deleted (for user-owned data)
      - SET NULL: Keep records but remove user reference (for historical/audit data)

  3. Tables Modified
    - audit_log: user_id → SET NULL (keep audit history)
    - claim_attachments: uploaded_by → SET NULL (keep file history)
    - claim_settings: updated_by → SET NULL (keep settings history)
    - claim_timeline: created_by → SET NULL (keep timeline history)
    - claims: decision_made_by, assigned_to → SET NULL (keep claim history)
    - commission_history: changed_by → SET NULL (keep history)
    - company_settings: updated_by → SET NULL (keep settings history)
    - identity_verifications: verified_by → SET NULL (keep verification history)
    - integration_settings: updated_by → SET NULL (keep settings history)
    - notification_templates: updated_by → SET NULL (keep template history)
    - organization_activities: created_by → SET NULL (keep activity history)
    - organization_communications: sent_by → SET NULL (keep communication history)
    - organization_notes: created_by → SET NULL (keep notes history)
    - pricing_rules: updated_by → SET NULL (keep pricing history)
    - scanned_documents: scanned_by → SET NULL (keep scan history)
    - settings_audit_log: changed_by → SET NULL (keep audit history)
    - signature_methods: selected_by → SET NULL (keep signature history)
    - tax_rates: updated_by → SET NULL (keep tax history)
    - warranties: created_by → SET NULL (keep warranty history)
    - warranty_download_tokens: created_by, revoked_by → SET NULL (keep token history)

  4. Security
    - All changes maintain data integrity
    - Historical records are preserved with SET NULL
    - User-owned data is deleted with CASCADE (already configured)
*/

-- audit_log: Keep audit history but remove user reference
ALTER TABLE audit_log 
  DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey,
  ADD CONSTRAINT audit_log_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- claim_attachments: Keep file history
ALTER TABLE claim_attachments 
  DROP CONSTRAINT IF EXISTS claim_attachments_uploaded_by_fkey,
  ADD CONSTRAINT claim_attachments_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- claim_settings: Keep settings history
ALTER TABLE claim_settings 
  DROP CONSTRAINT IF EXISTS claim_settings_updated_by_fkey,
  ADD CONSTRAINT claim_settings_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- claim_timeline: Keep timeline history
ALTER TABLE claim_timeline 
  DROP CONSTRAINT IF EXISTS claim_timeline_created_by_fkey,
  ADD CONSTRAINT claim_timeline_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- claims: Keep claim history but remove user references
ALTER TABLE claims 
  DROP CONSTRAINT IF EXISTS claims_decision_made_by_fkey,
  ADD CONSTRAINT claims_decision_made_by_fkey 
    FOREIGN KEY (decision_made_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE claims 
  DROP CONSTRAINT IF EXISTS claims_assigned_to_fkey,
  ADD CONSTRAINT claims_assigned_to_fkey 
    FOREIGN KEY (assigned_to) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- commission_history: Keep history
ALTER TABLE commission_history 
  DROP CONSTRAINT IF EXISTS commission_history_changed_by_fkey,
  ADD CONSTRAINT commission_history_changed_by_fkey 
    FOREIGN KEY (changed_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- company_settings: Keep settings history
ALTER TABLE company_settings 
  DROP CONSTRAINT IF EXISTS company_settings_updated_by_fkey,
  ADD CONSTRAINT company_settings_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- identity_verifications: Keep verification history
ALTER TABLE identity_verifications 
  DROP CONSTRAINT IF EXISTS identity_verifications_verified_by_fkey,
  ADD CONSTRAINT identity_verifications_verified_by_fkey 
    FOREIGN KEY (verified_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- integration_settings: Keep settings history
ALTER TABLE integration_settings 
  DROP CONSTRAINT IF EXISTS integration_settings_updated_by_fkey,
  ADD CONSTRAINT integration_settings_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- notification_templates: Keep template history
ALTER TABLE notification_templates 
  DROP CONSTRAINT IF EXISTS notification_templates_updated_by_fkey,
  ADD CONSTRAINT notification_templates_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- organization_activities: Keep activity history
ALTER TABLE organization_activities 
  DROP CONSTRAINT IF EXISTS organization_activities_created_by_fkey,
  ADD CONSTRAINT organization_activities_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- organization_communications: Keep communication history
ALTER TABLE organization_communications 
  DROP CONSTRAINT IF EXISTS organization_communications_sent_by_fkey,
  ADD CONSTRAINT organization_communications_sent_by_fkey 
    FOREIGN KEY (sent_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- organization_notes: Keep notes history
ALTER TABLE organization_notes 
  DROP CONSTRAINT IF EXISTS organization_notes_created_by_fkey,
  ADD CONSTRAINT organization_notes_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- pricing_rules: Keep pricing history
ALTER TABLE pricing_rules 
  DROP CONSTRAINT IF EXISTS pricing_rules_updated_by_fkey,
  ADD CONSTRAINT pricing_rules_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- scanned_documents: Keep scan history
ALTER TABLE scanned_documents 
  DROP CONSTRAINT IF EXISTS scanned_documents_scanned_by_fkey,
  ADD CONSTRAINT scanned_documents_scanned_by_fkey 
    FOREIGN KEY (scanned_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- settings_audit_log: Keep audit history
ALTER TABLE settings_audit_log 
  DROP CONSTRAINT IF EXISTS settings_audit_log_changed_by_fkey,
  ADD CONSTRAINT settings_audit_log_changed_by_fkey 
    FOREIGN KEY (changed_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- signature_methods: Keep signature history
ALTER TABLE signature_methods 
  DROP CONSTRAINT IF EXISTS signature_methods_selected_by_fkey,
  ADD CONSTRAINT signature_methods_selected_by_fkey 
    FOREIGN KEY (selected_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- tax_rates: Keep tax history
ALTER TABLE tax_rates 
  DROP CONSTRAINT IF EXISTS tax_rates_updated_by_fkey,
  ADD CONSTRAINT tax_rates_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- warranties: Keep warranty history but remove creator reference
ALTER TABLE warranties 
  DROP CONSTRAINT IF EXISTS warranties_created_by_fkey,
  ADD CONSTRAINT warranties_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- warranty_download_tokens: Keep token history
ALTER TABLE warranty_download_tokens 
  DROP CONSTRAINT IF EXISTS warranty_download_tokens_created_by_fkey,
  ADD CONSTRAINT warranty_download_tokens_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE warranty_download_tokens 
  DROP CONSTRAINT IF EXISTS warranty_download_tokens_revoked_by_fkey,
  ADD CONSTRAINT warranty_download_tokens_revoked_by_fkey 
    FOREIGN KEY (revoked_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;