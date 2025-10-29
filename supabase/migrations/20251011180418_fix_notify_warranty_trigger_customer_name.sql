/*
  # Fix Warranty Notification Trigger - Customer Name

  ## Problem
  The `notify_new_warranty()` trigger function tries to SELECT `customer_name`
  from the `warranties` table, but this column does not exist.

  Error: column "customer_name" does not exist
  Code: 42703

  ## Solution
  Join with the `customers` table to get the customer's name using `customer_id`.

  ## Changes
  - Update `notify_new_warranty()` function to JOIN with customers table
  - Use CONCAT(first_name, ' ', last_name) to build customer_name
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_new_warranty ON warranties;

-- Recreate the function with correct customer name lookup
CREATE OR REPLACE FUNCTION notify_new_warranty()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_subject text;
  v_body text;
BEGIN
  -- Get customer name by joining with customers table
  SELECT CONCAT(c.first_name, ' ', c.last_name)
  INTO v_customer_name
  FROM customers c
  WHERE c.id = NEW.customer_id;

  v_subject := 'Nouvelle garantie créée';
  v_body := '<h2>Nouvelle garantie créée</h2>' ||
            '<p>Une nouvelle garantie a été créée pour le client: <strong>' || COALESCE(v_customer_name, 'N/A') || '</strong></p>' ||
            '<p><strong>Détails:</strong></p>' ||
            '<ul>' ||
            '<li>Numéro de contrat: ' || NEW.contract_number || '</li>' ||
            '<li>Province: ' || NEW.province || '</li>' ||
            '<li>Date de début: ' || NEW.start_date || '</li>' ||
            '<li>Date de fin: ' || NEW.end_date || '</li>' ||
            '<li>Prix total: ' || NEW.total_price || ' $</li>' ||
            '</ul>';

  -- Queue email notification
  INSERT INTO email_queue (
    to_email,
    subject,
    body,
    template_id,
    template_variables,
    priority,
    scheduled_for
  ) VALUES (
    (SELECT contact_email FROM company_settings WHERE organization_id = NEW.organization_id LIMIT 1),
    v_subject,
    v_body,
    NULL,
    jsonb_build_object(
      'customer_name', v_customer_name,
      'contract_number', NEW.contract_number,
      'province', NEW.province,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'total_price', NEW.total_price
    ),
    'normal',
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_new_warranty
  AFTER INSERT ON warranties
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION notify_new_warranty();
