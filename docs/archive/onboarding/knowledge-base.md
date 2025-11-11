# Knowledge Base - Guide équipe support Pro-Remorque

**Audience:** Équipe support, agents service client
**Objectif:** Résoudre 80%+ tickets via self-service
**Dernière mise à jour:** 26 octobre 2025

---

## 🎯 Vue d'ensemble

Ce guide vous aide à:
1. Utiliser efficacement la documentation onboarding
2. Trouver réponses rapidement
3. Guider clients vers self-service
4. Escalader problèmes techniques complexes
5. Maintenir base de connaissances

---

## 📚 Structure documentation

### Hiérarchie contenu

```
┌─────────────────────────────────────────┐
│  1. Quickstart (fr/quickstart.md)      │
│     → Premier contact, 30 min          │
│     → 5 tâches essentielles            │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  2. FAQ (fr/faq.md)                     │
│     → 52 questions classées             │
│     → Réponses courtes + liens          │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  3. Manuels (user-manual/fr/XX.md)      │
│     → Pas à pas détaillés               │
│     → Captures écran annotées           │
│     → Troubleshooting                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  4. Vidéos (videos/XX-script-fr.md)     │
│     → Démonstrations visuelles          │
│     → 3-5 minutes chacune               │
└─────────────────────────────────────────┘
```

**Règle d'or:** Toujours diriger vers niveau approprié selon complexité.

---

## 🔍 Recherche rapide

### Utiliser search-index.json

**Fichier:** `onboarding/search-index.json`

**Recherche par mots-clés:**
```javascript
// Exemples requêtes fréquentes
"signature" → FAQ Q31-36 + Manuel 03
"VIN" → FAQ Q10 + Manuel 01
"taxes" → FAQ Q12
"réclamation" → FAQ Q21-30 + Manuel 02 + Vidéo 02
"crédit" → FAQ Q42-45
"photos" → FAQ Q22
```

**Catégories principales:**
- `compte` - Connexion, mot de passe, rôles
- `garanties` - Création, modification, VIN
- `reclamations` - Soumission, statuts, délais
- `signature` - Légalité, méthodes, preuve
- `paiements` - Facturation Pro-Remorque
- `fidelite` - Programme crédit $2000
- `support` - Contact, formation, escalade

---

### Raccourcis questions ultra-fréquentes

**Top 10 questions support (80% tickets):**

| # | Question | Réponse rapide | Doc |
|---|----------|----------------|-----|
| 1 | Mot de passe oublié | Page login → "Oublié?" → Email reset | FAQ Q2 |
| 2 | Créer garantie | Menu Garanties → + Nouvelle → Remplir → Générer | Manuel 01 |
| 3 | VIN invalide | 17 caractères, pas I/O/Q, pas espaces | FAQ Q10 |
| 4 | Taxes incorrectes | Vérifier province client = calcul auto | FAQ Q12 |
| 5 | Signature ne marche pas | Chrome/Firefox récent, désactiver bloqueurs | Manuel 03 + FAQ Q35 |
| 6 | Combien de photos? | Min 3, max 10, JPG/PNG, max 10 MB chacune | FAQ Q22 |
| 7 | Délai réclamation | 3-5 jours en moyenne, jusqu'à 10 si complexe | FAQ Q24 |
| 8 | Crédit fidélité | $2000 tous les 10 garanties, jamais expire | FAQ Q42-43 |
| 9 | Exporter données | Menu Garanties/Réclamations → Exporter CSV | FAQ Q52 |
| 10 | Contacter vraie personne | 1-800-XXX-XXXX ou support@proremorque.com | FAQ Q46 |

**Bookmark cette table!**

---

## 💬 Scripts réponse support

### Template email standard

```
Objet: Re: [Sujet original]

Bonjour [Nom],

Merci de nous avoir contactés.

[RÉPONSE COURTE EN 1-2 PHRASES]

Pour plus de détails, consultez notre guide:
🔗 [Titre guide] - [URL]

[SI VIDÉO DISPONIBLE:]
🎥 Vous préférez la vidéo? [Titre vidéo] - [URL]

[SI NÉCESSITE ACTIONS:]
Voici les étapes:
1. [Étape 1]
2. [Étape 2]
3. [Étape 3]

Si le problème persiste après avoir suivi ces étapes, répondez à cet email avec:
- Capture d'écran du problème
- Message d'erreur exact (si applicable)
- Numéro de garantie/réclamation concernée

Nous serons heureux de vous aider davantage.

Cordialement,
[Votre nom]
Équipe Support Pro-Remorque

📞 1-800-XXX-XXXX
📧 support@proremorque.com
```

