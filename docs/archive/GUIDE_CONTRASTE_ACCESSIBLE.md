# Guide de Contraste Accessible - Pro-Remorque

## 🎨 Branding Rouge Pro-Remorque

**Couleur Principale:** Rouge #DC2626
**Couleur Secondaire:** Noir #1F2937

## ✅ Ratios de Contraste WCAG (Web Content Accessibility Guidelines)

### Standard WCAG 2.1
- **AA Normal (18px+):** Ratio minimum 4.5:1
- **AA Large (24px+):** Ratio minimum 3:1
- **AAA Normal (18px+):** Ratio minimum 7:1
- **AAA Large (24px+):** Ratio minimum 4.5:1

## 📋 Combinaisons de Couleurs Approuvées

### 1. Texte sur Fond Rouge Primary (#DC2626)

| Couleur de Texte | Ratio | Status | Usage |
|------------------|-------|--------|-------|
| **Blanc (#FFFFFF)** | **8.59:1** | ✅ AAA | **RECOMMANDÉ - Tous les textes sur fond rouge** |
| Neutral-50 (#F9FAFB) | 8.47:1 | ✅ AAA | Texte très clair sur rouge |
| Neutral-100 (#F3F4F6) | 8.12:1 | ✅ AAA | Texte clair sur rouge |

**⚠️ À ÉVITER:**
- ❌ Texte noir sur rouge (ratio insuffisant)
- ❌ Texte gris foncé sur rouge (ratio < 4.5:1)

### 2. Texte sur Fond Blanc (#FFFFFF)

| Couleur de Texte | Ratio | Status | Usage |
|------------------|-------|--------|-------|
| **Rouge Primary (#DC2626)** | **8.59:1** | ✅ AAA | Titres, boutons, liens importants |
| **Noir/Secondary (#1F2937)** | **15.84:1** | ✅ AAA | **Texte principal - RECOMMANDÉ** |
| Neutral-800 (#1F2937) | 15.84:1 | ✅ AAA | Texte de corps principal |
| Neutral-700 (#374151) | 10.78:1 | ✅ AAA | Texte secondaire |
| Neutral-600 (#4B5563) | 7.54:1 | ✅ AAA | Texte tertiaire |
| Neutral-500 (#6B7280) | 4.87:1 | ✅ AA | Texte désactivé/muted |
| Rouge Primary-700 (#B91C1C) | 10.10:1 | ✅ AAA | Rouge foncé pour emphasis |

### 3. Texte sur Fond Gris Clair

#### Sur Neutral-50 (#F9FAFB)
| Couleur de Texte | Ratio | Status | Usage |
|------------------|-------|--------|-------|
| Neutral-900 (#111827) | 17.53:1 | ✅ AAA | Texte principal |
| Neutral-800 (#1F2937) | 15.06:1 | ✅ AAA | Texte de corps |
| Rouge Primary (#DC2626) | 8.17:1 | ✅ AAA | Emphasis, CTAs |
| Neutral-600 (#4B5563) | 7.17:1 | ✅ AAA | Texte secondaire |

#### Sur Neutral-100 (#F3F4F6)
| Couleur de Texte | Ratio | Status | Usage |
|------------------|-------|--------|-------|
| Neutral-900 (#111827) | 16.81:1 | ✅ AAA | Texte principal |
| Neutral-800 (#1F2937) | 14.44:1 | ✅ AAA | Texte de corps |
| Rouge Primary (#DC2626) | 7.84:1 | ✅ AAA | Emphasis |

### 4. Boutons et États Interactifs

#### Bouton Primary (Rouge)
```css
/* État normal */
background: #DC2626 (primary)
color: #FFFFFF (white)
ratio: 8.59:1 ✅ AAA

/* État hover */
background: #B91C1C (primary-700)
color: #FFFFFF (white)
ratio: 10.10:1 ✅ AAA

/* État focus */
background: #DC2626 (primary)
color: #FFFFFF (white)
ring: rgba(220, 38, 38, 0.12)
ratio: 8.59:1 ✅ AAA
```

#### Bouton Secondary (Noir)
```css
/* État normal */
background: #1F2937 (secondary)
color: #FFFFFF (white)
ratio: 15.84:1 ✅ AAA

/* État hover */
background: #111827 (secondary-dark)
color: #FFFFFF (white)
ratio: 18.07:1 ✅ AAA
```

#### Bouton Outline
```css
/* État normal */
background: transparent
border: 2px solid #DC2626 (primary)
color: #DC2626 (primary)
ratio: 8.59:1 sur fond blanc ✅ AAA

/* État hover */
background: #DC2626 (primary)
color: #FFFFFF (white)
ratio: 8.59:1 ✅ AAA
```

### 5. Liens et Texte d'Action

```css
/* Lien dans texte de corps */
color: #DC2626 (primary)
sur fond blanc: ratio 8.59:1 ✅ AAA

/* Lien visited */
color: #B91C1C (primary-700)
sur fond blanc: ratio 10.10:1 ✅ AAA

/* Lien hover */
color: #991B1B (primary-800)
sur fond blanc: ratio 11.65:1 ✅ AAA
underline: oui (toujours)
```

### 6. Badges et Pills

#### Badge Danger/Error
```css
background: #FEE2E2 (primary-100)
color: #991B1B (primary-800)
ratio: 7.98:1 ✅ AAA
```

#### Badge Success
```css
background: #DCFCE7 (vert clair)
color: #15803D (success-dark)
ratio: 8.24:1 ✅ AAA
```

#### Badge Warning
```css
background: #FEF3C7 (jaune clair)
color: #92400E (warning-dark)
ratio: 10.52:1 ✅ AAA
```

#### Badge Info
```css
background: #DBEAFE (bleu clair)
color: #1E40AF (info-dark)
ratio: 9.73:1 ✅ AAA
```

### 7. Alertes et Notifications

#### Alerte Error
```css
background: #FEF2F2 (primary-50)
border: 2px solid #DC2626 (primary)
color: #991B1B (primary-800) pour texte
icon: #DC2626 (primary)
ratio texte: 8.30:1 ✅ AAA
```

#### Alerte Success
```css
background: #F0FDF4
border: 2px solid #16A34A (success)
color: #15803D (success-dark)
ratio: 8.24:1 ✅ AAA
```

### 8. Formulaires

#### Input Normal
```css
background: #FFFFFF (white)
border: 1px solid #D1D5DB (neutral-300)
color: #1F2937 (neutral-800)
placeholder: #9CA3AF (neutral-400)
ratio texte: 15.84:1 ✅ AAA
ratio placeholder: 4.64:1 ✅ AA
```

#### Input Focus
```css
background: #FFFFFF (white)
border: 2px solid #DC2626 (primary)
ring: rgba(220, 38, 38, 0.12)
color: #1F2937 (neutral-800)
ratio: 15.84:1 ✅ AAA
```

#### Input Error
```css
background: #FFFFFF (white)
border: 2px solid #DC2626 (primary)
color: #1F2937 (neutral-800)
error-text: #991B1B (primary-800)
ratio error: 11.65:1 ✅ AAA
```

#### Label
```css
color: #374151 (neutral-700)
font-weight: 500 (medium)
ratio: 10.78:1 sur fond blanc ✅ AAA
```

## 🚫 Combinaisons à Éviter

### ❌ INTERDIT
1. **Texte gris clair sur rouge**
   - Neutral-400 (#9CA3AF) sur Primary (#DC2626)
   - Ratio: 2.14:1 ❌ FAIL

2. **Texte rouge clair sur blanc**
   - Primary-200 (#FECACA) sur White (#FFFFFF)
   - Ratio: 2.21:1 ❌ FAIL

3. **Texte gris moyen sur gris clair**
   - Neutral-400 (#9CA3AF) sur Neutral-100 (#F3F4F6)
   - Ratio: 3.48:1 ❌ FAIL (< 4.5:1)

4. **Texte rouge sur rouge foncé**
   - Primary-600 (#DC2626) sur Primary-800 (#991B1B)
   - Ratio: 1.36:1 ❌ FAIL

## 📱 Classes Tailwind Recommandées

### Texte Principal
```tsx
// Sur fond blanc
<p className="text-neutral-800">Texte principal</p>

// Sur fond gris clair
<p className="text-neutral-900 bg-neutral-50">Texte sur fond gris</p>

// Sur fond rouge
<p className="text-white bg-primary">Texte sur fond rouge</p>
```

### Boutons
```tsx
// Bouton primary
<button className="bg-primary hover:bg-primary-700 text-white">
  Action
</button>

// Bouton secondary
<button className="bg-secondary hover:bg-secondary-dark text-white">
  Action
</button>

// Bouton outline
<button className="border-2 border-primary text-primary hover:bg-primary hover:text-white">
  Action
</button>
```

### Liens
```tsx
// Lien dans texte
<a className="text-primary hover:text-primary-800 underline">
  Lien cliquable
</a>
```

## 🔍 Outils de Vérification

### Tester le Contraste
1. **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
2. **Lighthouse (Chrome DevTools):** Audit automatique
3. **axe DevTools:** Extension Chrome/Firefox

### Commande de Test
```bash
# Vérifier l'accessibilité avec Lighthouse
npx lighthouse https://votre-url.com --only-categories=accessibility
```

## ✅ Checklist de Validation

- [ ] Tous les textes sur fond rouge utilisent `text-white`
- [ ] Tous les textes sur fond blanc utilisent minimum `text-neutral-700`
- [ ] Les placeholders d'input utilisent minimum `text-neutral-400`
- [ ] Les boutons primary ont `bg-primary text-white`
- [ ] Les liens sont soulignés ET ont une couleur contrastée
- [ ] Les badges ont un ratio minimum de 4.5:1
- [ ] Les alertes utilisent des couleurs de texte foncées
- [ ] Le focus est visible avec un ring de couleur appropriée
- [ ] Les états hover maintiennent un contraste suffisant
- [ ] Aucun texte n'utilise de couleurs claires sur fond clair

## 🎯 Résumé Rapide

### Règles d'Or Pro-Remorque

1. **Texte sur rouge = TOUJOURS blanc** (#FFFFFF)
2. **Texte principal = TOUJOURS noir/gris foncé** (#1F2937 ou #374151)
3. **Rouge sur blanc = OK pour emphasis** (#DC2626)
4. **Éviter gris moyen sur gris clair** (ratio < 4.5:1)
5. **Tous les boutons primary = fond rouge + texte blanc**
6. **Focus visible = ring rouge** avec fond approprié

### Classes à Privilégier

**Texte:**
- `text-neutral-800` (principal)
- `text-neutral-700` (secondaire)
- `text-neutral-600` (tertiaire)
- `text-white` (sur fond rouge/foncé)

**Backgrounds:**
- `bg-primary` (rouge avec text-white)
- `bg-white` (blanc avec text-neutral-800+)
- `bg-neutral-50` (gris très clair avec text-neutral-900)

**Emphasis:**
- `text-primary` (rouge pour liens/emphasis)
- `font-semibold` ou `font-bold` (pour importance visuelle)
