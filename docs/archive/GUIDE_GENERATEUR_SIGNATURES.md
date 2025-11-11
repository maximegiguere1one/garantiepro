# Guide du Générateur de Signatures Numériques

## Vue d'ensemble

Le générateur de signatures numériques permet aux employés et administrateurs de créer, gérer et utiliser leurs signatures professionnelles personnelles dans l'application. Les signatures peuvent être générées automatiquement à partir de texte avec différents styles de polices, ou dessinées à la main.

## 🎯 Fonctionnalités Principales

### 1. Deux Modes de Création

#### **Mode Généré** (Text-to-Signature)
- Tapez votre nom et sélectionnez un style de police
- 6 styles prédéfinis disponibles:
  - **Élégant**: Style cursif raffiné et professionnel
  - **Moderne**: Style contemporain et épuré
  - **Classique**: Style traditionnel intemporel
  - **Artistique**: Style créatif et expressif
  - **Formel**: Style sobre et officiel
  - **Décontracté**: Style naturel et accessible
- Personnalisation de la couleur
- Génération instantanée avec aperçu en temps réel

#### **Mode Dessiné** (Drawing Pad)
- Surface de dessin interactive
- Utilise la bibliothèque `signature_pad` pour une expérience fluide
- Dessin à la souris ou au tactile
- Personnalisation de la couleur d'encre
- Fonction d'effacement pour recommencer

### 2. Gestion des Signatures

- **Multiple Signatures**: Créez plusieurs versions de votre signature
- **Signature Active**: Une seule signature peut être active à la fois
- **Historique Complet**: Visualisez toutes vos signatures créées
- **Métadonnées**: Chaque signature stocke le type, la date, le style utilisé
- **Téléchargement**: Exportez vos signatures en format PNG

### 3. Système d'Approbation (Admin)

- Les administrateurs peuvent approuver les signatures
- Statut d'approbation visible sur chaque signature
- Traçabilité: qui a approuvé et quand
- Politique d'approbation configurable par organisation

## 📂 Structure des Fichiers

### Base de Données (Supabase)

**Migration**: `supabase/migrations/20251014235000_create_employee_signatures_system.sql`

Deux tables principales:

1. **`employee_signatures`**
   - Stocke toutes les signatures des employés
   - Champs: user_id, organization_id, full_name, signature_type, signature_data, style_name, is_active, is_approved, metadata
   - RLS activé pour sécurité multi-tenant

2. **`signature_styles`**
   - Bibliothèque des styles disponibles
   - Champs: style_name, display_name, font_family, description, css_properties, is_active
   - 6 styles pré-configurés

### Code Frontend

**Composants**:
- `src/components/settings/SignatureGenerator.tsx` - Composant principal du générateur
- `src/components/settings/UserSignatureWidget.tsx` - Widget pour afficher la signature active

**Utilitaires**:
- `src/lib/signature-generator-utils.ts` - Fonctions de génération, stockage et gestion

**Types**:
- `src/lib/database.types.ts` - Types TypeScript mis à jour avec les tables signatures

## 🔧 Utilisation

### Pour les Utilisateurs

1. **Accéder au Générateur**
   - Allez dans Paramètres > Signatures
   - Onglet "Signatures" dans le menu latéral

2. **Créer une Signature Générée**
   ```
   1. Sélectionnez "Générée"
   2. Entrez votre nom complet
   3. Choisissez un style de police
   4. (Optionnel) Changez la couleur
   5. Cliquez sur "Aperçu"
   6. Cliquez sur "Enregistrer"
   ```

3. **Créer une Signature Dessinée**
   ```
   1. Sélectionnez "Dessinée"
   2. Entrez votre nom complet
   3. (Optionnel) Changez la couleur
   4. Dessinez votre signature sur le pad
   5. Cliquez sur "Enregistrer"
   ```

4. **Gérer vos Signatures**
   - Visualisez toutes vos signatures dans le panneau de droite
   - Activez une signature en cliquant sur l'icône ✓
   - Téléchargez une signature avec l'icône ⬇
   - Supprimez une signature avec l'icône 🗑

### Pour les Administrateurs

**Approbation des Signatures**:
Les admins peuvent approuver les signatures via l'interface. La fonction `approveSignature()` est disponible dans les utilitaires.

**Gestion des Styles**:
Les super_admin peuvent ajouter/modifier/désactiver des styles dans la table `signature_styles`.

## 🔐 Sécurité (RLS)

### Politiques employee_signatures

