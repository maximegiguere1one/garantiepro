# Configuration du Portail Intuit Developer

## Informations pour votre application QuickBooks

Voici les valeurs exactes à entrer dans le portail Intuit Developer (https://developer.intuit.com/app/developer/appdetails/keys):

### 1. App Details

**Host domain:**
```
app.garantieproremorque.com
```

**Launch URL:**
```
https://app.garantieproremorque.com
```

**Disconnect URL:**
```
https://app.garantieproremorque.com/settings?tab=integrations
```

### 2. Redirect URIs

Ajoutez ces URLs dans la section "Redirect URIs":

**Production:**
```
https://app.garantieproremorque.com/settings?tab=integrations
```

**Développement local (si nécessaire):**
```
http://localhost:5173/settings?tab=integrations
```

### 3. Scopes requis

Assurez-vous que ces scopes sont activés:
- ✅ `com.intuit.quickbooks.accounting` - Accès complet à QuickBooks Online

### 4. Webhooks (Optionnel)

Si vous voulez recevoir des notifications de QuickBooks, configurez:

**Webhook URL:**
```
https://app.garantieproremorque.com/api/webhooks/quickbooks
```

## Étapes de configuration

### Étape 1: Créer l'application
1. Allez sur https://developer.intuit.com/
2. Cliquez sur "My Apps" → "Create an app"
3. Sélectionnez "QuickBooks Online and Payments"
4. Nommez votre application (ex: "Garantie Pro Remorque")

### Étape 2: Configurer les URLs
1. Dans l'onglet "Keys & credentials"
2. Remplissez les champs avec les valeurs ci-dessus
3. Cliquez sur "Save"

### Étape 3: Obtenir vos identifiants
1. Copiez le **Client ID**
2. Copiez le **Client Secret**
3. Entrez-les dans l'interface Settings → Integrations de votre application

### Étape 4: Tester la connexion
1. Dans Settings → Integrations, entrez vos identifiants
2. Cliquez sur "Connecter OAuth"
3. Vous serez redirigé vers QuickBooks pour autoriser l'application
4. Après autorisation, vous serez redirigé vers votre application

## Fonctionnement automatique

Une fois configuré, voici ce qui se passe automatiquement:

### ✅ Création de garantie
1. L'utilisateur crée une garantie dans l'application
2. La garantie est sauvegardée dans la base de données
3. **AUTOMATIQUEMENT**: Une facture est créée dans QuickBooks avec:
   - Le client (créé s'il n'existe pas)
   - Le numéro de contrat comme numéro de facture
   - Le montant total avec taxes
   - La description "Warranty [numéro de contrat]"

### ✅ Gestion des erreurs
- Si QuickBooks n'est pas connecté → La garantie est créée normalement (pas d'erreur)
- Si QuickBooks est connecté mais échoue → La garantie est créée + message d'avertissement
- Si QuickBooks est connecté et réussit → La garantie est créée + confirmation de sync

### ✅ Synchronisation manuelle
Les utilisateurs peuvent aussi synchroniser manuellement depuis:
- Settings → Integrations → QuickBooks Sync
- Voir toutes les garanties non synchronisées
- Synchroniser individuellement ou en masse

## Support et dépannage

### Erreur: "Invalid Client"
→ Vérifiez que le Client ID et Client Secret sont corrects

### Erreur: "Redirect URI mismatch"
→ Assurez-vous que l'URL de redirection correspond exactement à celle configurée dans le portail

### Erreur: "Token expired"
→ Les tokens expirent après 1 heure. L'application devra les rafraîchir automatiquement (fonctionnalité à implémenter)

### Voir les logs
→ Settings → Integrations → "Voir les logs" pour voir l'historique de toutes les tentatives de synchronisation

## Notes importantes

1. **Mode Sandbox vs Production**: Utilisez le mode sandbox pour les tests, puis passez en production
2. **Sécurité**: Ne partagez JAMAIS vos Client Secret
3. **Limites API**: QuickBooks a des limites de requêtes (500/minute en général)
4. **Maintenance**: Les tokens doivent être rafraîchis régulièrement (implémentation recommandée)

## Prochaines améliorations recommandées

1. **Rafraîchissement automatique des tokens** - Avant qu'ils n'expirent
2. **Synchronisation bidirectionnelle** - Récupérer les paiements depuis QuickBooks
3. **Webhooks** - Recevoir des notifications en temps réel
4. **Retry logic** - Réessayer automatiquement en cas d'échec temporaire
5. **Logs détaillés** - Interface pour voir les détails de chaque synchronisation