---

### Réponses pré-écrites par type

**TYPE 1: Question basique (dans FAQ)**

```
Bonjour [Nom],

[Réponse courte 1-2 phrases de FAQ]

Guide complet ici: [Lien FAQ Q#]

Bonne journée!
[Nom]
```

**Temps:** < 2 min

---

**TYPE 2: Procédure étapes (dans manuel)**

```
Bonjour [Nom],

Pour [action demandée], suivez ces étapes:

1. [Étape courte]
2. [Étape courte]
3. [Étape courte]

Guide détaillé avec captures: [Lien manuel]
Vidéo démo: [Lien vidéo si applicable]

N'hésitez pas si vous bloquez sur une étape.

[Nom]
```

**Temps:** < 3 min

---

**TYPE 3: Problème technique (diagnostic requis)**

```
Bonjour [Nom],

Je comprends votre problème avec [X].

Pour vous aider efficacement, j'aurais besoin de:
- [ ] Capture d'écran du problème
- [ ] Message d'erreur exact
- [ ] Navigateur utilisé (Chrome, Firefox, Safari?)
- [ ] Numéro de garantie/réclamation concernée

Envoyez-moi ces infos et je vous reviendrai dans l'heure.

Merci,
[Nom]
```

**Temps:** < 2 min + attente infos

---

**TYPE 4: Escalade technique (pas dans docs)**

```
Bonjour [Nom],

Merci d'avoir fourni ces détails.

Votre situation nécessite expertise technique. Je transfère votre dossier à notre équipe dev avec priorité haute.

Ticket #TECH-[ID] créé.

Réponse attendue: < 4h ouvrables.
Je vous tiens informé dès que j'ai des nouvelles.

[Nom]
```

**Action:** Créer ticket Jira/Linear avec tag "escalated", assigner dev team.

---

## 🚨 Escalade - Quand et comment

### Critères escalade technique

**Escalader SI:**
- [ ] Problème non couvert par docs
- [ ] Bug évident (comportement ≠ attendu)
- [ ] Erreur serveur (500, timeout)
- [ ] Données perdues/corrompues
- [ ] Sécurité compromise
- [ ] Fonctionnalité complètement bloquée

**NE PAS escalader SI:**
- [ ] Utilisateur n'a pas lu docs
- [ ] Question déjà dans FAQ
- [ ] User error (ex: VIN mal saisi)
- [ ] Demande feature (→ feedback@proremorque.com)

---

### Processus escalade

**Étape 1: Diagnostic initial (vous)**
1. Reproduire problème si possible
2. Vérifier console navigateur (F12)
3. Tester sur environnement staging
4. Consulter logs erreurs (si accès)

**Étape 2: Documentation escalade**
```
Ticket #SUPPORT-[ID] → #TECH-[ID]

RÉSUMÉ: [1 phrase problème]

IMPACT:
- Utilisateurs affectés: [1 / Quelques-uns / Beaucoup]
- Sévérité: [Bloquant / Majeur / Mineur]
- Workaround disponible: [Oui/Non]

REPRO STEPS:
1. [Étape]
2. [Étape]
3. [Problème se produit]

ENVIRONNEMENT:
- Navigateur: [Chrome 118, Firefox 120, etc.]
- OS: [Windows 11, macOS 14, etc.]
- User: [Email user], Org: [Nom org], Rôle: [Dealer/Admin/etc.]

LOGS / ERREURS:
```
[Copier-coller erreur console]
```

TENTATIVES RÉSOLUTION:
- [X] Refresh / clear cache → Pas résolu
- [X] Autre navigateur → [Même problème / Fonctionne]
- [X] Mode incognito → [Même problème / Fonctionne]

URGENCE: [Critique / Haute / Normale / Basse]
```

**Étape 3: Notification**
- Slack: #support-escalation
- Email: tech@proremorque.com
- Mention @on-call si critique (perte données, sécurité)

**Étape 4: Suivi client**
- Confirmer escalade au client
- SLA: 4h ouvrables (critique), 24h (haute), 3 jours (normale)
- Mettre à jour ticket régulièrement