1. **Lecture**:
   - Utilisateurs voient leurs propres signatures
   - Admins voient toutes les signatures de leur organisation

2. **Création**:
   - Tout utilisateur authentifié peut créer sa signature

3. **Mise à jour**:
   - Utilisateurs peuvent modifier leurs signatures
   - Admins peuvent approuver les signatures

4. **Suppression**:
   - Utilisateurs peuvent supprimer leurs propres signatures

### Politiques signature_styles

1. **Lecture**: Tous les utilisateurs authentifiés
2. **Gestion**: Seuls les super_admin

## 🎨 Personnalisation

### Ajouter un Nouveau Style

```sql
INSERT INTO signature_styles (
  style_name,
  display_name,
  font_family,
  description,
  css_properties,
  display_order,
  is_active
) VALUES (
  'mon_style',
  'Mon Style Personnalisé',
  '''Ma Police'', cursive',
  'Description du style',
  '{"fontSize": "30px", "fontWeight": "normal", "fontStyle": "italic", "letterSpacing": "1px"}'::jsonb,
  7,
  true
);
```

### Modifier les Propriétés CSS d'un Style

Les `css_properties` supportent:
- `fontSize`: Taille de la police (ex: "32px")
- `fontWeight`: Épaisseur (ex: "normal", "bold", "600")
- `fontStyle`: Style (ex: "normal", "italic")
- `letterSpacing`: Espacement des lettres (ex: "1px", "0px")
- `textDecoration`: Décoration du texte
- `transform`: Transformations CSS

## 📊 Données Stockées

### Format signature_data

**Signatures Générées**:
- Format: Data URL base64 PNG
- Exemple: `data:image/png;base64,iVBORw0KGgoAAAANS...`

**Signatures Dessinées**:
- Format: Data URL base64 PNG du canvas
- Exemple: `data:image/png;base64,iVBORw0KGgoAAAANS...`

### Metadata JSON

Exemples de métadonnées stockées:
```json
{
  "color": "#000000",
  "created_with": "generated",
  "style_display_name": "Élégant",
  "canvas_width": 400,
  "canvas_height": 120
}
```

## 🔍 Débogage

### Vérifier les Signatures d'un Utilisateur

```sql
SELECT * FROM employee_signatures
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### Vérifier les Styles Actifs

```sql
SELECT * FROM signature_styles
WHERE is_active = true
ORDER BY display_order;
```

### Logs Console

Le composant et les utilitaires utilisent `console.log` et `console.error` pour le débogage:
- Erreurs de chargement
- Erreurs de sauvegarde
- Validation des noms

## 🚀 Améliorations Futures

### Suggestions d'Améliorations

1. **Export Multi-Format**
   - SVG pour qualité vectorielle
   - PDF pour documents officiels

2. **Signature sur Documents**
   - Intégration dans les PDFs de garanties
   - Signature automatique sur les contrats

3. **Templates Avancés**
   - Ajout d'icônes ou logos
   - Bordures et cadres décoratifs

4. **Historique de Versions**
   - Garder l'historique des modifications
   - Restauration de versions antérieures

5. **Aperçu sur Documents**
   - Prévisualisation sur vrais documents
   - Test de lisibilité et contraste

## 📝 Notes Techniques

### Dépendances Utilisées

- `signature_pad` (v5.1.1): Pour le dessin de signatures
- Canvas API: Pour la génération de signatures textuelles
- Supabase: Stockage et RLS

### Performance

- Les signatures sont stockées en base64 (augmente la taille de ~33%)
- Considérer l'optimisation pour grandes quantités (>1000 signatures/user)
- Cache possible côté client pour signatures actives

### Compatibilité

- Navigateurs modernes avec support Canvas
- Support tactile pour tablettes et smartphones
- Responsive design pour tous les écrans

## 🆘 Support

### Problèmes Courants

**"Nom invalide"**
- Le nom doit contenir au moins 2 caractères
- Seuls lettres, espaces, tirets et apostrophes acceptés
- Maximum 100 caractères

**"Veuillez dessiner votre signature"**
- Le pad de signature est vide
- Dessinez quelque chose avant de sauvegarder

**"Session invalide"**
- Reconnectez-vous à l'application
- Vérifiez votre profil dans les paramètres

### Contact

Pour toute question ou problème technique, contactez l'équipe de développement.

---

**Version**: 1.0.0
**Date**: Octobre 2025
**Auteur**: Équipe LocationProRemorque
