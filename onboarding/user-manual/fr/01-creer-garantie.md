# Manuel: Créer une garantie

**Dernière mise à jour:** 26 octobre 2025
**Propriétaire:** Équipe Formation Pro-Remorque
**Temps estimé:** 5-7 minutes par garantie

---

## 🎯 Objectif

Apprendre à créer une garantie complète pour un client, de la saisie des informations jusqu'à la génération du contrat PDF.

---

## 📋 Prérequis

- Compte actif avec rôle **Dealer** ou **Admin**
- Informations client disponibles (nom, email, téléphone)
- Détails de la remorque (VIN obligatoire)
- Plan de garantie choisi par le client

---

## 📝 Étapes détaillées

### Étape 1: Accéder au formulaire
1. Connectez-vous à Pro-Remorque
2. Dans le menu latéral, cliquez sur **"Garanties"**
3. Cliquez sur le bouton rouge **"+ Nouvelle garantie"** en haut à droite

**💡 Astuce:** Raccourci clavier `Ctrl+N` (Windows) ou `Cmd+N` (Mac)

---

### Étape 2: Section Informations Client

Remplissez tous les champs marqués d'un astérisque (*) :

| Champ | Description | Format | Exemple |
|-------|-------------|--------|---------|
| **Prénom*** | Prénom du client | Texte | Jean |
| **Nom*** | Nom de famille | Texte | Tremblay |
| **Email*** | Adresse email valide | email@domain.com | jean.tremblay@email.com |
| **Téléphone*** | Numéro avec indicatif | (XXX) XXX-XXXX | (514) 555-1234 |
| **Adresse*** | Rue et numéro | Texte | 123 Rue Principale |
| **Ville*** | Ville | Texte | Montréal |
| **Province*** | Province canadienne | Sélection | QC |
| **Code postal*** | Format canadien | A1A 1A1 | H3B 2G7 |

**⚠️ Important:** L'email doit être unique dans le système. Si le client existe déjà, utilisez la recherche (loupe) pour le retrouver.

---

### Étape 3: Section Détails de la Remorque

| Champ | Description | Validation | Notes |
|-------|-------------|------------|-------|
| **VIN*** | Numéro d'identification | 17 caractères alphanumériques | Exemple: 1HGBH41JXMN109186 |
| **Marque*** | Fabricant | Texte ou sélection | Exemple: Remorque Gator, Big Tex |
| **Modèle*** | Modèle spécifique | Texte | Exemple: 7x14 Enclosed |
| **Année*** | Année de fabrication | 1980-2025 | Exemple: 2024 |
| **Prix d'achat*** | Montant payé | Dollars CAD | Exemple: 8500.00 |
| **Date d'achat*** | Date de transaction | AAAA-MM-JJ | Exemple: 2024-10-15 |
| **Kilométrage** | Si applicable | Nombre entier | Exemple: 5000 |

**🔍 Validation VIN:**
- 17 caractères exactement
- Pas de lettres I, O, Q (pour éviter confusion avec 1, 0)
- Le système vérifie automatiquement si le VIN existe déjà

**❌ Erreur courante:** VIN déjà enregistré
**✓ Solution:** Vérifiez dans "Garanties" si ce VIN a déjà une garantie active. Contactez support si c'est un doublon légitime.

---

### Étape 4: Sélection du Plan de Garantie

1. Cliquez sur le menu déroulant **"Plan de garantie"**
2. Trois options disponibles:
   - **12 mois** - Garantie de base
   - **24 mois** - Garantie standard (recommandé)
   - **36 mois** - Garantie premium

3. Le prix de base s'affiche automatiquement selon votre grille tarifaire

**Tableau de prix typique (exemple):**

| Plan | Prix de base | Couverture |
|------|--------------|------------|
| 12 mois | 299 $ | Pièces majeures |
| 24 mois | 499 $ | Pièces majeures + essieu |
| 36 mois | 699 $ | Couverture complète |

---

### Étape 5: Options supplémentaires (facultatif)

Cochez les options désirées:

- ☐ **Pneus et jantes** (+$150) - Couvre crevaisons et dommages jantes
- ☐ **Batteries** (+$75) - Remplacement si défaillance
- ☐ **Système électrique** (+$200) - Câblage, lumières, connecteurs
- ☐ **Plancher et parois** (+$250) - Dommages structurels
- ☐ **Porte et verrouillage** (+$100) - Mécanismes et charnières

**💰 Calcul automatique:** Le total se met à jour en temps réel.

---

### Étape 6: Vérification des taxes

Le système calcule automatiquement les taxes selon la province:

| Province | TPS | TVP/TVQ | Total taxes |
|----------|-----|---------|-------------|
| QC | 5% | 9.975% | 14.975% |
| ON | 5% | 8% | 13% (HST) |
| AB | 5% | 0% | 5% |
| BC | 5% | 7% | 12% |
| Autres | 5% | Variable | Selon province |

