# Nettoyage des Logs Console - 29 Octobre 2025

## Problème Identifié

L'application affiche des erreurs d'authentification dans la console :
```
[ERROR] [AuthContext] Sign in error: Invalid login credentials
Status: 400
```

## Utilisateurs Existants dans la Base de Données

Les utilisateurs suivants existent dans votre base de données :

1. **maxime@giguere-influence.com** (MASTER - Accès complet)
2. **maxime@agence1.com** (SUPER_ADMIN)
3. **gigueremaxime321@gmail.com** (FRANCHISEE_ADMIN)
4. **philippe@proremorque.com** (ADMIN)

## Solution Immédiate

### Option 1 : Utiliser les Identifiants Existants

Essayez de vous connecter avec l'un des emails ci-dessus. Si vous ne vous souvenez pas du mot de passe, utilisez l'option "Mot de passe oublié" sur la page de connexion.

### Option 2 : Réinitialiser le Mot de Passe via Supabase

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **Users**
4. Trouvez l'utilisateur souhaité
5. Cliquez sur le menu (•••) → **Reset Password**
6. Un lien de réinitialisation sera envoyé à l'email

### Option 3 : Créer un Script de Test

Vous pouvez créer un utilisateur de test avec un mot de passe connu :

```javascript
// Dans la console du navigateur (F12), après avoir chargé la page
const { createClient } = supabase;
const supabaseUrl = 'https://fkxldrkkqvputdgfpayi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Votre clé anon

const client = createClient(supabaseUrl, supabaseKey);

// Créer un utilisateur de test
await client.auth.signUp({
  email: 'test@proremorque.com',
  password: 'Test123456!',
  options: {
    data: {
      full_name: 'Test User',
      role: 'admin'
    }
  }
});
```

## Pourquoi l'Erreur se Produit

L'erreur "Invalid login credentials" (400) se produit quand :

1. **Email incorrect** : L'email n'existe pas dans auth.users
2. **Mot de passe incorrect** : Le mot de passe ne correspond pas
3. **Compte non confirmé** : Si la confirmation email est activée et l'email n'a pas été confirmé

## Vérification de la Configuration Auth

Pour vérifier si la confirmation email est requise :

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **Providers** → **Email**
4. Vérifiez si "Confirm email" est activé

## Logs Améliorés

Les logs actuels dans AuthContext.tsx sont corrects et fournissent des informations utiles :

```typescript
logger.info('Attempting sign in for:', email);
// ... après l'erreur ...
logger.error('Sign in error:', {
  message: error.message,
  status: error.status,
  name: error.name,
  code: (error as any).code,
});
```

## Recommandation

**Action immédiate** : Essayez de vous connecter avec **maxime@giguere-influence.com** (compte MASTER). Si vous ne connaissez pas le mot de passe, utilisez la fonction "Mot de passe oublié" sur la page de connexion.

Si le problème persiste, c'est que :
- Le mot de passe a été oublié → Utilisez la réinitialisation
- La confirmation email est requise → Désactivez-la dans Supabase
- Il y a un problème de configuration → Vérifiez les variables d'environnement
