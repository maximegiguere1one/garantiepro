# ✅ Ajouter le Secret SITE_URL (30 secondes)

## Commande à Exécuter

Ouvrez un terminal et exécutez cette commande:

```bash
npx supabase secrets set SITE_URL=https://www.garantieproremorque.com
```

**OU si vous avez Supabase CLI installé:**

```bash
supabase secrets set SITE_URL=https://www.garantieproremorque.com
```

---

## Ce Que Ça Fait

Cette commande ajoute le secret `SITE_URL` à vos Edge Functions Supabase.

La fonction `invite-user` utilise ce secret pour:
- Générer les liens avec le **BON domaine** (garantieproremorque.com)
- Remplacer automatiquement localhost par votre domaine de production
- Fonctionner SANS avoir besoin de configurer le Dashboard

---

## Si Vous N'avez Pas Supabase CLI

1. **Installer Supabase CLI:**
```bash
npm install -g supabase
```

2. **Login:**
```bash
supabase login
```

3. **Link votre projet:**
```bash
supabase link --project-ref fkxldrkkqvputdgfpayi
```

4. **Ajouter le secret:**
```bash
supabase secrets set SITE_URL=https://www.garantieproremorque.com
```

---

## Vérifier

Après avoir ajouté le secret, testez:

1. Créer une invitation (mode email)
2. Vérifier l'email reçu
3. **Le lien doit pointer vers `https://www.garantieproremorque.com`**

---

## Alternative (Si Ça Ne Marche Pas)

Utilisez le **mode création manuelle** à la place:
- Vous définissez le mot de passe
- Aucun email n'est envoyé
- Aucun lien requis
- Vous partagez les credentials directement

---

**Temps:** 30 secondes
**Après ça:** Les liens dans les emails seront corrects!