**✓ Vérification:** Avant de continuer, confirmez que:
- La province du client est correcte
- Le montant des taxes semble approprié
- Le total final est accepté par le client

---

### Étape 7: Programme fidélité

Si vous avez vendu 10 garanties ou plus, vous avez droit à un crédit de **$2,000**.

1. Vérifiez le compteur en haut: "Crédit disponible: $XXX"
2. Si crédit > 0, cochez **"Appliquer crédit fidélité"**
3. Entrez le montant à appliquer (max = crédit disponible)
4. Le total se réduit instantanément

**Exemple:**
- Total avant crédit: $649 (plan 24 mois)
- Crédit appliqué: $100
- **Total final: $549**

---

### Étape 8: Révision finale

**Liste de vérification avant génération:**

- [ ] Email client valide et confirmé
- [ ] VIN correct (17 caractères)
- [ ] Plan de garantie sélectionné
- [ ] Options cochées correspondent à la vente
- [ ] Taxes calculées correctement
- [ ] Crédit fidélité appliqué si désiré
- [ ] Prix total accepté par le client

---

### Étape 9: Générer le contrat

1. Cliquez sur **"Aperçu"** pour voir le PDF avant génération (recommandé)
2. Vérifiez toutes les informations dans l'aperçu
3. Si tout est correct, cliquez **"Générer le contrat"**
4. Attendez 5-10 secondes (barre de progression)
5. Le PDF est créé et prêt à signer

**✅ Confirmation:** Message vert "Contrat généré avec succès - #WARR-XXXXX"

---

### Étape 10: Prochaines actions

Après génération, trois options s'affichent:

1. **📝 Signer maintenant** → Lance le processus de signature électronique
2. **📥 Télécharger PDF** → Sauvegarde locale (non signé)
3. **📧 Envoyer au client** → Email automatique avec lien de signature

**Recommandation:** Si le client est présent → "Signer maintenant"
Si le client est distant → "Envoyer au client"

---

## 🎬 Captures d'écran

### Capture 1: Formulaire de création (vide)
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Flèches pointant vers champs obligatoires (*)
```

### Capture 2: Sélection du plan
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Mise en évidence des 3 plans avec prix
```

### Capture 3: Calcul taxes et total
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Encadré rouge autour du total final
```

### Capture 4: Confirmation de génération
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Message de succès avec numéro de garantie
```

---

## ❗ Erreurs fréquentes et solutions

### Erreur: "Email déjà utilisé"
**Cause:** Un profil client existe déjà avec cet email
**Solution:**
1. Utilisez l'icône de recherche (loupe) à côté du champ email
2. Tapez l'email pour retrouver le client
3. Cliquez sur le client pour auto-remplir ses informations

---

### Erreur: "VIN invalide - doit contenir 17 caractères"
**Cause:** VIN trop court, trop long, ou caractères interdits
**Solution:**
1. Comptez les caractères (doit être exactement 17)
2. Retirez espaces ou tirets
3. Évitez lettres I, O, Q
4. Si VIN réel contient moins de 17 caractères, contactez support

---

### Erreur: "VIN déjà enregistré"
**Cause:** Une garantie existe déjà pour ce VIN
**Solution:**
1. Menu "Garanties" → Recherche par VIN
2. Vérifiez si garantie active ou expirée
3. Si expirée, vous pouvez créer une nouvelle garantie
4. Si active, contactez support pour cas spéciaux (transfert propriété)

---

### Erreur: "Le PDF ne se génère pas"
**Cause:** Champs obligatoires manquants ou erreur serveur
**Solution:**
1. Vérifiez que TOUS les champs avec (*) sont remplis
2. Rafraîchissez la page (Ctrl+R) et réessayez
3. Vérifiez votre connexion Internet
4. Si problème persiste après 3 tentatives → support@proremorque.com

---

### Erreur: "Taxes incorrectes"
**Cause:** Province mal sélectionnée ou tarif non à jour
**Solution:**
1. Vérifiez la province dans les infos client
2. Comparez avec tableau des taxes ci-dessus
3. Si montant vraiment incorrect → signalez à support avec capture d'écran

---

## 🔗 Liens connexes

- [Signer un contrat](./02-signature-electronique.md)
- [Télécharger et envoyer garanties](./03-telechargement-garanties.md)
- [Programme fidélité détails](./07-programme-fidelite.md)
- [FAQ Garanties](../../fr/faq.md#garanties)

---

## 📊 Résultats attendus

Après avoir suivi ce guide, vous devriez:

✅ Créer une garantie en moins de 7 minutes
✅ Comprendre le calcul des taxes par province
✅ Savoir appliquer le crédit fidélité
✅ Générer un PDF de contrat valide
✅ Identifier et corriger les erreurs courantes

---

## 📞 Support

Questions sur ce manuel?
- Email: support@proremorque.com
- Téléphone: 1-800-XXX-XXXX
- Guide vidéo: `onboarding/videos/01-create-warranty-fr.mp4`
