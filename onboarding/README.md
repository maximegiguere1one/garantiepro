# Pro-Remorque - Package d'onboarding complet

**Version:** 1.0.0
**Date:** 26 octobre 2025
**Propriétaire:** Équipe Formation Pro-Remorque

---

## 📦 Contenu du package

Ce package contient tout le matériel nécessaire pour former vos utilisateurs (opérateurs, dealers, support) et assurer une adoption réussie de Pro-Remorque.

### Structure des fichiers

```
onboarding/
├── README.md                          ← Ce fichier
├── fr/                                ← Contenu français
│   ├── quickstart.md                  ← Guide démarrage 1 page (FR)
│   └── faq.md                         ← 52 questions-réponses (FR)
├── en/                                ← Contenu anglais
│   ├── quickstart.md                  ← Guide démarrage 1 page (EN)
│   └── faq.md                         ← 52 Q&A (EN) [à créer]
├── user-manual/                       ← Manuels détaillés
│   ├── fr/
│   │   ├── 01-creer-garantie.md       ← Créer garantie (15 KB)
│   │   ├── 02-traiter-reclamation.md  ← Traiter réclamation (18 KB)
│   │   └── 03-signature-electronique.md ← Signature (16 KB)
│   └── en/
│       └── 01-create-warranty.md      ← Create warranty (EN)
├── videos/                            ← Scripts vidéos + SRT
│   ├── 01-admin-tour-script-fr.md    ← Tour admin (3:30)
│   ├── 02-process-claim-script-fr.md ← Traiter réclamation (4:45)
│   └── 03-sign-download-contract-script-fr.md ← Signature (5:00)
├── in-app-guides.json                 ← Tours guidés (20+ étapes)
├── search-index.json                  ← Index recherche interne
├── checklists/                        ← Checklists progression
│   ├── day-1-operator.md              ← Jour 1 (4h)
│   ├── week-1-operator.md             ← Semaine 1 [à créer]
│   └── week-4-operator.md             ← Semaine 4 [à créer]
├── acceptance/                        ← Scénarios validation
│   ├── scenario-1-warranty-creation.md ← Test garantie
│   ├── scenario-2-claim-process.md    ← Test réclamation [à créer]
│   └── scenario-3-export-data.md      ← Test export [à créer]
├── support-templates/                 ← Templates emails
│   ├── welcome-email-fr.md            ← Email bienvenue [à créer]
│   ├── reminder-email-fr.md           ← Email rappel [à créer]
│   └── escalation-email-fr.md         ← Email escalade [à créer]
├── knowledge-base.md                  ← Guide équipe support
└── tests/                             ← Résultats tests utilisateurs
    └── user-test-results.md           ← Compilation résultats [à créer]
```

---

## 🚀 Déploiement rapide (15 minutes)

### Étape 1: Stocker les fichiers (5 min)

**Option A: Hébergement web statique (Recommandé)**
```bash
# Uploadez dossier onboarding/ sur votre serveur
# Exemple structure URL:
https://votre-domaine.com/docs/onboarding/fr/quickstart.md
https://votre-domaine.com/docs/onboarding/videos/01-admin-tour-fr.mp4
```

**Option B: CMS (Notion, Confluence, SharePoint)**
- Importez fichiers .md dans votre CMS
- Respectez structure dossiers
- Créez navigation/liens internes

**Option C: Google Drive / Dropbox**
- Uploadez dossier complet
- Partagez lien avec permissions lecture
- Ajoutez raccourci dans dashboard Pro-Remorque

---

### Étape 2: Intégrer tours guidés (5 min)

**Fichier:** `in-app-guides.json`

