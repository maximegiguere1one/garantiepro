# ⚙️ Configuration Supabase pour Bolt (5 minutes)

## 🎯 Action Requise

Pour que l'authentification fonctionne sur Bolt ET votre domaine personnalisé, vous devez ajouter les URLs Bolt dans votre configuration Supabase.

---

## 📋 Étapes (5 minutes)

### Étape 1: Aller sur Supabase Dashboard

1. Ouvrir https://app.supabase.com
2. Sélectionner votre projet
3. Aller dans **Authentication** (menu gauche)

### Étape 2: Configuration des URLs

1. Cliquer sur **URL Configuration**
2. Trouver la section **Redirect URLs**

### Étape 3: Ajouter les URLs

**Copier-coller ces URLs** dans "Redirect URLs":

```
http://localhost:5173
http://localhost:5173/**
https://*.bolt.new
https://*.bolt.new/**
https://garantieproremorque.com
https://garantieproremorque.com/**
https://www.garantieproremorque.com
https://www.garantieproremorque.com/**
```

**Note**: Le wildcard `*` permet d'accepter tous les sous-domaines Bolt (ex: `abc123.bolt.new`)

### Étape 4: Configurer le Site URL

**Dans la même page**, trouver "Site URL" et entrer:

```
https://www.garantieproremorque.com
```

**OU** si vous voulez que Bolt fonctionne comme Site URL principal:

```
https://your-project.bolt.new
```

### Étape 5: Sauvegarder

1. Cliquer sur **Save** en bas de page
2. Attendre 10-20 secondes pour la propagation

---

## ✅ Vérification

### Test 1: Sur Bolt

1. Ouvrir votre projet Bolt
2. Aller sur `/login`
3. Entrer vos credentials
4. ✅ Vous devriez être connecté en 2-3 secondes

### Test 2: Sur Production

1. Ouvrir https://www.garantieproremorque.com
2. Aller sur `/login`
3. Entrer vos credentials
4. ✅ Vous devriez être connecté normalement

### Test 3: Console

Ouvrir la console navigateur (F12), vous devriez voir:

**Sur Bolt**:
```
[Supabase] Initialized in bolt environment with 2000ms timeout
[Supabase] Running in WebContainer - using optimized settings
```

**Sur Production**:
```
[Supabase] Initialized in production environment with 8000ms timeout
```

---

## 🔧 Configuration Optionnelle

### Désactiver Email Confirmation (Développement)

Si vous voulez tester rapidement sans confirmer les emails:

1. **Authentication** → **Providers** → **Email**
2. Décocher "Enable email confirmations"
3. Sauvegarder

**⚠️ ATTENTION**: Réactiver en production!

### Configurer SMTP (Production)

Pour envoyer des vrais emails:

1. **Project Settings** → **Auth** → **SMTP Settings**
2. Configurer votre serveur SMTP (Resend, SendGrid, etc.)

---

## 🎨 Template d'Email

Pour que les liens de réinitialisation fonctionnent partout:

### Dans Email Templates

**Authentication** → **Email Templates** → **Reset Password**

Remplacer l'URL statique par:

```html
<a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">
  Réinitialiser mon mot de passe
</a>
```

`{{ .SiteURL }}` sera automatiquement remplacé par:
- Sur Bolt: l'URL Bolt actuelle
- Sur Production: `https://www.garantieproremorque.com`

---

## 🐛 Dépannage

### Erreur: "Invalid login credentials"

**Cause**: L'utilisateur n'existe pas ou mauvais mot de passe

**Solution**:
1. Vérifier dans **Authentication** → **Users**
2. Créer l'utilisateur si nécessaire
3. Réinitialiser le mot de passe si oublié

### Erreur: "Email not confirmed"

**Cause**: Email confirmation activée mais pas confirmé

**Solution**:
1. **Authentication** → **Users**
2. Trouver l'utilisateur
3. Cliquer sur les 3 points → "Send confirmation email"
4. OU désactiver email confirmation pour dev

### Erreur: "Redirect URL not allowed"

**Cause**: L'URL Bolt n'est pas dans les Redirect URLs

**Solution**:
1. Copier l'URL exacte de votre Bolt (ex: `https://abc123.bolt.new`)
2. L'ajouter dans **Redirect URLs**
3. OU utiliser le wildcard `https://*.bolt.new/**`

### Erreur: "Invalid JWT"

**Cause**: Token expiré ou session invalide

**Solution**:
1. Vider le cache navigateur (Ctrl+Shift+Delete)
2. Déconnecter/reconnecter
3. Vérifier que l'horloge système est correcte

---

## 📊 Comparaison Configuration

### Configuration Minimale (Bolt seulement)

```
Redirect URLs:
  https://*.bolt.new/**

Site URL:
  https://your-project.bolt.new
```

### Configuration Complète (Bolt + Production)

```
Redirect URLs:
  http://localhost:5173/**
  https://*.bolt.new/**
  https://garantieproremorque.com/**
  https://www.garantieproremorque.com/**

Site URL:
  https://www.garantieproremorque.com
```

---

## 🔐 Sécurité

### RLS (Row Level Security)

Les URLs n'affectent PAS la sécurité RLS. Vos règles de sécurité restent actives:

```sql
-- Exemple: L'utilisateur ne voit que ses données
CREATE POLICY "Users can only see their own data"
ON warranties
FOR SELECT
USING (auth.uid() = user_id);
```

### API Keys

Vos clés Supabase restent les mêmes:
- ✅ `VITE_SUPABASE_ANON_KEY` → Utilisée partout
- ✅ `SUPABASE_SERVICE_ROLE_KEY` → Jamais exposée au frontend

---

## 📱 Tester sur Mobile

Si vous testez sur mobile via Bolt:

1. Ouvrir Bolt sur mobile
2. L'URL sera quelque chose comme `https://abc123.bolt.new`
3. S'assurer que cette URL est dans les Redirect URLs
4. OU utiliser le wildcard `https://*.bolt.new/**`

---

## ✨ C'est Tout!

Après ces 5 minutes de configuration:
- ✅ Bolt fonctionne
- ✅ Production fonctionne
- ✅ Localhost fonctionne
- ✅ Pas de conflit entre environnements

**Profitez de votre développement sans limitations!** 🚀

---

## 📞 Besoin d'Aide?

Si ça ne fonctionne toujours pas:

1. Vérifier les logs console (F12)
2. Chercher `[Supabase]` et `[AuthContext]`
3. Copier les messages d'erreur
4. Vérifier le fichier `AUTH_100_FONCTIONNEL_BOLT.md` pour plus de détails
