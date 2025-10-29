# 🔧 Solution Complète: Erreur "Aucun profil client trouvé"

## ⚠️ Problème Identifié

**Erreur affichée**: "Aucun profil client trouvé. Veuillez contacter le support."

**Root Cause**: L'utilisateur authentifié n'a **pas d'enregistrement dans la table `customers`** lié à son profile.

---

## ✅ Solution SQL Immédiate

### Étape 1: Créer le Customer pour Votre Utilisateur

Exécutez dans **Supabase SQL Editor**:

```sql
-- Créer un customer pour l'utilisateur connecté
INSERT INTO customers (
  user_id,
  first_name,
  last_name,
  email,
  phone,
  organization_id
)
SELECT
  p.id,
  COALESCE(SPLIT_PART(p.email, '@', 1), 'Client') as first_name,
  'Client' as last_name,
  p.email,
  NULL as phone,
  p.organization_id
FROM profiles p
WHERE p.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM customers c WHERE c.user_id = p.id
  )
ON CONFLICT (user_id) DO NOTHING
RETURNING *;
```

### Étape 2: Vérification

```sql
-- Vérifier que le customer a été créé
SELECT
  p.id as profile_id,
  p.email,
  p.role,
  c.id as customer_id,
  c.first_name,
  c.last_name
FROM profiles p
LEFT JOIN customers c ON c.user_id = p.id
WHERE p.id = auth.uid();
```

**Résultat attendu**: La colonne `customer_id` doit contenir un UUID (pas NULL).

---

## 🔧 Diagnostic Complet

Script pour identifier le problème:

```sql
DO $$
DECLARE
  current_user_id uuid := auth.uid();
  profile_rec record;
  customer_rec record;
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC PROFIL CLIENT ===';
  
  -- Vérifier le profile
  SELECT * INTO profile_rec FROM profiles WHERE id = current_user_id;
  
  IF FOUND THEN
    RAISE NOTICE 'PROFILE: Email=%, Role=%', profile_rec.email, profile_rec.role;
  ELSE
    RAISE NOTICE 'ERREUR: Aucun profile trouvé';
    RETURN;
  END IF;
  
  -- Vérifier le customer
  SELECT * INTO customer_rec FROM customers WHERE user_id = current_user_id;
  
  IF FOUND THEN
    RAISE NOTICE 'CUSTOMER: ID=%, Nom=% %', customer_rec.id, customer_rec.first_name, customer_rec.last_name;
  ELSE
    RAISE NOTICE 'PROBLEME: Aucun customer trouvé pour cet utilisateur';
  END IF;
END $$;
```

---

## 🛠️ Solution Permanente

### Option A: Créer tous les customers manquants

```sql
-- Créer des customers pour tous les profiles qui n'en ont pas
INSERT INTO customers (
  user_id,
  first_name,
  last_name,
  email,
  organization_id
)
SELECT
  p.id,
  COALESCE(SPLIT_PART(p.email, '@', 1), 'Client'),
  'Client',
  p.email,
  p.organization_id
FROM profiles p
LEFT JOIN customers c ON c.user_id = p.id
WHERE c.id IS NULL
  AND p.role = 'client'
ON CONFLICT (user_id) DO NOTHING;
```

### Option B: Créer un trigger automatique

```sql
-- Fonction pour créer automatiquement un customer
CREATE OR REPLACE FUNCTION auto_create_customer_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'client' THEN
    INSERT INTO customers (
      user_id,
      first_name,
      last_name,
      email,
      organization_id
    )
    VALUES (
      NEW.id,
      COALESCE(SPLIT_PART(NEW.email, '@', 1), 'Client'),
      'Client',
      NEW.email,
      NEW.organization_id
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_create_customer ON profiles;
CREATE TRIGGER trigger_auto_create_customer
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'client')
  EXECUTE FUNCTION auto_create_customer_from_profile();
```

---

## 📋 Checklist

1. [ ] Exécuter le diagnostic SQL
2. [ ] Créer le customer avec la requête INSERT
3. [ ] Vérifier que customer_id n'est plus NULL
4. [ ] Tester la création d'une réclamation dans l'application
5. [ ] Installer le trigger pour les futurs utilisateurs

---

**Temps estimé**: 2 minutes
**Priorité**: CRITIQUE
