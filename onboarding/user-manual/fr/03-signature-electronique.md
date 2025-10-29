# Manuel: Signature électronique et preuve légale

**Dernière mise à jour:** 26 octobre 2025
**Propriétaire:** Équipe Conformité Pro-Remorque
**Temps estimé:** 3-5 minutes

---

## 🎯 Objectif

Comprendre et utiliser le système de signature électronique conforme, incluant la génération de preuves légales (IP + horodatage).

---

## 📋 Prérequis

- Contrat de garantie généré (PDF prêt)
- Rôle **Dealer** ou **Admin**
- Client présent (signature en personne) OU email client valide (signature à distance)

---

## 🔐 Conformité légale

Notre système de signature respecte:
- **Loi canadienne sur les signatures électroniques (LCSE)**
- **UETA (Uniform Electronic Transactions Act)** - États-Unis
- **eIDAS** - Standards européens

**Chaque signature génère:**
1. **Horodatage certifié** (timestamp UTC)
2. **Adresse IP du signataire**
3. **Hash cryptographique du document** (SHA-256)
4. **Certificat de signature PDF/A**

---

## 📝 Deux méthodes de signature

### Méthode 1: Signature en personne 🖊️
**Scénario:** Client présent au comptoir/bureau avec tablette ou écran tactile

### Méthode 2: Signature à distance 📧
**Scénario:** Client reçoit lien email pour signer de chez lui

---

## 🖊️ MÉTHODE 1: Signature en personne

### Étape 1: Lancer le processus
1. Après génération du contrat, cliquez **"Signer maintenant"**
2. Sélectionnez **"Signature en personne"**
3. L'écran de signature s'affiche en plein écran

---

### Étape 2: Préparation de l'appareil

