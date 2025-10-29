# 🚨 LIRE EN PREMIER - Fix PGRST116 Centre de Réclamations

**Ton erreur**: `Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row`

---

## ⚡ SOLUTION EN 3 CLICS (2 minutes)

### 1️⃣ Ouvre Supabase
https://supabase.com/dashboard → Ton projet → **SQL Editor**

### 2️⃣ Copie-Colle Ce Script
Ouvre le fichier **`FIX_DUPLICATES_CLAIM_SETTINGS_IMMEDIATE.sql`**
- Ctrl+A (tout sélectionner)
- Ctrl+C (copier)
- Colle dans SQL Editor
- Clique **"Run"**

### 3️⃣ Teste l'App
- Recharge l'app (F5)
- Ouvre Centre de réclamations
- L'erreur devrait avoir **disparu** ✅

---

## 🔍 C'est Quoi le Problème?

Ta base de données a **2 copies** des mêmes paramètres.

**Exemple**:
```
Table: claim_settings
┌──────────────┬────────────────┐
│ Record #1    │ Org: ABC       │  ← Duplicate
│ Record #2    │ Org: ABC       │  ← Duplicate
└──────────────┴────────────────┘
```

Quand l'app demande les paramètres, elle trouve 2 lignes au lieu d'1 → **Erreur PGRST116**

---

## ✅ Ce Que le Script Fait

1. **Trouve** les duplicates
2. **Supprime** les vieux (garde le plus récent)
3. **Ajoute une protection** pour éviter que ça se reproduise

**Résultat**: 1 seule copie des paramètres → Plus d'erreur!

---

## 📋 Après l'Exécution

Tu devrais voir:
```
✅ SUCCÈS: Tous les duplicates ont été supprimés!
✅ Contrainte unique ajoutée sur claim_settings
✅ Contrainte unique ajoutée sur company_settings
✅ Contrainte unique ajoutée sur pricing_settings
✅ Contrainte unique ajoutée sur tax_settings
```

---

## 🆘 Ça Ne Marche Pas?

**Envoie-moi**:
- Screenshot de l'erreur SQL (si le script ne s'exécute pas)
- Screenshot de la console (F12) (si l'erreur persiste)

Je te donne un fix en 5 minutes.

---

## 📚 Documentation Complète

Si tu veux tous les détails:
- **Guide détaillé**: `CORRECTION_PGRST116_CENTRE_RECLAMATIONS.md`
- **Résumé technique**: `SOLUTION_TROUVEE_PGRST116.md`
- **Toute la doc**: `INDEX_CORRECTION_PGRST116.md`

---

**TL;DR**: Copie-colle le script SQL, exécute, c'est réglé. 2 minutes max.
