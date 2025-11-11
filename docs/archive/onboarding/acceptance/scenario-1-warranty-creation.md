# Scénario d'acceptance #1: Créer, Signer et Télécharger une garantie

**Objectif:** Valider capacité à créer garantie complète end-to-end
**Durée:** 15 minutes
**Environnement:** Staging (app-staging.proremorque.com)
**Prérequis:** Compte actif, accès staging

---

## 📋 Données de test fournies

Utilisez ces données exactes pour validation uniforme:

**Client:**
```
Prénom: Alexandre
Nom: Bouchard
Email: alexandre.bouchard.test@proremorque.com
Téléphone: (514) 555-7890
Adresse: 789 Rue des Érables
Ville: Trois-Rivières
Province: QC
Code postal: G8Z 1X2
```

**Remorque:**
```
VIN: 5STAGING0TEST1234
Marque: Big Tex
Modèle: 16' Cargo Trailer
Année: 2024
Prix d'achat: 12,500.00 $
Date d'achat: [Date du jour]
```

**Garantie:**
```
Plan: 24 mois (499$)
Options:
  ☑ Pneus et jantes (+150$)
  ☑ Système électrique (+200$)
```

---

## 🎯 Étapes d'exécution

### Partie 1: Création (7 min)

**Étape 1.1:** Connexion
- [ ] Ouvrir https://app-staging.proremorque.com
- [ ] Se connecter avec identifiants fournis
- [ ] Vérifier présence dashboard

**Étape 1.2:** Accéder formulaire
- [ ] Menu Garanties → Nouvelle garantie
- [ ] Formulaire s'affiche correctement
- [ ] Tous champs visibles

**Étape 1.3:** Remplir informations client
- [ ] Entrer prénom: Alexandre
- [ ] Entrer nom: Bouchard
- [ ] Entrer email: alexandre.bouchard.test@proremorque.com
- [ ] Entrer téléphone: (514) 555-7890
- [ ] Entrer adresse complète selon données ci-dessus
- [ ] Sélectionner Province: Québec (QC)
- [ ] Entrer code postal: G8Z 1X2

**Étape 1.4:** Remplir détails remorque
- [ ] Entrer VIN: 5STAGING0TEST1234
- [ ] Message validation: ✅ "VIN disponible"
- [ ] Entrer marque: Big Tex
- [ ] Entrer modèle: 16' Cargo Trailer
- [ ] Entrer année: 2024
- [ ] Entrer prix: 12500.00
- [ ] Sélectionner date d'achat: [Aujourd'hui]

**Étape 1.5:** Sélectionner plan et options
- [ ] Sélectionner plan: 24 mois
- [ ] Prix affiché: 499 $
- [ ] Cocher option: Pneus et jantes
- [ ] Prix mis à jour: +150 $ = 649 $
- [ ] Cocher option: Système électrique
- [ ] Prix mis à jour: +200 $ = 849 $

**Étape 1.6:** Vérifier calcul taxes (QC)
- [ ] Sous-total affiché: 849.00 $
- [ ] TPS 5%: 42.45 $
- [ ] TVQ 9.975%: 84.69 $
- [ ] **Total attendu: 976.14 $**
- [ ] Vérifier total affiché = 976.14 $ ✅

**Étape 1.7:** Générer contrat
- [ ] Cliquer bouton "Aperçu" (optionnel)
- [ ] Si aperçu: vérifier toutes infos correctes
- [ ] Cliquer "Générer le contrat"
- [ ] Barre de progression s'affiche
- [ ] Message confirmation: "Contrat généré - #WARR-XXXXX"
- [ ] **Noter numéro garantie:** WARR-______

**✅ Résultat attendu Partie 1:**
- Garantie créée avec numéro unique
- Total = 976.14 $
- Statut = Non signée
- PDF disponible en téléchargement

---

### Partie 2: Signature (5 min)

**Étape 2.1:** Lancer signature
- [ ] Après génération, bouton "Signer maintenant" visible
- [ ] Cliquer "Signer maintenant"
- [ ] Pop-up choix méthode s'affiche

**Étape 2.2:** Signer en personne
- [ ] Sélectionner "Signature en personne"
- [ ] Écran signature plein écran s'affiche
- [ ] Zone blanche de signature visible
- [ ] Boutons Effacer et Valider visibles

**Étape 2.3:** Tracer signature
- [ ] Tracer signature avec souris/doigt/stylet
- [ ] Signature apparaît en couleur (bleu/noir)
- [ ] Signature ressemble à vraie signature manuscrite
- [ ] Si insatisfait: cliquer Effacer et recommencer

**Étape 2.4:** Valider signature
- [ ] Cliquer bouton "✓ Valider"
- [ ] Message "Traitement signature..." s'affiche
- [ ] Barre de progression 3-5 secondes
- [ ] Message "Signature enregistrée avec succès" ✅

**Étape 2.5:** Vérifier certificat
- [ ] Pop-up ou overlay affiche informations:
  - Signataire: Alexandre Bouchard
  - Date/heure: [Timestamp actuel]
  - Adresse IP: [Votre IP staging]
  - Méthode: En personne
- [ ] Toutes infos présentes et cohérentes

**✅ Résultat attendu Partie 2:**
- Signature enregistrée
- Certificat généré avec IP + timestamp
- Statut garantie passe à "Signée"