**Appareils recommandés:**
- ✅ Tablette iPad (10" ou +)
- ✅ Tablette Android (10" ou +)
- ✅ Écran tactile Windows (15" ou +)
- ✅ Ordinateur portable avec trackpad
- ⚠️ Smartphone (possible mais petit, moins idéal)

**Configuration:**
1. Assurez-vous que l'écran est propre
2. Mode paysage recommandé (plus d'espace)
3. Luminosité suffisante
4. Désactivez verrouillage auto pendant signature

---

### Étape 3: Informer le client

**Script recommandé:**
```
"M./Mme [Nom], je vais vous demander de signer le contrat électroniquement.
Vous allez signer directement sur l'écran/tablette avec votre doigt ou un stylet.
Signez dans le rectangle comme vous signez normalement sur papier.
Si vous faites une erreur, pas de problème, on peut effacer et recommencer."
```

**Montrez l'exemple:** Faites un geste de signature au-dessus de l'écran (sans toucher) pour démontrer.

---

### Étape 4: Le client signe

**Zone de signature:**
- Rectangle blanc clairement délimité
- Texte: "Signez ici avec votre doigt ou stylet"
- Taille: Environ 6" × 2" (15 cm × 5 cm)

**Conseils au client:**
1. **Posez le doigt/stylet** dans le rectangle
2. **Tracez votre signature** normalement
3. **Levez le doigt** à la fin
4. La signature apparaît en bleu/noir

**Boutons disponibles pendant signature:**
- **Effacer** (↻) - Recommencer si insatisfait
- **Annuler** (✕) - Abandonner le processus
- **Valider** (✓) - Confirmer la signature

---

### Étape 5: Validation de la signature

1. Client clique **"Valider"** ✓ (ou vous le faites pour lui)
2. Message: "Vérification de la signature..."
3. Barre de progression 3-5 secondes
4. **Système enregistre automatiquement:**
   - Image de la signature
   - Horodatage exact (ex: 2024-10-26 14:32:15 UTC)
   - Adresse IP de l'appareil (ex: 192.168.1.50)
   - Géolocalisation (si permissions accordées)

5. Confirmation: "Signature enregistrée avec succès ✅"

---

### Étape 6: Génération du PDF signé

Processus automatique:
1. PDF original + signature = PDF signé
2. Certificat de signature ajouté
3. Document verrouillé (non modifiable)
4. Disponible immédiatement pour téléchargement

**Temps de traitement:** 5-10 secondes

---

### Étape 7: Télécharger et remettre au client

**Trois options:**

**Option A: Téléchargement immédiat**
1. Cliquez **"Télécharger PDF signé"**
2. Fichier sauvegardé localement
3. Imprimez ou envoyez par email au client

**Option B: Email automatique**
1. Cliquez **"Envoyer par email"**
2. Client reçoit PDF en pièce jointe (< 1 min)
3. Objet: "Votre contrat de garantie Pro-Remorque signé"

**Option C: Les deux**
1. Téléchargez pour vos dossiers
2. Envoyez aussi par email au client
3. ✅ **Recommandé** - Double sauvegarde

---

## 📧 MÉTHODE 2: Signature à distance

### Étape 1: Préparer l'envoi
1. Après génération contrat, cliquez **"Envoyer pour signature"**
2. Vérifiez l'email du client (pré-rempli)
3. Ajoutez message personnalisé (optionnel):
   ```
   Bonjour [Nom],

   Voici votre contrat de garantie pour votre remorque [Marque Modèle].
   Cliquez sur le lien ci-dessous pour signer électroniquement.
   Le document sera disponible immédiatement après signature.

   Merci et bon voyage!
   ```

4. Cliquez **"Envoyer le lien de signature"**

---

### Étape 2: Ce que le client reçoit

**Email envoyé contient:**
- Lien unique sécurisé (expire après 30 jours)
- Instructions claires en français/anglais
- Aperçu du contrat (lecture seule)
- Bouton **"SIGNER LE CONTRAT"**

**Sujet email:** "Signature requise - Contrat de garantie Pro-Remorque #WARR-XXXXX"

---

### Étape 3: Processus côté client

Le client clique sur le lien et:

1. **Page de signature s'ouvre** (navigateur)
   - Aucun compte requis
   - Aucun téléchargement nécessaire

2. **Révision du contrat**
   - PDF s'affiche à l'écran
   - Client peut défiler et lire
   - Bouton **"Signer"** en bas

3. **Zone de signature apparaît**
   - Options:
     - Dessiner avec souris/doigt
     - Taper nom (signature typographiée)
     - Uploader image signature (si disponible)

4. **Validation**
   - Client clique "Accepter et signer"
   - Confirmation email instantané
   - PDF signé disponible en téléchargement

**Temps total client:** 2-3 minutes

---

### Étape 4: Notifications et suivi

**Vous recevez notification quand:**
- ✅ Client a ouvert le lien (statut: "Vu")
- ✅ Client a signé (statut: "Signé")
- ⏰ 7 jours sans action (relance auto)
- ❌ Lien expiré (30 jours)

**Tableau de bord:**
- Menu **"Garanties"** → colonne "Statut signature"
- 🟡 En attente
- 🔵 Vu par client
- 🟢 Signé
- 🔴 Expiré

---

### Étape 5: Relances automatiques

Si client ne signe pas:
- **J+3:** Email de rappel automatique
- **J+7:** Deuxième rappel
- **J+14:** Troisième rappel
- **J+28:** Notification finale "Expire dans 2 jours"
- **J+30:** Lien expire, statut "Expiré"

**Renvoyer un lien:**
1. Ouvrez la garantie
2. Section "Signature"
3. Cliquez **"Renvoyer lien de signature"**
4. Nouveau lien généré (expire +30 jours)

---

## 🔍 Certificat de signature et preuve légale

### Où trouver la preuve?

**Méthode 1: Via le PDF signé**
1. Ouvrez le PDF signé dans Adobe Reader
2. Panneau "Signatures" (icône ruban bleu)
3. Cliquez sur la signature
4. **Détails du certificat** s'affichent

**Méthode 2: Via Pro-Remorque**
1. Menu **"Garanties"**
2. Cliquez sur le numéro de garantie
3. Onglet **"Signature et preuves"**
4. Section **"Certificat de signature"**

---

### Informations contenues dans le certificat

```
═══════════════════════════════════════════
   CERTIFICAT DE SIGNATURE ÉLECTRONIQUE
   Pro-Remorque Inc.
═══════════════════════════════════════════

Numéro de garantie: WARR-12345
Document: Contrat_Garantie_WARR-12345.pdf
Hash SHA-256: a3f5b8c2e1d4...9f7e6c5b4a3

SIGNATAIRE
──────────────────────────────────────────
Nom: Jean Tremblay
Email: jean.tremblay@email.com
Méthode: Signature en personne / À distance

HORODATAGE
──────────────────────────────────────────
Date/Heure (UTC): 2024-10-26 14:32:15 UTC
Date/Heure (EST): 2024-10-26 10:32:15 EST
Fuseau horaire: America/Montreal

LOCALISATION
──────────────────────────────────────────
Adresse IP: 192.168.1.50
Pays: Canada
Province/État: Québec
Ville: Montréal (approximatif)

INTÉGRITÉ DOCUMENT
──────────────────────────────────────────
Statut: ✅ Non modifié depuis signature
Algorithme: SHA-256
Certifié par: Pro-Remorque Certificate Authority

VALIDITÉ LÉGALE
──────────────────────────────────────────
Conforme LCSE (Canada): ✅ Oui
Conforme UETA (USA): ✅ Oui
Conforme eIDAS (EU): ✅ Oui

═══════════════════════════════════════════
Ce certificat fait foi de la validité de
la signature électronique.
═══════════════════════════════════════════
```

---

### Exporter le certificat

1. Onglet "Signature et preuves"
2. Cliquez **"Télécharger certificat"**
3. Formats disponibles:
   - **PDF** (pour archives papier)
   - **JSON** (pour systèmes informatiques)
   - **XML** (pour échange B2B)

---

## 🎬 Captures d'écran

### Capture 1: Écran signature en personne (vide)
```
[PLACEHOLDER: Screenshot 1280x720]
Annotations: Zone de signature, boutons Effacer/Valider
```

### Capture 2: Signature en cours
```
[PLACEHOLDER: Screenshot 1280x720]
Annotations: Signature tracée en bleu, curseur visible
```

### Capture 3: Email reçu par client (signature à distance)
```
[PLACEHOLDER: Screenshot 1280x720]
Annotations: Bouton CTA, instructions, logo Pro-Remorque
```

### Capture 4: Certificat de signature complet
```
[PLACEHOLDER: Screenshot 1280x720]
Annotations: IP, timestamp, hash, validité légale
```

---

## ❗ Erreurs fréquentes et solutions

### Erreur: "Signature non détectée"
**Cause:** Tracé trop léger ou appareil non tactile
**Solution:**
1. Appuyez plus fermement
2. Tracez plus lentement
3. Utilisez stylet si disponible
4. Si souris: maintenez bouton enfoncé pendant tout le tracé

---

### Erreur: "Impossible de générer le PDF signé"
**Cause:** Problème serveur temporaire ou connexion
**Solution:**
1. Attendez 30 secondes et réessayez
2. Vérifiez connexion Internet
3. Si persiste, signature est SAUVEGARDÉE, PDF générable plus tard
4. Contactez support avec #garantie si >1 heure

---

### Problème: "Client n'a pas reçu l'email de signature"
**Causes possibles:**
- Email dans spam/courrier indésirable
- Adresse email incorrecte
- Boîte de réception pleine

**Solutions:**
1. Demandez client de vérifier spam
2. Vérifiez email dans profil garantie (fautes de frappe?)
3. Renvoyez lien via bouton "Renvoyer"
4. Alternative: imprimez et signature manuscrite (scanner ensuite)

---

### Problème: "Le lien de signature est expiré"
**Cause:** 30 jours écoulés depuis envoi
**Solution:**
1. Menu Garanties → sélectionnez garantie
2. Cliquez **"Renvoyer lien de signature"**
3. Nouveau lien valide 30 jours envoyé
4. Si problème récurrent, passez à signature en personne

---

### Problème: "Certificat de signature ne s'affiche pas"
**Cause:** PDF ouvert dans navigateur au lieu d'Adobe Reader
**Solution:**
1. Téléchargez le PDF localement
2. Ouvrez avec **Adobe Acrobat Reader** (gratuit)
3. Panneau gauche → icône "Signatures"
4. Cliquez signature pour voir détails

---

## 🔗 Liens connexes

- [Créer une garantie](./01-creer-garantie.md)
- [Télécharger et archiver contrats](./03-telechargement-garanties.md)
- [Aspects légaux signatures électroniques](./10-conformite-legale.md)
- [FAQ Signatures](../../fr/faq.md#signatures)

---

## 📊 Résultats attendus

Après ce manuel:

✅ Lancer signature en personne en moins de 2 minutes
✅ Envoyer lien signature à distance correctement
✅ Comprendre et vérifier les preuves légales (IP + timestamp)
✅ Télécharger et archiver certificats de signature
✅ Résoudre problèmes courants de signature

---

## 📞 Support technique

Problème avec signature électronique?
- Email: support@proremorque.com (priorité haute)
- Téléphone: 1-800-XXX-XXXX
- Guide vidéo: `onboarding/videos/03-electronic-signature-fr.mp4`

**Délai résolution:** < 1 heure ouvrables pour problèmes signature
