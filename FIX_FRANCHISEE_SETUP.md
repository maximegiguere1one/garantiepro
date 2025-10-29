# Correction - Page de Configuration Franchisée

## Problème Identifié
L'utilisateur ne pouvait pas sortir de la page de configuration franchisée même en cliquant sur le bouton "Passer".

## Corrections Apportées

### 1. Amélioration du Bouton "Passer Principal"
**Fichier:** `src/components/FranchiseeSetup.tsx`

**Changements:**
- Ajout de meilleure gestion d'erreur avec fallback
- Redirection forcée même en cas d'échec
- Meilleur logging pour le débogage
- Bouton plus visible (couleur ambre au lieu de gris)
- Utilisation de `onConflict` dans l'upsert pour éviter les erreurs de duplication
- Timeout de sécurité pour garantir la redirection

**Comportement:**
```typescript
// Essaie de créer des paramètres minimaux
// Si échec, redirige quand même après 1 seconde
// Garantit que l'utilisateur peut toujours sortir
```

### 2. Bouton "Passer Cette Étape" à l'Étape 1 (Mot de passe)
**Ajout d'un nouveau bouton** qui permet de sauter l'étape de changement de mot de passe et passer directement à l'étape 2.

**Interface:**
```
[Passer cette étape] [Continuer →]
```

### 3. Bouton "Utiliser Configuration Par Défaut" à l'Étape 2
**Ajout d'un nouveau bouton** qui permet de terminer la configuration sans remplir tous les champs.

**Comportement:**
- Utilise les valeurs par défaut pour les champs vides
- Crée des paramètres temporaires avec:
  - Nom: "Configuration Temporaire"
  - Email: Email de l'organisation ou "temp@example.com"
  - Téléphone: "000-000-0000"
  - Adresse: "À configurer"
  - Ville: "À configurer"
  - Code postal: "H0H 0H0"

**Interface:**
```
[Retour] [Terminer la configuration →]
[Passer et utiliser la configuration par défaut]
```

### 4. Fonction `handleCompanySetup` Améliorée
**Paramètre ajouté:** `skipValidation: boolean`

**Logique:**
- Si `skipValidation = false`: Valide tous les champs requis (comportement normal)
- Si `skipValidation = true`: Utilise les valeurs par défaut et saute la validation
- Gestion d'erreur améliorée avec redirection forcée après 3 secondes en cas de problème
- Meilleur logging des erreurs

### 5. Gestion Robuste des Erreurs
**Nouvelles protections:**
- Redirection garantie même si la base de données échoue
- Utilisation de `setTimeout` pour forcer la redirection
- Console.log pour le débogage
- Pas de blocage de l'utilisateur en cas d'erreur

## Comment Utiliser

### Option 1: Passer Complètement la Configuration
Cliquer sur le bouton **"Passer et Configurer Plus Tard"** en haut de la page (couleur ambre/orange).

### Option 2: Sauter l'Étape de Mot de Passe
À l'étape 1, cliquer sur **"Passer cette étape"** pour aller directement à la configuration de l'entreprise.

### Option 3: Utiliser la Configuration Par Défaut
À l'étape 2, cliquer sur **"Passer et utiliser la configuration par défaut"** pour créer une configuration temporaire.

### Option 4: Configuration Complète
Remplir tous les champs et suivre le processus normalement.

## Avantages

1. **Aucun Blocage:** L'utilisateur peut toujours sortir de la page
2. **Flexibilité:** Plusieurs options pour sauter ou compléter partiellement
3. **Expérience Utilisateur:** Boutons clairs et visibles
4. **Robustesse:** Redirection forcée en cas d'erreur
5. **Débogage Facile:** Logs console pour identifier les problèmes

## Configuration Temporaire

Si l'utilisateur passe la configuration, il peut la compléter plus tard dans:
**Paramètres → Entreprise**

Les valeurs temporaires sont facilement identifiables:
- "Configuration Temporaire"
- "À configurer"
- "temp@example.com"
- "000-000-0000"
- "H0H 0H0"

## Tests Recommandés

1. ✅ Cliquer sur "Passer et Configurer Plus Tard" dès l'arrivée
2. ✅ Cliquer sur "Passer cette étape" à l'étape 1
3. ✅ Cliquer sur "Passer et utiliser la configuration par défaut" à l'étape 2
4. ✅ Compléter normalement toute la configuration
5. ✅ Vérifier que les valeurs temporaires apparaissent dans les paramètres

## Notes Techniques

- Utilisation de `window.location.href = '/'` pour garantir le rechargement complet
- Upsert avec `onConflict: 'organization_id'` pour éviter les erreurs de duplication
- Délais de sécurité (500ms, 1000ms, 3000ms) pour laisser le temps aux opérations
- Fallback sur les valeurs de l'organisation existante si disponibles
