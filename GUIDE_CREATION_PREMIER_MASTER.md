# Guide: Création du Premier Utilisateur Master

## Vue d'ensemble

Le rôle **Master** est le niveau le plus élevé dans la hiérarchie des utilisateurs. Pour des raisons de sécurité, le premier utilisateur Master doit être créé manuellement via SQL.

## Étapes de Création

### Option 1: Via l'Éditeur SQL de Supabase (Recommandé)

1. **Connectez-vous à Supabase Dashboard**
   - Allez sur [https://app.supabase.com](https://app.supabase.com)
   - Sélectionnez votre projet

2. **Ouvrez l'Éditeur SQL**
   - Dans le menu de gauche, cliquez sur **SQL Editor**
   - Cliquez sur **"New query"**

3. **Identifiez votre utilisateur**

   D'abord, trouvez votre email et ID:
   ```sql
   SELECT
     id,
     email,
     full_name,
     role,
     organization_id
   FROM profiles
   WHERE email = 'votre.email@exemple.com';
   ```

   Remplacez `votre.email@exemple.com` par votre email.

4. **Promouvoir au rôle Master**

   Une fois que vous avez confirmé votre ID, exécutez:
   ```sql
   UPDATE profiles
   SET role = 'master'
   WHERE email = 'votre.email@exemple.com';
   ```

5. **Vérification**

   Confirmez que le changement a été appliqué:
   ```sql
   SELECT
     email,
     full_name,
     role,
     created_at
   FROM profiles
   WHERE role = 'master';
   ```

### Option 2: Via l'API Supabase (Avancé)

Si vous préférez utiliser un script:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'VOTRE_SUPABASE_URL';
const supabaseServiceKey = 'VOTRE_SERVICE_ROLE_KEY'; // ⚠️ Gardez cette clé secrète!

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMasterUser() {
  const email = 'votre.email@exemple.com';

  // Trouver l'utilisateur
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !profile) {
    console.error('Utilisateur non trouvé:', fetchError);
    return;
  }

  console.log('Utilisateur trouvé:', profile);

  // Promouvoir au rôle master
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'master' })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Erreur lors de la promotion:', error);
    return;
  }

  console.log('✅ Utilisateur promu au rôle Master:', data);
}

createMasterUser();
```

## Après la Création

### 1. Déconnectez-vous et reconnectez-vous

Pour que le nouveau rôle soit pris en compte:
1. Cliquez sur votre profil en haut à droite
2. Cliquez sur **"Déconnexion"**
3. Reconnectez-vous avec vos identifiants

### 2. Vérifiez vos permissions

Vous devriez maintenant voir:
- Badge **Master** (doré) dans votre profil
- Toutes les options d'administration disponibles
- Capacité à inviter d'autres utilisateurs avec n'importe quel rôle
- Capacité à changer les mots de passe de tous les utilisateurs

### 3. Créez d'autres administrateurs si nécessaire

Une fois Master, vous pouvez:
1. Aller dans **Configuration** → **Utilisateurs**
2. Cliquer sur **"Inviter un utilisateur"**
3. Choisir le rôle approprié:
   - **Master** - Pour un autre administrateur système
   - **Super Admin** - Pour un administrateur de haut niveau
   - **Admin** - Pour un administrateur standard
   - Etc.

## Bonnes Pratiques

### Sécurité

1. **Limitez les Masters**
   - N'ayez que 1-2 utilisateurs Master maximum
   - Utilisez Master uniquement pour les tâches critiques

2. **Utilisez Super Admin pour l'administration courante**
   - Super Admin a suffisamment de permissions pour la plupart des tâches
   - Réservez Master pour les cas exceptionnels

3. **Auditez régulièrement**
   ```sql
   -- Lister tous les utilisateurs avec des rôles élevés
   SELECT
     email,
     full_name,
     role,
     last_sign_in_at,
     created_at
   FROM profiles
   WHERE role IN ('master', 'super_admin', 'admin')
   ORDER BY role, email;
   ```

4. **Protection du compte Master**
   - Utilisez un mot de passe fort et unique
   - Activez l'authentification à deux facteurs si disponible
   - Ne partagez jamais les identifiants Master

### Gestion d'équipe

1. **Hiérarchie recommandée:**
   ```
   Master (1-2 personnes)
     ↓
   Super Admin (équipe de direction)
     ↓
   Admin (gestionnaires)
     ↓
   Franchisee Admin (franchisés)
     ↓
   Employés
   ```

2. **Attribution des rôles:**
   - Master: Fondateur, CTO
   - Super Admin: Directeur général, VP
   - Admin: Gestionnaire d'équipe
   - Franchisee Admin: Propriétaire de franchise
   - Employees: Personnel opérationnel

## Dépannage

### Le rôle n'apparaît pas après la mise à jour

**Solution:**
1. Videz le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
2. Déconnectez-vous complètement
3. Fermez tous les onglets de l'application
4. Reconnectez-vous

### Erreur "role check constraint"

**Cause:** La migration n'a pas été appliquée correctement.

**Solution:**
```sql
-- Vérifier que la contrainte inclut 'master'
SELECT check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_role_check';

-- Si 'master' n'apparaît pas, réappliquez la migration
-- (voir CORRECTIF_ROLE_MASTER_OCT27_2025.md)
```

### Impossible de promouvoir d'autres utilisateurs à Master

**Vérification:**
```sql
-- Confirmez que VOUS êtes Master
SELECT email, role
FROM profiles
WHERE email = 'votre.email@exemple.com';

-- Si le résultat n'est pas 'master', réappliquez la commande UPDATE
```

## Commandes SQL Utiles

### Lister tous les utilisateurs par rôle
```sql
SELECT
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY
  CASE role
    WHEN 'master' THEN 1
    WHEN 'super_admin' THEN 2
    WHEN 'admin' THEN 3
    WHEN 'franchisee_admin' THEN 4
    WHEN 'franchisee_employee' THEN 5
    WHEN 'employee' THEN 6
    ELSE 7
  END;
```

### Trouver les utilisateurs sans rôle défini
```sql
SELECT id, email, full_name, role
FROM profiles
WHERE role IS NULL OR role = '';
```

### Rétrograder un Master en Super Admin
```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'ancien.master@exemple.com';
```

## Support

Si vous rencontrez des problèmes:

1. Vérifiez les migrations appliquées
2. Consultez les logs Supabase
3. Vérifiez les contraintes de la base de données
4. Assurez-vous d'utiliser la Service Role Key pour les opérations sensibles

## Checklist de Vérification

Avant de considérer la configuration terminée:

- [ ] Le rôle master apparaît dans la contrainte `profiles_role_check`
- [ ] Au moins un utilisateur a été promu à Master
- [ ] Le Master peut se connecter et voir toutes les permissions
- [ ] Le Master peut inviter d'autres utilisateurs avec n'importe quel rôle
- [ ] Le Master peut changer les mots de passe de tous les utilisateurs
- [ ] Les fonctions `can_manage_user_role` et `can_reset_user_password` existent
- [ ] Le badge Master s'affiche correctement (couleur dorée)

---

**Important:** Le rôle Master donne un accès complet au système. N'attribuez ce rôle qu'aux personnes de confiance absolue qui en ont véritablement besoin.
