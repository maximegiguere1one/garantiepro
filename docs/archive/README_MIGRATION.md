# 📦 Migration de Données - Location Pro-Remorque

Bienvenue! Ce guide vous aide à transférer toutes vos données de votre ancien projet vers ce nouveau projet Supabase.

## 🎯 Ce qui sera migré

✅ **TOUS vos utilisateurs** - Profils, rôles, permissions
✅ **TOUS vos clients** - Informations complètes
✅ **TOUTES vos remorques** - Inventaire complet
✅ **TOUTES vos garanties** - Contrats, PDFs, signatures
✅ **TOUS vos paiements** - Historique complet
✅ **TOUTES vos réclamations** - Avec timeline et documents
✅ **TOUS vos paramètres** - Configuration, taxes, tarifs

## 🚦 Avant de Commencer

**✋ STOP!** Assurez-vous d'avoir:

- [ ] Accès à votre ancien projet Supabase
- [ ] Les droits administrateur sur l'ancien projet
- [ ] 15 minutes de temps disponible
- [ ] Une connexion internet stable

## 📚 Guides Disponibles

### 🏃 Migration Rapide (15 min)
**Recommandé pour:** Vous voulez migrer rapidement sans lire tous les détails

👉 [MIGRATION_RAPIDE.md](./MIGRATION_RAPIDE.md) - 3 étapes simples

### 📖 Guide Complet (30 min)
**Recommandé pour:** Vous voulez comprendre chaque étape en détail

👉 [GUIDE_MIGRATION.md](./GUIDE_MIGRATION.md) - Explications complètes + dépannage

## 🎬 Commencez Ici

### Option A: Migration Express (pour les pressés)

```bash
# 1. Créez votre fichier de config
cp .env.migration.example .env.migration

# 2. Éditez .env.migration avec vos anciennes clés
# (Voir MIGRATION_RAPIDE.md pour savoir où les trouver)

# 3. Testez d'abord
node migrate-data.mjs --dry-run

# 4. Si OK, lancez la vraie migration
node migrate-data.mjs --execute
```

### Option B: Je Veux Comprendre (lecture recommandée)

1. Lisez d'abord [MIGRATION_RAPIDE.md](./MIGRATION_RAPIDE.md) (5 min)
2. Suivez les étapes une par une
3. Consultez [GUIDE_MIGRATION.md](./GUIDE_MIGRATION.md) en cas de questions

## 🔐 Sécurité

**⚠️ IMPORTANT:**
- Ne partagez JAMAIS votre fichier `.env.migration`
- Les `service_role` keys donnent accès total à votre base de données
- Supprimez `.env.migration` après la migration

## 🆘 Besoin d'Aide?

### Problèmes Courants

**❌ "Connection refused"**
→ Vérifiez vos URLs et clés dans `.env.migration`

**❌ "Permission denied"**
→ Utilisez la `service_role` key (pas `anon` key)

**❌ "Duplicate key"**
→ Normal! Le script gère les duplicatas automatiquement

### Support

Si vous êtes bloqué:
1. Relisez le [GUIDE_MIGRATION.md](./GUIDE_MIGRATION.md) - Section Dépannage
2. Vérifiez que toutes vos clés sont correctes
3. Gardez le message d'erreur complet pour analyse

## 📊 Après la Migration

Une fois terminé, vous devriez voir:
- ✅ Toutes vos données dans le nouveau projet
- ✅ Tous les liens entre les données préservés
- ✅ Tous les paramètres configurés
- ✅ Prêt à utiliser immédiatement!

## 🎉 Prêt?

👉 **Commencez par:** [MIGRATION_RAPIDE.md](./MIGRATION_RAPIDE.md)

---

**Questions fréquentes:**

**Q: Est-ce que l'ancienne base sera supprimée?**
R: NON! Le script ne fait que COPIER les données. L'ancien projet reste intact.

**Q: Combien de temps ça prend?**
R: 5-15 minutes selon la quantité de données.

**Q: Puis-je annuler si ça se passe mal?**
R: Oui! Faites toujours `--dry-run` d'abord pour vérifier.

**Q: Mes données sont-elles en sécurité?**
R: Oui! Le transfert se fait de manière sécurisée via HTTPS.