**Intégration avec librairie tours:**
- [Shepherd.js](https://shepherdjs.dev/) (Recommandé)
- [Intro.js](https://introjs.com/)
- [Driver.js](https://driverjs.com/)

**Exemple avec Shepherd.js:**
```javascript
import Shepherd from 'shepherd.js';
import toursConfig from './onboarding/in-app-guides.json';

// Initialiser tour first-login
const tour = new Shepherd.Tour({
  defaultStepOptions: {
    classes: 'proremorque-tour',
    scrollTo: true
  }
});

// Charger steps depuis JSON
toursConfig.tours[0].steps.forEach(step => {
  tour.addStep({
    id: step.id,
    text: step.content.fr, // ou .en selon langue
    attachTo: {
      element: step.target,
      on: step.placement
    },
    buttons: [
      { text: 'Suivant', action: tour.next },
      { text: 'Passer', action: tour.cancel }
    ]
  });
});

// Démarrer si first_login
if (user.isFirstLogin) {
  tour.start();
}
```

---

### Étape 3: Configurer recherche (5 min)

**Fichier:** `search-index.json`

**Option A: Client-side (JS simple)**
```javascript
import searchIndex from './onboarding/search-index.json';

function searchDocs(query) {
  const results = searchIndex.index.filter(item => {
    const keywords = item.keywords_fr.join(' ').toLowerCase();
    const question = item.question_fr.toLowerCase();
    return keywords.includes(query.toLowerCase()) ||
           question.includes(query.toLowerCase());
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

// Utilisation
const results = searchDocs('signature');
// Afficher results avec liens vers documents
```

**Option B: Backend (Algolia, Elasticsearch)**
- Importez `search-index.json` dans votre moteur
- Configurez facettes par catégories
- Ajoutez barre recherche dans dashboard

**Option C: Simple ` Ctrl+F` browser**
- Compilez tous .md en 1 seule page HTML
- Utilisez recherche navigateur native

---

## 📚 Utilisation par rôle

### Pour les nouveaux dealers/opérateurs

**Jour 1 (4 heures):**
1. Lire `fr/quickstart.md` (30 min)
2. Suivre tour guidé in-app (10 min)
3. Compléter `checklists/day-1-operator.md` (3h)
4. Soumettre preuves à superviseur

**Semaine 1:**
- Lire manuels `user-manual/fr/01-03`
- Visionner 3 vidéos
- Créer garanties clients réels
- Compléter checklist Semaine 1

**Semaine 4:**
- Maîtriser fonctions avancées
- Optimiser workflow
- Devenir autonome
- Compléter checklist Semaine 4

---

### Pour l'équipe support

**Ressources clés:**
1. **FAQ complète:** `fr/faq.md` - 52 Q&R
2. **Knowledge base:** `knowledge-base.md` - Guide support
3. **Manuels:** Référence rapide pour dépannage
4. **Search index:** Trouver réponses rapidement

**Workflow support:**
1. Client contacte avec question
2. Recherche dans `search-index.json`
3. Consulte FAQ ou manuel
4. Fournit réponse + lien documentation
5. Si non résolu: escalade technique

---

### Pour les admins/formateurs

**Formation groupe (2h):**
1. Présenter dashboard (vidéo 01, 3:30 min)
2. Démo garantie live (vidéo 03, 5 min)
3. Démo réclamation (vidéo 02, 4:45 min)
4. Q&R FAQ (30 min)
5. Pratique guidée (1h)

**Matériel requis:**
- Projecteur/écran partagé
- Accès staging pour chaque participant
- Données test fournies dans scénarios acceptance
- Copies imprimées quickstart (optionnel)

---

## ✅ Validation onboarding

### Tests d'acceptance (obligatoire)

**3 scénarios à exécuter en staging:**

1. **Scénario 1:** Créer + Signer + Télécharger garantie
   - Fichier: `acceptance/scenario-1-warranty-creation.md`
   - Durée: 15 min
   - Succès: 6/6 critères

2. **Scénario 2:** Soumettre et suivre réclamation [À créer]
   - Durée: 15 min
   - Succès: 5/5 critères

3. **Scénario 3:** Exporter données CSV [À créer]
   - Durée: 5 min
   - Succès: 3/3 critères

**Envoi preuves:**
- Email: validation@proremorque.com
- Captures + rapports
- Délai validation: 24-48h

---

### Tests utilisateurs (recommandé)

**Objectif:** 5 utilisateurs réels testent onboarding

**Processus:**
1. Recrutez 5 nouveaux dealers/opérateurs
2. Fournissez accès staging + package onboarding
3. Demandez complétion 3 scénarios acceptance
4. Collectez feedback (questionnaire fourni)
5. Compilez résultats dans `tests/user-test-results.md`

**Métrique succès:**
- ✅ 80% complètent Jour 1 < 5h
- ✅ 90% créent garantie autonome après formation
- ✅ Satisfaction moyenne ≥ 4/5

---

## 🎥 Production des vidéos

**Fichiers scripts fournis:**
- `videos/01-admin-tour-script-fr.md`
- `videos/02-process-claim-script-fr.md`
- `videos/03-sign-download-contract-script-fr.md`

**Livrables attendus (par vidéo):**
1. `XX-nom-fr.mp4` (vidéo française, 1920×1080, H.264)
2. `XX-nom-fr.srt` (sous-titres français)
3. `XX-nom-en.srt` (sous-titres anglais)

**Outils recommandés:**
- **Enregistrement:** OBS Studio (gratuit), Camtasia, ScreenFlow
- **Montage:** DaVinci Resolve (gratuit), Adobe Premiere
- **Sous-titres:** YouTube auto-captions → export SRT, ou Rev.com

**Hébergement vidéos:**
- **Option A:** YouTube (privé/non-listé)
- **Option B:** Vimeo Business
- **Option C:** CDN propre (Cloudflare Stream, AWS S3)

**Liens dans documentation:**
Remplacez `onboarding/videos/XX-nom-fr.mp4` par URL réelle:
```markdown
🎥 [Voir la vidéo](https://votre-cdn.com/videos/01-admin-tour-fr.mp4)
```

---

## 📧 Templates emails support

**À créer (non inclus dans MVP):**

**Template bienvenue:**
- Sujet: "Bienvenue sur Pro-Remorque - Commencez ici"
- Contenu: Lien quickstart, identifiants, premier login
- Fichier: `support-templates/welcome-email-fr.md`

**Template rappel formation:**
- Sujet: "Rappel: Compléter votre formation Pro-Remorque"
- Contenu: Progression actuelle, prochaines étapes
- Fichier: `support-templates/reminder-email-fr.md`

**Template escalade:**
- Sujet: "Ticket #XXX nécessite escalade"
- Contenu: Résumé problème, tentatives résolution
- Fichier: `support-templates/escalation-email-fr.md`

---

## 🔄 Maintenance du contenu

### Responsabilités

| Contenu | Responsable | Fréquence mise à jour |
|---------|-------------|----------------------|
| FAQ | Support Team | Mensuelle (nouvelles Q) |
| Manuels | Product Team | À chaque release majeure |
| Vidéos | Marketing | Tous les 6 mois |
| Tours guidés JSON | Dev Team | À chaque nouveau feature |
| Search index | Support + Dev | Mensuelle |
| Checklists | Formation Team | Trimestrielle |

### Processus de mise à jour

**Quand mettre à jour:**
- Nouvelle fonctionnalité lancée
- UI/UX change significatif
- Top 10 questions support changent
- Feedback utilisateurs récurrent

**Comment mettre à jour:**
1. Éditer fichier .md concerné
2. Modifier header "Dernière mise à jour"
3. Ajouter note changelog en haut (si majeur)
4. Re-générer search-index.json si applicable
5. Notifier utilisateurs actifs (email release notes)

**Versioning:**
```markdown
# Manuel: Créer une garantie

**Version:** 1.1.0 (2025-11-15)
**Dernière mise à jour:** 15 novembre 2025
**Changements:** Ajout section crédit fidélité, nouvelles captures écran
```

---

## 📊 Métriques d'adoption

**Trackez ces indicateurs dans Pro-Remorque:**

### Progression onboarding
- % utilisateurs complétant tour guidé
- % complétant checklist Jour 1 < 5h
- % créant première garantie < 7 jours

### Utilisation documentation
- Pages FAQ les plus visitées
- Requêtes recherche les plus fréquentes
- Vidéos les plus regardées (YouTube Analytics)

### Support
- % tickets résolus via self-service (FAQ/manuels)
- Temps moyen résolution ticket
- Questions non couvertes par FAQ (gaps)

**Dashboard Analytics (à créer):**
```javascript
// Événements à tracker
analytics.track('onboarding.tour.completed', { tour_id: 'first-login' });
analytics.track('onboarding.manual.viewed', { manual: '01-creer-garantie' });
analytics.track('onboarding.video.watched', { video: '01-admin-tour', completion: 100 });
analytics.track('onboarding.checklist.completed', { checklist: 'day-1' });
```

---

## 🆘 Support & Questions

### Support technique
- **Email:** support@proremorque.com
- **Téléphone:** 1-800-XXX-XXXX (Lun-Ven 9h-17h EST)
- **Délai réponse:** < 4h ouvrables

### Formation
- **Email:** training@proremorque.com
- **Webinaires:** Hebdomadaires, inscription requise
- **Formation privée:** 199$ (2h one-on-one)
- **Formation sur site:** 999$ (journée complète)

### Feedback & Suggestions
- **Email:** feedback@proremorque.com
- **Roadmap publique:** roadmap.proremorque.com
- **Top suggestions:** Implémentées en priorité

---

## 📦 Checklist déploiement

**Avant lancement production:**

- [ ] **Fichiers uploadés**
  - [ ] Tous .md dans CMS ou serveur
  - [ ] Videos encodées et hébergées
  - [ ] SRT sous-titres disponibles

- [ ] **Intégrations techniques**
  - [ ] Tours guidés JSON intégrés (Shepherd.js ou autre)
  - [ ] Search index fonctionnel
  - [ ] Analytics events configurés

- [ ] **Tests validation**
  - [ ] 3 scénarios acceptance exécutés en staging
  - [ ] 5 utilisateurs test complétés (optionnel)
  - [ ] Feedback incorporé

- [ ] **Communication**
  - [ ] Email bienvenue préparé
  - [ ] Release notes rédigées
  - [ ] Support team formé sur nouveau contenu

- [ ] **Accès**
  - [ ] Liens dans dashboard Pro-Remorque
  - [ ] Bookmarks dans navigation
  - [ ] Mention dans email confirmation compte

---

## 🎯 KPIs de succès

**Objectifs 30 jours post-déploiement:**

| Métrique | Cible | Mesure |
|----------|-------|--------|
| Adoption tour guidé | 80% | % nouveaux users complétant tour |
| Temps onboarding | < 1 jour | Médiane création première garantie |
| Autonomie | 90% | % créant garantie sans support |
| Satisfaction | ≥ 4/5 | Note moyenne questionnaire |
| Réduction tickets | -30% | Tickets support liés onboarding |

**Revue mensuelle:** Analyser métriques, identifier gaps, mettre à jour contenu.

---

## 📄 Licence & Droits

**Contenu propriétaire Pro-Remorque Inc.**
- Usage interne uniquement
- Ne pas redistribuer externes
- Peut être adapté pour vos besoins
- Mentionner source si republication partielle

---

## 🙏 Crédits

**Équipe création:**
- Rédaction: Équipe Formation Pro-Remorque
- Révision: Équipe Support & Product
- Design: Équipe Marketing
- Validation: 5 dealers beta-testeurs

**Version:** 1.0.0
**Date:** 26 octobre 2025

---

**Questions sur ce package?**
→ Documentation: docs@proremorque.com