---

## 📖 Guides par scénario courant

### Scénario 1: "Je n'arrive pas à créer ma garantie"

**Diagnostic rapide:**

**Q:** Erreur à quelle étape?
- A: "Formulaire" → Champs obligatoires (*) manquants
- B: "VIN invalide" → FAQ Q10 + Q16
- C: "PDF ne génère pas" → Manuel 01, section Erreurs
- D: "Autre" → Demander capture + message erreur

**Réponse type:**
```
La plupart des problèmes de création viennent de:

1. ✅ Champs obligatoires (*) - Vérifiez tous remplis
2. ✅ VIN - Exactement 17 caractères, pas I/O/Q
3. ✅ Email unique - Si déjà utilisé, recherchez client existant

Guide complet: [Manuel 01]
Questions fréquentes: [FAQ Q9-Q20]

Suivez le guide et ça devrait fonctionner. Sinon, envoyez-moi capture d'écran.
```

---

### Scénario 2: "La signature ne fonctionne pas"

**Diagnostic rapide:**

**Q:** Signature en personne ou à distance?
- A: "En personne" → Appareil tactile? Navigateur récent?
- B: "À distance" → Client a reçu email? Vérifié spam?

**Q:** Quel est le problème exact?
- A: "Ne peut pas tracer" → Problème appareil/navigateur
- B: "Ne s'enregistre pas" → Cliquez-vous "Valider"?
- C: "Lien expiré" → Normal après 30 jours, renvoyer lien
- D: "PDF pas signé" → Téléchargez "PDF signé" pas "PDF original"

**Réponse type:**
```
Pour signature EN PERSONNE:
- Utilisez Chrome/Firefox récent
- Appareil tactile ou trackpad
- Tracez signature + cliquez "Valider" ✓

Pour signature À DISTANCE:
- Client vérifie spam si email pas reçu
- Lien valide 30 jours (renvoyer si expiré)
- Fonctionne sur tout appareil moderne

Guide signature: [Manuel 03]
Vidéo démo: [Vidéo 03]

99% problèmes = navigateur obsolète ou popup bloquée.
```

---

### Scénario 3: "Réclamation bloquée en révision depuis 10 jours"

**Diagnostic:**

**Q:** Statut exact?
- "En révision" depuis >7 jours → Anormal, escalader
- "Info requise" → Client a fourni infos demandées?

**Actions:**
1. Vérifier timeline réclamation
2. Chercher commentaires internes
3. Si aucun mouvement 7+ jours: escalader à claim team

**Réponse type:**
```
Délai normal: 3-5 jours. Au-delà 7 jours = anormal.

Je vérifie votre dossier #CLAIM-[ID] et reviens vers vous dans l'heure.

[Après vérification:]

J'ai contacté l'équipe réclamations. Votre dossier nécessitait [consultation fabricant / expertise externe / etc.].

Décision attendue: [Date précise].

Je vous tiens informé dès réception.
```

**Escalade:** Slack #claims-team, mention claim manager.

---

## 🎓 Formation continue support

### Onboarding agent support (Jour 1)

**Checklist 4 heures:**
- [ ] Lire quickstart.md (30 min)
- [ ] Lire FAQ Q1-25 (1h)
- [ ] Visionner 3 vidéos (15 min)
- [ ] Suivre scénario acceptance 1 (15 min)
- [ ] Créer 5 garanties test (1h)
- [ ] Créer 2 réclamations test (30 min)
- [ ] Lire ce knowledge-base.md (30 min)

**Validation:** Répondre à 10 tickets factices, superviseur révise.

---

### Veille hebdomadaire (30 min/semaine)

**Lundi matin:**
- Lire release notes semaine précédente
- Nouveaux ajouts FAQ/manuels
- Top 5 tickets complexes semaine dernière
- Feedback clients relevé

**Mise à jour compétences:**
- Tester nouvelles features en staging
- Mettre à jour scripts réponses
- Ajouter FAQs si questions récurrentes

---

### Metrics personnelles

**Trackez (dashboard interne):**
- Temps moyen résolution ticket
- % tickets résolus premier contact
- % escalades (objectif <10%)
- Score satisfaction client (CSAT)
- Requêtes docs consultées

