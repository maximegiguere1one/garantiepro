# Fix CORS Error - Edge Functions

## Problème

```
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource
```

## Cause Racine

Les appels directs `fetch()` aux Edge Functions manquent le header `apikey`, ce qui cause des erreurs CORS même si les fonctions ont les bons headers CORS.

## Solution Immédiate

### Option 1: Utiliser l'utilitaire créé (RECOMMANDÉ)

```typescript
import { invokeEdgeFunction } from '../lib/edge-function-client';

// Au lieu de:
const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});

// Utiliser:
const result = await invokeEdgeFunction('invite-user', data);
```

### Option 2: Utiliser supabase.functions.invoke() (SDK Officiel)

```typescript
const { data, error } = await supabase.functions.invoke('invite-user', {
  body: { email, role, full_name },
});

if (error) throw error;
```

### Option 3: Ajouter le header apikey (Si fetch() nécessaire)

```typescript
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'apikey': supabaseAnonKey, // CRITIQUE!
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

## Fichiers à Corriger

Tous les appels `fetch()` directs aux edge functions dans:

1. **src/lib/email-queue.ts** - send-email
2. **src/lib/warranty-download-utils.ts** - download-warranty-documents
3. **src/components/organizations/BulkEmailModal.tsx** - send-email
4. **src/components/organizations/OrganizationModals.tsx** - onboard-franchisee
5. **src/components/settings/UsersManagement.tsx** - invite-user
6. **src/components/settings/UsersAndInvitationsManagement.tsx** - invite-user, send-password-reset, delete-user, resend-invitation
7. **src/components/ProfileRecovery.tsx** - fix-profile
8. **src/components/EmailQueueManager.tsx** - send-email
9. **src/components/AdminPasswordReset.tsx** - send-password-reset
10. **src/components/AutomationDashboard.tsx** - automation-engine
11. **src/components/OrganizationsManagementV2.tsx** - test-email-config, onboard-franchisee, send-password-reset

## Migration Automatique (Script)

```bash
# Créer un script pour ajouter apikey header partout
cat > fix-cors-headers.sh << 'EOF'
#!/bin/bash

FILES=(
  "src/lib/email-queue.ts"
  "src/components/organizations/BulkEmailModal.tsx"
  "src/components/settings/UsersAndInvitationsManagement.tsx"
  # ... autres fichiers
)

for file in "${FILES[@]}"; do
  # Ajouter import en haut du fichier si nécessaire
  if ! grep -q "VITE_SUPABASE_ANON_KEY" "$file"; then
    echo "Ajout apikey à $file"
    # Logic de remplacement ici
  fi
done
EOF
```

## Vérification

Après correction, tester:

1. **Console du navigateur** - Plus d'erreurs CORS
2. **Network tab** - Les requêtes retournent 200 OK
3. **Fonctionnalités** - Invitation, email, etc. fonctionnent

## Pourquoi `apikey` est nécessaire?

Supabase utilise `apikey` pour:
1. Identifier le projet
2. Valider les requêtes CORS
3. Appliquer les limites de rate-limiting

Sans `apikey`, même avec Authorization, Supabase rejette la requête comme non-autorisée.

## Alternative: Toujours utiliser supabase.functions.invoke()

La méthode SDK gère automatiquement:
- ✅ Headers CORS (apikey inclus)
- ✅ Authorization automatique
- ✅ Gestion des erreurs
- ✅ Timeout par défaut

**Recommandation**: Migrer tous les appels vers `supabase.functions.invoke()` ou utiliser l'utilitaire `edge-function-client.ts`.
