# 🧪 Comment Tester les SMS - Guide Rapide

## 3 Façons de Tester

### ✅ Option 1: Test SQL Direct (Le Plus Rapide)

1. **Allez dans Supabase Dashboard**
   - Ouvrez https://supabase.com
   - Sélectionnez votre projet
   - Allez dans **SQL Editor**

2. **Copiez et exécutez ce code:**

```sql
-- Ajouter un SMS de test
INSERT INTO sms_queue (
  organization_id,
  to_phone,
  body,
  status,
  priority
) VALUES (
  (SELECT id FROM organizations LIMIT 1),
  '+14185728464',
  'Test SMS - Ça marche! 🎉',
  'pending',
  'high'
);

-- Envoyer le SMS
SELECT process_sms_queue();
```

3. **Vérifiez votre téléphone** (+1 418-572-8464)
   - Vous devriez recevoir le SMS dans les secondes qui suivent

---

### ✅ Option 2: Page de Test HTML

1. **Ouvrez le fichier de test:**
   - Allez dans: `public/_test/test-sms-notification.html`
   - Ouvrez-le dans votre navigateur

2. **Configuration:**
   - La page vous demandera votre SUPABASE_URL et SUPABASE_ANON_KEY
   - Ou modifiez directement dans le fichier HTML

3. **Testez avec les boutons:**
   - **Bouton 1**: Test SMS direct
   - **Bouton 2**: Test avec file d'attente
   - **Bouton 3**: Créer une garantie de test

4. **Vérifiez votre téléphone**

---

### ✅ Option 3: Créer une Vraie Garantie

1. **Connectez-vous à l'application**

2. **Allez dans "Nouvelle Garantie"**

3. **Remplissez le formulaire et créez la garantie**

4. **Vérifiez votre téléphone** - Vous devriez recevoir:

```
Nouvelle garantie!

Contrat: W-1699999999-ABC123XYZ
Client: [Nom du client]
Plan: [Nom du plan]
Total: [Montant] $

Garantie Pro-Remorque
```

---

## 📊 Vérifier les SMS Envoyés

### Dans Supabase SQL Editor:

```sql
-- Voir les 10 derniers SMS
SELECT
  to_phone,
  body,
  status,
  attempts,
  created_at,
  sent_at,
  error_message
FROM sms_queue
ORDER BY created_at DESC
LIMIT 10;
```

### Statuts possibles:
- **pending**: En attente d'envoi
- **sent**: Envoyé avec succès ✅
- **failed**: Échec après plusieurs tentatives ❌

---

## ❓ Problèmes Courants

### Le SMS n'arrive pas?

1. **Vérifiez la configuration Twilio:**
```sql
SELECT
  enable_sms_notifications,
  sms_notification_phone,
  sms_notification_language
FROM company_settings;
```

2. **Vérifiez les secrets Twilio dans Supabase:**
   - Project Settings → Edge Functions → Environment Variables
   - Doit avoir: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

3. **Vérifiez les SMS en échec:**
```sql
SELECT * FROM sms_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Le trigger ne fonctionne pas?

```sql
-- Vérifier que le trigger existe
SELECT * FROM pg_trigger
WHERE tgname = 'warranty_sms_notification';
```

Si pas de résultat, appliquez la migration:
```sql
-- Réappliquer le trigger
CREATE TRIGGER warranty_sms_notification
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_warranty_sms();
```

---

## 📝 Fichiers de Test Disponibles

1. **`TEST_SMS_RAPIDE.sql`**
   - Script SQL complet avec tous les tests
   - À exécuter dans Supabase SQL Editor

2. **`public/_test/test-sms-notification.html`**
   - Interface web de test interactive
   - Avec historique des SMS

3. **`NOTIFICATIONS_SMS_GUIDE.md`**
   - Documentation complète du système

---

## 🎯 Test Recommandé (Le Plus Simple)

**Pour tester rapidement:**

1. Ouvrez Supabase SQL Editor
2. Exécutez:
```sql
INSERT INTO sms_queue (
  organization_id, to_phone, body, status, priority
) VALUES (
  (SELECT id FROM organizations LIMIT 1),
  '+14185728464',
  'Test - ' || NOW()::text,
  'pending',
  'high'
);
SELECT process_sms_queue();
```
3. Vérifiez votre téléphone!

---

## ✅ Résultat Attendu

Vous devriez recevoir un SMS sur **+1 418-572-8464** dans les **5-10 secondes**.

Si ça ne fonctionne pas, consultez la section "Problèmes Courants" ci-dessus.

---

## 📞 Support

- Consultez `NOTIFICATIONS_SMS_GUIDE.md` pour plus de détails
- Vérifiez les logs PostgreSQL dans Supabase Dashboard
- Cherchez "SMS Notification:" dans les logs pour voir l'activité

**Le système est configuré et prêt!** 🚀
