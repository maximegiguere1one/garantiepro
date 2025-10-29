# Guide de Configuration Resend - IMPORTANT

## Problème Actuel

Vous voyez l'erreur: **"Domain locationproremorque.ca is not verified"**

Cela signifie que Resend ne peut pas envoyer d'emails car le domaine n'est pas encore configuré.

---

## Solution en 3 Étapes (15 minutes)

### Étape 1: Ajouter le Domaine dans Resend

1. Allez sur https://resend.com/domains
2. Cliquez sur **"Add Domain"**
3. Entrez: `locationproremorque.ca` (le domaine RACINE, pas un sous-domaine)
4. Cliquez sur **"Add"**

**IMPORTANT:** N'ajoutez PAS `info.locationproremorque.ca` - utilisez uniquement `locationproremorque.ca`

---

### Étape 2: Configurer les Enregistrements DNS

Après avoir ajouté le domaine, Resend vous affichera 4 enregistrements DNS à ajouter chez votre fournisseur de domaine (GoDaddy, Cloudflare, etc.).

#### A. Enregistrement SPF (TXT)
```
Type: TXT
Nom: @ (ou locationproremorque.ca)
Valeur: v=spf1 include:amazonses.com ~all
TTL: 3600 (ou automatique)
```

#### B. Enregistrements DKIM (3 CNAME)
Resend vous donnera 3 enregistrements similaires à ceux-ci:

**Enregistrement 1:**
```
Type: CNAME
Nom: resend._domainkey
Valeur: [valeur fournie par Resend, se termine par .amazonses.com]
TTL: 3600 (ou automatique)
```

**Enregistrement 2:**
```
Type: CNAME
Nom: resend2._domainkey
Valeur: [valeur fournie par Resend, se termine par .amazonses.com]
TTL: 3600 (ou automatique)
```

**Enregistrement 3:**
```
Type: CNAME
Nom: resend3._domainkey
Valeur: [valeur fournie par Resend, se termine par .amazonses.com]
TTL: 3600 (ou automatique)
```

#### Comment Ajouter les Enregistrements DNS

**Chez GoDaddy:**
1. Connectez-vous à GoDaddy
2. Allez dans "My Products" > "Domains"
3. Cliquez sur votre domaine > "DNS"
4. Cliquez sur "Add" pour chaque enregistrement
5. Copiez-collez les valeurs exactes de Resend

**Chez Cloudflare:**
1. Connectez-vous à Cloudflare
2. Sélectionnez votre domaine
3. Allez dans "DNS" > "Records"
4. Cliquez sur "Add record" pour chaque enregistrement
5. Copiez-collez les valeurs exactes de Resend

#### Vérifier la Propagation DNS

1. Attendez 15-30 minutes après avoir ajouté les enregistrements
2. Retournez dans Resend Dashboard > Domains
3. Cliquez sur le bouton **"Verify"** à côté de votre domaine
4. Le statut devrait passer à **"Verified"** avec une coche verte

**Astuce:** Utilisez https://dnschecker.org pour vérifier que les enregistrements se propagent correctement

---

### Étape 3: Configurer les Secrets Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu latéral: **Settings** > **Edge Functions**
4. Cliquez sur **"Add secret"** pour chaque secret ci-dessous:

#### Secret 1: RESEND_API_KEY
```
Name: RESEND_API_KEY
Value: [votre clé API Resend - commence par re_]
```

Pour obtenir votre clé API:
- Allez sur https://resend.com/api-keys
- Cliquez sur "Create API Key"
- Nom: "Location Pro-Remorque Production"
- Permissions: "Sending access" (ou Full access)
- Copiez la clé immédiatement (commence par `re_`)

#### Secret 2: FROM_EMAIL
```
Name: FROM_EMAIL
Value: info@locationproremorque.ca
```

#### Secret 3: FROM_NAME
```
Name: FROM_NAME
Value: Location Pro-Remorque
```

**Important:** Cliquez sur **"Save"** après avoir ajouté chaque secret.

---

## Test de Validation

Une fois les 3 étapes complétées:

1. Connectez-vous à votre application
2. Allez dans **Paramètres** > **Notifications**
3. Entrez votre adresse email dans le champ de test
4. Cliquez sur **"Tester"**

### Résultat Attendu

✅ **Succès:** "Email de test envoyé avec succès!"
- Vérifiez votre boîte de réception
- L'expéditeur doit être: "Location Pro-Remorque <info@locationproremorque.ca>"

❌ **Erreur Possible:** "Domain locationproremorque.ca is not verified"
- Le domaine n'est pas encore vérifié dans Resend
- Attendez quelques minutes de plus pour la propagation DNS
- Vérifiez que le statut dans Resend Dashboard est "Verified"

---

## Checklist Rapide

Avant de tester, assurez-vous que:

- [ ] Domaine `locationproremorque.ca` ajouté dans Resend
- [ ] Les 4 enregistrements DNS (1 SPF + 3 DKIM) sont ajoutés chez votre fournisseur
- [ ] Attendu 15-30 minutes pour la propagation DNS
- [ ] Cliqué sur "Verify" dans Resend Dashboard
- [ ] Statut du domaine est "Verified" (coche verte)
- [ ] Clé API Resend créée et copiée
- [ ] 3 secrets configurés dans Supabase (RESEND_API_KEY, FROM_EMAIL, FROM_NAME)

---

## Questions Fréquentes

**Q: Dois-je utiliser `locationproremorque.ca` ou `info.locationproremorque.ca`?**
R: Utilisez le domaine RACINE: `locationproremorque.ca`. Ensuite vous pouvez envoyer depuis `info@locationproremorque.ca`.

**Q: Combien de temps pour la propagation DNS?**
R: Généralement 15-30 minutes, mais peut prendre jusqu'à 2 heures dans certains cas.

**Q: Puis-je tester avant que le domaine soit vérifié?**
R: Non, vous obtiendrez l'erreur "Domain not verified". Attendez que Resend affiche "Verified".

**Q: Le plan gratuit Resend suffit-il?**
R: Oui, le plan gratuit offre 3,000 emails/mois (100/jour), largement suffisant pour commencer.

**Q: Dois-je redéployer les fonctions après avoir ajouté les secrets?**
R: Non, les secrets sont disponibles immédiatement.

---

## Support

**Besoin d'aide?**
- Documentation Resend: https://resend.com/docs/send-with-nodejs
- Support Resend: support@resend.com
- Vérification DNS: https://dnschecker.org

**Logs d'erreur:**
- Supabase Dashboard > Edge Functions > send-email > Logs
- Console navigateur: F12 > Console (pour voir les erreurs détaillées)

---

**Dernière mise à jour:** 4 Octobre 2025
**Temps estimé:** 15 minutes (+ temps de propagation DNS)
