/*
  # Fonctions helper et triggers pour notifications
*/

-- Fonction: Créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  p_organization_id uuid,
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    link,
    related_id
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_related_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Compter notifications non lues
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM notifications
  WHERE user_id = auth.uid()
    AND read = false;
    
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger: Notification quand une réclamation est créée
CREATE OR REPLACE FUNCTION notify_new_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_warranty RECORD;
  v_admin RECORD;
BEGIN
  SELECT w.warranty_number, c.full_name as customer_name
  INTO v_warranty
  FROM warranties w
  LEFT JOIN customers c ON w.customer_id = c.id
  WHERE w.id = NEW.warranty_id;
  
  FOR v_admin IN 
    SELECT id 
    FROM profiles 
    WHERE organization_id = NEW.organization_id 
      AND role IN ('admin', 'manager')
  LOOP
    PERFORM create_notification(
      NEW.organization_id,
      v_admin.id,
      'new_claim',
      'Nouvelle réclamation soumise',
      'Réclamation #' || NEW.claim_number || ' pour ' || COALESCE(v_warranty.customer_name, 'client'),
      '/claims',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_claim ON claims;
CREATE TRIGGER trigger_notify_new_claim
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_claim();
