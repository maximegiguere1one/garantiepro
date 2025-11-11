# 🚀 Guide de Migration de Données

Ce guide vous explique comment transférer toutes vos données de votre ancien projet Supabase vers ce nouveau projet.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir:

1. ✅ Accès à votre ancien projet Supabase
2. ✅ Les identifiants de connexion (URL + Service Role Key)
3. ✅ Une sauvegarde de votre ancienne base de données (par sécurité)

## 🔐 Étape 1: Récupérer les Clés de l'Ancien Projet

### A. Connectez-vous à Supabase

1. Allez sur https://app.supabase.com
2. Connectez-vous avec votre compte
3. Sélectionnez votre **ANCIEN** projet (celui avec les données)

### B. Récupérez l'URL du Projet

1. Cliquez sur **Settings** (⚙️) dans le menu de gauche
2. Allez dans **API**
3. Trouvez **Project URL**
4. Copiez l'URL (ex: `https://abcdefgh.supabase.co`)

### C. Récupérez la Service Role Key

1. Toujours dans **Settings → API**
2. Trouvez **service_role key** (PAS la clé `anon`!)
3. Cliquez sur "Reveal" pour afficher la clé
4. Copiez la clé complète

⚠️ **IMPORTANT:** La `service_role` key est très sensible! Ne la partagez JAMAIS publiquement.

## ⚙️ Étape 2: Configurer le Script de Migration

### A. Créer le Fichier de Configuration

1. Copiez le fichier exemple:
   ```bash
   cp .env.migration.example .env.migration
   ```

2. Ouvrez `.env.migration` dans un éditeur de texte

3. Remplissez les valeurs:
   ```bash
   SOURCE_SUPABASE_URL=https://votre-ancien-projet.supabase.co
   SOURCE_SUPABASE_SERVICE_KEY=eyJhbGci...votre_vraie_clé_ici
   ```

4. Sauvegardez le fichier

### B. Vérifier la Configuration du Nouveau Projet

Le nouveau projet est déjà configuré dans `.env`. Vérifiez que ces valeurs sont correctes:

```bash
VITE_SUPABASE_URL=https://lfpdfdugijzewshxwofy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## 🧪 Étape 3: Test de Migration (DRY-RUN)

Avant de transférer les données réellement, testez d'abord:

```bash
node migrate-data.mjs --dry-run
```

Cette commande va:
- ✅ Vérifier les connexions aux deux bases de données
- ✅ Compter combien de données seront migrées
- ✅ Afficher un rapport détaillé
- ❌ **SANS MODIFIER AUCUNE DONNÉE**

### Exemple de Sortie:

```
🔍 MODE: SIMULATION (DRY-RUN)
   Aucune donnée ne sera modifiée

📍 SOURCE: https://ancien-projet.supabase.co
📍 CIBLE: https://lfpdfdugijzewshxwofy.supabase.co

🔍 Test de connexion aux bases de données...
   ✅ Connexion SOURCE établie
   ✅ Connexion CIBLE établie

📦 Migration de la table: profiles
   📊 5 enregistrements trouvés
   ✅ [DRY-RUN] 5 enregistrements seraient migrés

📦 Migration de la table: customers
   📊 50 enregistrements trouvés
   ✅ [DRY-RUN] 50 enregistrements seraient migrés

📦 Migration de la table: warranties
   📊 120 enregistrements trouvés
   ✅ [DRY-RUN] 120 enregistrements seraient migrés

...

RAPPORT DE MIGRATION
═══════════════════════════════════════════════════════════
Table                  | Source | Migré  | Erreurs
───────────────────────────────────────────────────────────
profiles               | 5      | 5      | 0
customers              | 50     | 50     | 0
trailers               | 80     | 80     | 0
warranties             | 120    | 120    | 0
claims                 | 15     | 15     | 0
───────────────────────────────────────────────────────────
TOTAL                  | 270    | 270    | 0
═══════════════════════════════════════════════════════════

✅ SIMULATION TERMINÉE
   Pour effectuer la migration réelle:
   node migrate-data.mjs --execute
```

## 🎯 Étape 4: Migration Réelle

⚠️ **ATTENTION:** Cette étape va modifier votre nouvelle base de données!

Une fois que vous êtes satisfait du dry-run:

```bash
node migrate-data.mjs --execute
```

### Ce qui se Passe:

1. **Connexion** aux deux bases de données
2. **Transfert** des données table par table dans l'ordre correct
3. **Gestion** des conflits (duplicatas)
4. **Rapport** final avec statistiques

### Ordre de Migration:

Le script migre les tables dans le bon ordre pour respecter les clés étrangères:

1. 📊 **Tables de référence** (warranty_plans, warranty_options, organizations, tax_rates)
2. 👥 **Utilisateurs** (profiles)
3. ⚙️ **Paramètres** (company_settings, pricing_rules)
4. 👤 **Clients** (customers)
5. 🚛 **Remorques** (trailers)
6. 📄 **Garanties** (warranties)
7. 💳 **Paiements** (payments)
8. 🔧 **Réclamations** (claims, claim_timeline, claim_attachments)

## ✅ Étape 5: Vérification

Après la migration:

1. **Connectez-vous** à l'application: https://bolt.new/~/maximepaquettegitone/abt-9kxyxqw...

2. **Vérifiez** que vous voyez vos données:
   - Nombre de garanties
   - Liste des clients
   - Réclamations existantes
   - Paramètres configurés

3. **Testez** quelques fonctionnalités:
   - Créer une nouvelle garantie
   - Voir les détails d'un client
   - Consulter une réclamation

## 🔧 Dépannage

### Erreur: "Connection refused"

- Vérifiez que les URLs sont correctes (pas de slash `/` à la fin)
- Vérifiez que les clés sont complètes (pas de retours à la ligne)

### Erreur: "Permission denied"

- Assurez-vous d'utiliser la `service_role` key (pas `anon` key)
- Vérifiez que vous avez les droits admin sur l'ancien projet

### Erreur: "Duplicate key"

- Normal pour les tables avec des valeurs par défaut (tax_rates, pricing_rules)
- Le script gère automatiquement les duplicatas avec `upsert`

### Erreur: "Foreign key constraint"

- Le script respecte l'ordre des dépendances
- Si problème, contactez le support

## 📊 Données Migrées

Le script migre TOUTES vos données:

✅ **Utilisateurs & Profils**
- Tous vos utilisateurs avec leurs rôles
- Informations de profil

✅ **Clients & Remorques**
- Tous vos clients
- Toutes les remorques associées
- Historique complet

✅ **Garanties**
- Tous les contrats de garantie
- Plans et options
- PDFs et signatures

✅ **Paiements**
- Historique des paiements
- Statuts et reçus

✅ **Réclamations**
- Toutes les réclamations
- Timeline complète
- Documents attachés

✅ **Paramètres**
- Configuration d'entreprise
- Taux de taxes
- Règles de tarification
- Templates de notifications

## 🆘 Support

Si vous rencontrez des problèmes:

1. **Vérifiez** d'abord que toutes les clés sont correctes
2. **Relancez** le dry-run pour diagnostiquer
3. **Gardez** le rapport d'erreur pour analyse
4. **Contactez** le support avec les détails de l'erreur

## 🎉 Félicitations!

Une fois la migration terminée avec succès, votre nouvelle application est prête à être utilisée avec toutes vos données historiques! 🚀
