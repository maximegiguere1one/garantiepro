# Guide du Système de Téléchargement Sécurisé des Garanties

## Vue d'ensemble

Le système permet aux clients de télécharger leurs documents de garantie (contrat signé et facture) via un lien sécurisé envoyé par email automatiquement après la création d'une garantie.

## Fonctionnalités Principales

### 1. Génération Automatique de Tokens
- Token UUID sécurisé unique par garantie
- Expiration configurable (par défaut: 90 jours)
- Téléchargements illimités ou limités selon configuration
- Audit trail complet de tous les accès

### 2. Email de Confirmation au Client
Lorsqu'une garantie est créée, le client reçoit **automatiquement** un email contenant:
- Résumé de la garantie (numéro de contrat, dates, montant)
- Informations sur le véhicule assuré
- **Bouton de téléchargement bien visible** avec lien sécurisé
- Lien de secours en cas de problème avec le bouton
- Notification de l'expiration du lien (90 jours)

### 3. Page de Téléchargement Publique
- Interface moderne et intuitive
- Validation du token en temps réel
- Affichage des détails de la garantie
- Téléchargement individuel des documents
- Option "Tout télécharger"
- Messages d'erreur clairs (token expiré, invalide, etc.)
- Compteur de téléchargements restants

### 4. Sécurité et Audit
- Tous les accès sont enregistrés (IP, user agent, timestamp)
- Possibilité de révoquer un token à tout moment
- Rate limiting via logging
- Protection contre les abus
- Expiration automatique des tokens

## Architecture Technique

### Base de Données

#### Table `warranty_download_tokens`
Stocke les tokens de téléchargement avec:
- Token UUID unique
- Warranty ID
- Organization ID
- Email et nom du client
- Date d'expiration
- Limite de téléchargements (optionnel)
- Statut (actif/révoqué)

#### Table `warranty_download_logs`
Audit trail de tous les accès:
- Type de document téléchargé
- Résultat de l'accès (succès/échec)
- Adresse IP
- User agent
- Timestamp
- Raison de l'échec (si applicable)

### Edge Function: `download-warranty-documents`

**Endpoint**: `/functions/v1/download-warranty-documents?token=UUID&type=all|contract|customer_invoice`

**Fonctionnalités**:
1. Valide le token
2. Vérifie l'expiration et les limites
3. Génère des URLs signées pour les documents PDF
4. Enregistre l'accès dans les logs
5. Incrémente le compteur de téléchargements

**Paramètres**:
- `token` (required): Token UUID de téléchargement
- `type` (optional): Type de document (`all`, `contract`, `customer_invoice`)

**Réponse**:
```json
{
  "success": true,
  "documents": {
    "contractUrl": "https://...",
    "customerInvoiceUrl": "https://...",
    "warrantyDetails": {
      "contractNumber": "W-2025-001",
      "customerName": "John Doe",
      "startDate": "2025-01-01",
      "endDate": "2031-01-01",
      "totalPrice": 1500.00
    }
  },
  "downloadsRemaining": null
}
```

### Trigger de Base de Données

Le trigger `notify_new_warranty()` est exécuté automatiquement lors de la création d'une garantie:
1. **Crée le token de téléchargement** via `create_warranty_download_token()`
2. **Génère l'URL de téléchargement** avec le token
3. **Envoie l'email au client** avec:
   - Template HTML professionnel
   - Lien de téléchargement intégré
   - Détails de la garantie
   - Support bilingue (FR/EN)
4. **Envoie une notification aux admins** (conservé)

## Utilisation

### Pour les Clients

1. **Réception de l'email**
   - Le client reçoit l'email automatiquement après la signature
   - L'email contient un gros bouton bleu "Télécharger mes documents"

2. **Accès à la page de téléchargement**
   - Cliquer sur le bouton ou le lien
   - La page valide automatiquement le token
   - Affiche les détails de la garantie

3. **Téléchargement des documents**
   - Cliquer sur "Contrat de Garantie Signé" pour télécharger le contrat
   - Cliquer sur "Facture Détaillée" pour télécharger la facture
   - Ou cliquer sur "Tout Télécharger" pour obtenir les deux

### Pour les Administrateurs

#### Créer un Token Manuellement (si nécessaire)
```javascript
import { createWarrantyDownloadToken } from './lib/warranty-download-utils';

const result = await createWarrantyDownloadToken(
  warrantyId,
  'client@example.com',
  'John Doe',
  90,  // expire dans 90 jours
  null // téléchargements illimités
);

if (result.success) {
  console.log('Token créé:', result.token);
}
```

#### Révoquer un Token
```javascript
import { revokeDownloadToken } from './lib/warranty-download-utils';

const result = await revokeDownloadToken(
  token,
  'Token compromis' // raison
);
```

