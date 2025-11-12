-- ============================================
-- TEST SMS NOTIFICATION - Script Rapide
-- ============================================
-- Exécutez ces commandes directement dans Supabase SQL Editor
-- pour tester le système de notifications SMS

-- ============================================
-- TEST 1: Ajouter un SMS de test dans la file
-- ============================================

INSERT INTO sms_queue (
  organization_id,
  to_phone,
  body,
  status,
  priority
) VALUES (
  (SELECT id FROM organizations LIMIT 1),
  '+14185728464',
  'Test SMS - Système de notifications fonctionne! 🎉 ' || NOW()::text,
  'pending',
  'high'
);

-- Résultat attendu: 1 ligne ajoutée

-- ============================================
-- TEST 2: Traiter la file (envoie le SMS)
-- ============================================

SELECT process_sms_queue();

-- Résultat attendu: Le SMS devrait être envoyé à votre téléphone

-- ============================================
-- TEST 3: Vérifier le statut du SMS
-- ============================================

SELECT
  id,
  to_phone,
  body,
  status,
  attempts,
  created_at,
  sent_at,
  error_message
FROM sms_queue
ORDER BY created_at DESC
LIMIT 5;

-- Résultat attendu: Voir le SMS avec status = 'sent' ou 'pending'

-- ============================================
-- TEST 4: Voir TOUS les SMS envoyés aujourd'hui
-- ============================================

SELECT
  to_phone,
  body,
  status,
  attempts,
  created_at,
  sent_at
FROM sms_queue
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- ============================================
-- TEST 5: Créer une garantie de test (trigger auto)
-- ============================================

-- Récupérer un plan existant
SELECT id, name, base_price FROM warranty_plans LIMIT 1;

-- Créer une garantie de test (remplacez warranty_plan_id par un ID valide)
INSERT INTO warranties (
  organization_id,
  warranty_plan_id,
  contract_number,
  customer_name,
  customer_email,
  customer_phone,
  customer_address,
  customer_city,
  customer_province,
  customer_postal_code,
  trailer_vin,
  trailer_category,
  trailer_year,
  trailer_make,
  trailer_model,
  sale_price,
  warranty_price,
  total_amount,
  start_date,
  end_date,
  duration_months,
  status
) VALUES (
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM warranty_plans LIMIT 1), -- Remplacez si nécessaire
  'TEST-SMS-' || FLOOR(RANDOM() * 1000000)::text,
  'Client Test SMS',
  'test@test.com',
  '+15555555555',
  '123 rue Test',
  'Montréal',
  'QC',
  'H1H 1H1',
  'VIN-TEST-' || FLOOR(RANDOM() * 1000000)::text,
  'Fermé',
  2024,
  'Test',
  'Model Test',
  15000,
  500,
  15500,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '12 months',
  12,
  'active'
);

-- Le trigger devrait automatiquement créer un SMS!

-- ============================================
-- VÉRIFICATION: Voir le dernier SMS créé
-- ============================================

SELECT
  to_phone,
  body,
  status,
  attempts,
  created_at
FROM sms_queue
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- DÉBOGAGE: Vérifier la configuration
-- ============================================

SELECT
  enable_sms_notifications,
  sms_notification_phone,
  sms_notification_language
FROM company_settings
LIMIT 1;

-- ============================================
-- DÉBOGAGE: Vérifier que le trigger existe
-- ============================================

SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type
FROM pg_trigger
WHERE tgname = 'warranty_sms_notification';

-- Résultat attendu: trigger existe avec enabled = 'O'

-- ============================================
-- STATISTIQUES: Voir le résumé des SMS
-- ============================================

SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as first_sms,
  MAX(created_at) as last_sms
FROM sms_queue
GROUP BY status
ORDER BY status;

-- ============================================
-- NETTOYAGE (OPTIONNEL): Supprimer les SMS de test
-- ============================================

-- ATTENTION: Ceci supprime TOUS les SMS de test!
-- Décommentez seulement si vous voulez nettoyer

-- DELETE FROM sms_queue WHERE body LIKE '%Test%';

-- ============================================
-- MODIFIER LA CONFIGURATION (OPTIONNEL)
-- ============================================

-- Changer le numéro de téléphone
-- UPDATE company_settings
-- SET sms_notification_phone = '+1XXXXXXXXXX'
-- WHERE organization_id = (SELECT id FROM organizations LIMIT 1);

-- Désactiver temporairement les SMS
-- UPDATE company_settings
-- SET enable_sms_notifications = false
-- WHERE organization_id = (SELECT id FROM organizations LIMIT 1);

-- Réactiver les SMS
-- UPDATE company_settings
-- SET enable_sms_notifications = true
-- WHERE organization_id = (SELECT id FROM organizations LIMIT 1);