**Objectifs équipe:**
- Temps résolution: <30 min (simple), <2h (complexe)
- Premier contact: >70%
- CSAT: >4.5/5

---

## 🛠️ Outils support

### Accès requis

- [ ] **Pro-Remorque Admin** - Voir toutes garanties/réclamations
- [ ] **Staging** - Reproduire problèmes
- [ ] **Docs** - Tous fichiers onboarding/
- [ ] **Search** - Accès search-index.json
- [ ] **Ticketing** - Zendesk/Intercom/Freshdesk
- [ ] **Slack** - Channels #support, #support-escalation
- [ ] **Logs** - Sentry/Datadog (optionnel)

---

### Ressources favoris (bookmarks)

**Dans navigateur:**
```
📁 Pro-Remorque Support/
  📄 FAQ - [URL]
  📄 Manuel Garanties - [URL]
  📄 Manuel Réclamations - [URL]
  📄 Manuel Signatures - [URL]
  🎥 Vidéos - [URL dossier]
  🔍 Search - [URL search tool]
  📋 Templates emails - [URL]
  🚨 Escalade - [Lien formulaire]
```

---

## ✅ Checklist ticket résolu

Avant fermeture ticket:

- [ ] Question répondue complètement
- [ ] Lien documentation fourni (self-service futur)
- [ ] Client confirme résolution (ou 48h sans réponse)
- [ ] Ticket taggé correctement (catégorie, priorité)
- [ ] Si bug: créé ticket tech et lié
- [ ] Si nouvelle question: ajoutée backlog FAQ
- [ ] CSAT survey envoyé automatiquement

---

## 📊 Reporting hebdomadaire

**Vendredi 16h - Rapport équipe:**

**Metrics:**
- Tickets créés: XXX
- Tickets résolus: XXX
- Temps moyen résolution: XX min
- % premier contact: XX%
- CSAT moyen: X.X/5

**Top 5 questions semaine:**
1. [Question] - [Fréquence] - [Doc existante?]
2. ...

**Bugs identifiés:**
- [Bug] - Ticket #TECH-XXX - Statut: [Open/Fixed]

**Docs à créer/mettre à jour:**
- [ ] FAQ QXX - [Sujet]
- [ ] Manuel section YY - [Mise à jour needed]

**Escalades:**
- [Résumé] - Résolu? [Oui/Non/En cours]

---

## 💡 Tips pro

1. **Lien > Explication longue**
   - Toujours fournir lien doc
   - Self-service > Dépendance support

2. **Capture = 1000 mots**
   - Demandez screenshots systématiquement
   - Annotez avec flèches/encadrés si vous renvoyez guide visuel

3. **Templates = vitesse**
   - 10 templates couvrent 80% tickets
   - Personnalisez nom client minimum

4. **Escalade rapide si bloqué**
   - Ne perdez pas 30 min sur ticket complexe
   - Escalade à 15 min si hors compétence

5. **Feedback = amélioration**
   - Notez patterns questions
   - Suggérez nouvelles FAQs
   - Améliorez process

---

## 📞 Contacts urgents

**Support Lead:** support-lead@proremorque.com
**Tech Lead:** tech-lead@proremorque.com
**Product Manager:** pm@proremorque.com
**On-call (urgence):** +1-XXX-XXX-XXXX (Slack /oncall)

**Escalade perte données:** IMMÉDIAT, ping @tech-lead + @cto

---

## 🎯 Success story

**Bon exemple de ticket bien géré:**

```
Ticket #12345 - Client: Marie L.
Objet: "Signature ne marche pas URGENT"

Temps total: 8 minutes

Actions:
1. (2 min) Lu description, identifié: lien expiré
2. (1 min) Répondu avec lien FAQ Q34 + comment renvoyer lien
3. (3 min) Client a renvoyé lien, signature complétée
4. (2 min) Confirmation résolution, fermé ticket

Résultat:
✅ Résolu premier contact
✅ Client autonome pour prochaine fois (lien doc)
✅ CSAT: 5/5 "Réponse rapide et claire!"

Pourquoi succès: Question identifiée vite, doc appropriée fournie, suivi immédiat.
```

**Votre objectif: 70%+ tickets ressemblent à ça!**

---

**Bon succès dans votre rôle support! 🚀**

*Questions sur ce knowledge base? → support-lead@proremorque.com*