#### Consulter les Statistiques
```javascript
import { getWarrantyDownloadStats } from './lib/warranty-download-utils';

const stats = await getWarrantyDownloadStats(warrantyId);
// {
//   total_downloads: 5,
//   unique_ips: 2,
//   successful_downloads: 4,
//   failed_downloads: 1,
//   last_download_at: "2025-01-15T10:30:00Z"
// }
```

#### Consulter l'Historique
```javascript
import { getWarrantyDownloadLogs } from './lib/warranty-download-utils';

const logs = await getWarrantyDownloadLogs(warrantyId, 50);
// Array of download attempts with IP, timestamp, result, etc.
```

## Configuration

### Durée d'Expiration par Défaut
Dans `20251013050000_create_warranty_download_system.sql`:
- Modifier `p_expires_in_days integer DEFAULT 90`

### Limite de Téléchargements
Dans `20251013060000_update_warranty_email_with_download_link.sql`:
- Modifier le paramètre `NULL` (illimité) vers un nombre spécifique

### URL de Base
Dans le trigger `notify_new_warranty()`:
```sql
v_base_url := 'https://app.locationproremorque.ca';
```
Modifier selon l'environnement.

## Flux de Données Complet

```
[Création Garantie]
        ↓
[Trigger: notify_new_warranty()]
        ↓
[Création Token de Téléchargement] → [warranty_download_tokens]
        ↓
[Génération URL sécurisée]
        ↓
[Envoi Email Client] → [email_queue] → [Resend API]
        ↓
[Client Clique Lien]
        ↓
[Page: /download-warranty?token=UUID]
        ↓
[Validation Token] → [RPC: validate_warranty_download_token]
        ↓
[Edge Function: download-warranty-documents]
        ↓
[Génération URLs Signées] → [Supabase Storage]
        ↓
[Log Téléchargement] → [warranty_download_logs]
        ↓
[Client Télécharge Documents]
```

## Sécurité

### Protections Implémentées
- ✅ Tokens UUID cryptographiquement sécurisés
- ✅ Expiration automatique des tokens
- ✅ Validation stricte côté serveur
- ✅ URLs signées avec expiration courte (1h)
- ✅ Audit trail complet
- ✅ Rate limiting via logging
- ✅ Protection contre les tokens invalides/expirés
- ✅ RLS (Row Level Security) sur toutes les tables

### Bonnes Pratiques
1. **Ne jamais partager les tokens** - Chaque token est personnel
2. **Surveiller les logs** - Détecter les accès suspects
3. **Révoquer si nécessaire** - Possibilité de révoquer un token compromis
4. **URLs signées courtes** - Les URLs de documents expirent après 1h

## Résolution de Problèmes

### Le client ne reçoit pas l'email
1. Vérifier la configuration Resend
2. Vérifier que l'email du client est valide
3. Consulter la table `email_queue` pour voir le statut
4. Vérifier les logs de l'edge function `send-email`

### Le lien de téléchargement ne fonctionne pas
1. Vérifier que le token n'est pas expiré
2. Vérifier que le token n'est pas révoqué
3. Consulter `warranty_download_logs` pour voir les tentatives
4. Vérifier que les PDFs existent dans Supabase Storage

### Les documents ne se téléchargent pas
1. Vérifier les URLs signées ne sont pas expirées
2. Vérifier les permissions du storage bucket
3. Consulter les logs de l'edge function
4. Vérifier que les PDFs sont bien stockés

## Maintenance

### Nettoyage des Tokens Expirés
Exécuter périodiquement:
```sql
SELECT cleanup_expired_download_tokens();
```
Cette fonction désactive automatiquement les tokens expirés.

### Monitoring
- Surveiller la vue `warranty_download_stats`
- Analyser les `warranty_download_logs` pour détecter les anomalies
- Vérifier le taux de succès des téléchargements

## Améliorations Futures Possibles

1. **Téléchargement ZIP** - Bundler tous les documents dans un fichier ZIP
2. **Notification d'expiration** - Envoyer un rappel avant l'expiration du lien
3. **Renouvellement de lien** - Permettre au client de demander un nouveau lien
4. **Dashboard client** - Espace personnel pour accéder aux documents
5. **Signature QR Code** - Ajouter un QR code pour accès rapide
6. **Analytics avancés** - Tableaux de bord des téléchargements

## Support

Pour toute question ou problème:
1. Consulter les logs dans Supabase
2. Vérifier la configuration Resend
3. Tester avec un token de démo
4. Contacter l'équipe technique

---

**Dernière mise à jour**: 13 octobre 2025
**Version**: 1.0.0
**Statut**: ✅ Implémenté et testé