---

### Partie 3: Téléchargement (3 min)

**Étape 3.1:** Télécharger PDF signé
- [ ] Après signature, bouton "Télécharger PDF signé" visible
- [ ] Cliquer "Télécharger PDF signé"
- [ ] Fichier se télécharge: `Contrat_WARR-XXXXX_Signe.pdf`
- [ ] Fichier taille: 200-500 KB environ

**Étape 3.2:** Ouvrir et vérifier PDF
- [ ] Ouvrir PDF dans Adobe Reader (pas navigateur)
- [ ] PDF contient 4-5 pages
- [ ] Page 1: Infos client visibles (Alexandre Bouchard, Trois-Rivières)
- [ ] Page 2: Détails remorque (VIN, Big Tex, 12,500$)
- [ ] Page 3: Plan 24 mois + Options (Pneus, Électrique)
- [ ] Page 4: Signature visible du client
- [ ] Total 976.14 $ affiché clairement

**Étape 3.3:** Vérifier signature Adobe
- [ ] Dans Adobe Reader: Panneau gauche → icône Signatures
- [ ] Signature listée
- [ ] Cliquer sur signature
- [ ] Détails popup:
  - ✅ Signature valide
  - ✅ Document non modifié
  - Date présente
  - Signataire: Alexandre Bouchard

**Étape 3.4:** Télécharger certificat
- [ ] Retour dans Pro-Remorque
- [ ] Ouvrir garantie créée
- [ ] Onglet "Signature et Preuves"
- [ ] Bouton "Télécharger certificat" visible
- [ ] Cliquer télécharger
- [ ] Fichier PDF certificat téléchargé
- [ ] Ouvrir certificat:
  - IP visible
  - Timestamp UTC
  - Hash SHA-256 présent
  - Mentions LCSE, UETA, eIDAS

**✅ Résultat attendu Partie 3:**
- PDF signé téléchargé et lisible
- Signature validée dans Adobe
- Certificat complet disponible
- Toutes preuves légales présentes

---

## 📸 Captures d'écran requises

**Prenez 6 captures pour preuve d'exécution:**

1. **Formulaire rempli** (avant génération)
   - Toutes sections visibles
   - Total 976.14 $ visible

2. **Confirmation génération**
   - Message "Contrat généré #WARR-XXXXX"
   - Numéro garantie visible

3. **Écran signature**
   - Zone signature avec tracé
   - Boutons Effacer/Valider visibles

4. **Certificat signature**
   - Pop-up avec IP, timestamp, signataire
   - Tous détails lisibles

5. **PDF ouvert**
   - Page 1 du contrat
   - Nom client, total, plan visibles

6. **Validation Adobe**
   - Panneau Signatures ouvert
   - Badge "Signature valide" visible

---

## ✅ Critères de succès

**Le scénario est RÉUSSI si:**

| Critère | Validation |
|---------|------------|
| Garantie créée sans erreur | ✅ Numéro WARR-XXXXX obtenu |
| Calcul taxes correct (QC) | ✅ Total = 976.14 $ exact |
| Signature enregistrée | ✅ Certificat avec IP + timestamp |
| PDF téléchargeable | ✅ Fichier lisible, 4-5 pages |
| Signature valide Adobe | ✅ Badge vert "Signature valide" |
| Certificat complet | ✅ Hash SHA-256, conformité LCSE |

**Score:** ___/6

**Seuil acceptation:** 6/6 (100%)

---

## ❌ Problèmes courants et solutions

**Problème:** VIN "5STAGING0TEST1234" déjà utilisé
**Solution:** Ajoutez chiffre à la fin: 5STAGING0TEST12345, 12346, etc.

**Problème:** Total taxes ≠ 976.14 $
**Solution:** Vérifiez province = QC. Si autre province, total différent est NORMAL.

**Problème:** Signature ne s'enregistre pas
**Solution:** Utilisez Chrome ou Firefox récent. Désactivez bloqueurs popup.

**Problème:** PDF ne contient pas signature
**Solution:** Téléchargez "PDF signé", pas "PDF original".

**Problème:** Adobe dit "Signature invalide"
**Solution:** NORMAL en staging (certificat test). En production, sera valide.

---

## 📊 Rapport d'exécution

**À compléter après exécution:**

```
Date exécution: ___________
Exécuteur: ___________
Environnement: Staging
Navigateur: ___________ Version: ___

Résultats:
- Partie 1 (Création): ☐ Réussi ☐ Échoué
- Partie 2 (Signature): ☐ Réussi ☐ Échoué
- Partie 3 (Téléchargement): ☐ Réussi ☐ Échoué

Temps total: ___ minutes (objectif: 15 min)

Captures jointes: ☐ 6 fichiers attachés

Commentaires / Problèmes rencontrés:
_________________________________________________
_________________________________________________

Note globale: ☐ ACCEPTÉ ☐ REFUSÉ
```

---

## 🎓 Validation finale

**Envoyez à:** validation@proremorque.com

**Objet:** Scénario 1 complété - [Votre nom]

**Pièces jointes:**
- 6 captures d'écran
- PDF contrat signé
- PDF certificat signature
- Ce rapport rempli

**Délai validation:** 24-48h ouvrables

**Résultat:** Email confirmation si ACCEPTÉ, sinon points à corriger.

---

**Bon succès! 🎯**
