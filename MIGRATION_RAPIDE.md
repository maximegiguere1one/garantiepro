# 🚀 Migration Rapide - 3 Étapes

## Étape 1: Récupérer vos Anciennes Clés (5 min)

1. Allez sur https://app.supabase.com
2. Sélectionnez votre **ANCIEN** projet
3. Cliquez sur **⚙️ Settings** → **API**
4. Copiez:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **service_role key** (cliquez "Reveal" pour voir)

## Étape 2: Configurer le Script (2 min)

1. Créez le fichier de configuration:
   ```bash
   cp .env.migration.example .env.migration
   ```

2. Ouvrez `.env.migration` et remplissez:
   ```bash
   SOURCE_SUPABASE_URL=https://votre-ancien-projet.supabase.co
   SOURCE_SUPABASE_SERVICE_KEY=eyJhbG...votre_clé_complète
   ```

3. Sauvegardez

## Étape 3: Migrer (10 min)

1. **Test d'abord** (pour voir ce qui sera migré):
   ```bash
   node migrate-data.mjs --dry-run
   ```

2. **Si tout est OK**, lancez la vraie migration:
   ```bash
   node migrate-data.mjs --execute
   ```

3. **Attendez** que ça se termine (quelques minutes selon la quantité de données)

## ✅ C'est Fini!

Vous pouvez maintenant vous connecter à l'application et retrouver toutes vos données:
- ✅ Tous vos utilisateurs
- ✅ Tous vos clients
- ✅ Toutes vos remorques
- ✅ Toutes vos garanties
- ✅ Toutes vos réclamations
- ✅ Tous vos paramètres

---

📖 **Guide détaillé:** Voir [GUIDE_MIGRATION.md](./GUIDE_MIGRATION.md) pour plus d'informations.
