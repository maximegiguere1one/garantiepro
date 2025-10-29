# Configuration Complète du Portail Intuit Developer

## Guide étape par étape pour configurer votre application QuickBooks

---

## Section 1: App Details (Keys & credentials)

### Client ID et Client Secret
Ces valeurs sont générées automatiquement par Intuit. Copiez-les et sauvegardez-les dans un endroit sécurisé.

---

## Section 2: Compliance

### ✅ Add your app's end-user license agreement and privacy policy

**End-user license agreement URL:**
```
https://app.garantieproremorque.com/license-agreement
```

**Privacy policy URL:**
```
https://app.garantieproremorque.com/privacy-policy
```

---

### ✅ Add your app's host domain, launch URL, and disconnect URL

**Host domain:**
```
app.garantieproremorque.com
```
*Note: Entrer SANS le "https://" - juste le domaine*

**Launch URL:**
```
https://app.garantieproremorque.com
```
*URL où les clients arrivent après l'authentification*

**Disconnect URL:**
```
https://app.garantieproremorque.com/settings?tab=integrations
```
*URL où les clients sont redirigés après déconnexion*

---

### ✅ Select at least one category for your app

**Catégories recommandées pour Garantie Pro Remorque:**

Cochez ces catégories (maximum 4):

1. ✅ **Customer Management**
   - Gestion des clients et leurs garanties

2. ✅ **Contract Management**
   - Gestion des contrats de garantie

3. ✅ **Invoicing**
   - Création automatique de factures dans QuickBooks

4. ✅ **Sales**
   - Processus de vente de garanties

**Catégories alternatives si nécessaire:**
- Document Management (pour les contrats PDF)
- Customer Order Management (pour les commandes de garanties)
- Inventory Management (pour l'inventaire de remorques)

---

### ✅ Tell us about any regulated industries that use your app

**Réponse recommandée:**

```
Notre application est utilisée par des concessionnaires de remorques au Canada
pour gérer des contrats de garantie prolongée. L'application respecte:

- LPRPDE (Loi sur la protection des renseignements personnels et les documents électroniques)
- Loi 25 du Québec sur la protection des renseignements personnels
- Règlements de l'industrie automobile et des remorques au Canada

Aucune industrie hautement réglementée spécifique (finance, santé, etc.)
```

---

### ✅ Tell us where your app is hosted

**Plateforme d'hébergement:**
```
Supabase (hébergement cloud)
```

**Région du serveur:**
```
Canada / Amérique du Nord
```

**Description détaillée:**
```
Application hébergée sur Supabase avec infrastructure cloud sécurisée.
Base de données PostgreSQL avec chiffrement au repos et en transit.
Déploiement via Netlify/Vercel avec CDN global.
Conformité SOC 2 Type II via les fournisseurs d'infrastructure.
```

---

## Section 3: Redirect URIs

### URLs de redirection OAuth

Dans la section "Redirect URIs", ajoutez ces URLs:

**Production:**
```
https://app.garantieproremorque.com/settings?tab=integrations
```

**Développement (optionnel):**
```
http://localhost:5173/settings?tab=integrations
```

*Note: Vous pouvez ajouter plusieurs URLs de redirection pour différents environnements*

---

## Section 4: Webhooks (Optionnel)

Si vous voulez recevoir des notifications en temps réel de QuickBooks:

**Webhook URL:**
```
https://app.garantieproremorque.com/api/webhooks/quickbooks
```

**Événements à surveiller:**
- Invoice created
- Invoice updated
- Customer created
- Customer updated
- Payment created

*Note: Les webhooks nécessitent une implémentation backend supplémentaire*

---

## Résumé des URLs de votre application

| Type | URL |
|------|-----|
| Application principale | https://app.garantieproremorque.com |
| Licence utilisateur | https://app.garantieproremorque.com/license-agreement |
| Politique de confidentialité | https://app.garantieproremorque.com/privacy-policy |
| Paramètres/Intégrations | https://app.garantieproremorque.com/settings?tab=integrations |
| Soumission publique de réclamation | https://app.garantieproremorque.com/claim/submit/:token |

---

## Checklist de configuration

- [ ] Créer l'application dans le portail Intuit Developer
- [ ] Copier et sauvegarder le Client ID et Client Secret
- [ ] Remplir Host domain: `app.garantieproremorque.com`
- [ ] Remplir Launch URL: `https://app.garantieproremorque.com`
- [ ] Remplir Disconnect URL: `https://app.garantieproremorque.com/settings?tab=integrations`
- [ ] Ajouter Redirect URI: `https://app.garantieproremorque.com/settings?tab=integrations`
- [ ] Ajouter License Agreement URL: `https://app.garantieproremorque.com/license-agreement`
- [ ] Ajouter Privacy Policy URL: `https://app.garantieproremorque.com/privacy-policy`
- [ ] Sélectionner les 4 catégories appropriées
- [ ] Remplir les informations sur les industries réglementées
- [ ] Remplir les informations d'hébergement
- [ ] Activer le scope: `com.intuit.quickbooks.accounting`
- [ ] Tester la connexion OAuth depuis l'application
- [ ] Vérifier la synchronisation des factures

---

## Prochaines étapes après la configuration

### 1. Test en mode Sandbox
- Utilisez les identifiants de développement pour tester
- Créez une garantie test et vérifiez la synchronisation
- Consultez les logs dans Settings → Integrations

### 2. Passage en Production
- Demandez l'approbation de production dans le portail Intuit
- Attendez la validation d'Intuit (peut prendre quelques jours)
- Mettez à jour les identifiants de production dans l'application
- Désactivez le mode test dans Settings → Integrations

### 3. Formation des utilisateurs
- Documentez le processus de connexion QuickBooks
- Créez un guide utilisateur pour la synchronisation
- Testez avec quelques utilisateurs pilotes

---

## Support et dépannage

### Liens utiles
- Portail Intuit Developer: https://developer.intuit.com/
- Documentation OAuth 2.0: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
- API Reference: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
- Support Intuit: https://help.developer.intuit.com/s/

### Problèmes courants

**"Redirect URI mismatch"**
→ Vérifiez que l'URL est exactement la même dans le portail et dans votre code

**"Invalid Client"**
→ Vérifiez que vous utilisez les bons identifiants (sandbox vs production)

**"Scope not authorized"**
→ Vérifiez que le scope `com.intuit.quickbooks.accounting` est activé

**"Token expired"**
→ Les tokens expirent après 1 heure, implémentez le rafraîchissement automatique

---

## Contact

Pour toute question technique concernant l'intégration:
- Email: info@garantieproremorque.com
- Documentation: Consultez INTUIT_DEVELOPER_CONFIGURATION.md

---

**Dernière mise à jour:** 4 octobre 2025
**Version:** 1.0
