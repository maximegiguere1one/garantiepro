# Guide de Migration des Couleurs Brand

## Couleurs Officielles Location Pro-Remorque

Basées sur le logo officiel, voici les couleurs à utiliser partout dans l'application:

### Couleur Principale: Rouge
- **Rouge principal**: `#DC2626` (red-600)
- **Rouge foncé**: `#B91C1C` (red-700)
- **Rouge clair**: `#EF4444` (red-500)
- **Dégradé principal**: `linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)`

### Couleur Secondaire: Noir
- **Noir principal**: `#1F2937` (gray-800)
- **Noir très foncé**: `#111827` (gray-900)

### Remplacements à Effectuer

#### 1. Remplacer VERT par ROUGE

**Ancien (vert)**:
```css
#16a34a (green-600)
#15803d (green-700)
#22c55e (green-500)
linear-gradient(135deg, #16a34a 0%, #15803d 100%)
```

**Nouveau (rouge)**:
```css
#DC2626 (red-600)
#B91C1C (red-700)
#EF4444 (red-500)
linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)
```

#### 2. Fichiers à Mettre à Jour

##### Tailwind Config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
          light: '#EF4444',
        },
        secondary: {
          DEFAULT: '#1F2937',
          dark: '#111827',
        },
      },
    },
  },
}
```

##### Composants React
Chercher et remplacer dans tous les fichiers `.tsx` et `.ts`:
- `bg-green-600` → `bg-red-600`
- `text-green-600` → `bg-red-600`
- `border-green-600` → `border-red-600`
- `hover:bg-green-700` → `hover:bg-red-700`
- `from-green-600` → `from-red-600`
- `to-green-700` → `to-red-700`

##### CSS/Styles Inline
```tsx
// Ancien
<button className="bg-green-600 hover:bg-green-700">

// Nouveau
<button className="bg-red-600 hover:bg-red-700">
```

#### 3. Composants Prioritaires

**Boutons principaux** (CTA):
- Background: `bg-red-600`
- Hover: `hover:bg-red-700`
- Ombre: `shadow-red-600/30`

**Headers/Navigation**:
- Background: `bg-gradient-to-r from-red-600 to-red-700`
- Ou fond noir: `bg-gray-800`

**Cards/Highlights**:
- Bordure: `border-red-600`
- Background léger: `bg-red-50`
- Accents: `text-red-600`

**États de succès**:
- GARDER le vert pour succès: `#16A34A`
- Le rouge est pour la marque, pas pour "danger"

#### 4. Commandes de Recherche

```bash
# Trouver tous les usages de vert
rg "#16a34a|green-600|bg-green|text-green|border-green" --type tsx --type ts

# Trouver les gradients verts
rg "gradient.*green" --type tsx --type ts
```

## Priorités de Migration

### Phase 1: Email (✅ FAIT)
- ✅ Template email avec rouge et noir
- ✅ Header rouge
- ✅ Footer noir
- ✅ CTA rouge

### Phase 2: Navigation & Layout
- [ ] Header principal → fond rouge ou noir
- [ ] Sidebar → accents rouges
- [ ] Logo → utiliser le vrai logo
- [ ] Boutons principaux → rouge

### Phase 3: Composants UI
- [ ] Boutons primaires
- [ ] Cards actives
- [ ] Badges/Pills
- [ ] Indicateurs de statut (sauf succès)

### Phase 4: Pages principales
- [ ] Dashboard
- [ ] Page garanties
- [ ] Page clients
- [ ] Formulaires

## Notes Importantes

1. **NE PAS changer**:
   - Succès → garder vert `#16A34A`
   - Danger → garder rouge existant
   - Warning → garder orange/jaune
   - Info → garder bleu

2. **Cohérence**:
   - Rouge = Branding + Actions principales
   - Noir = Headers/Footers sombres
   - Vert = Succès seulement
   - Gris = UI neutre

3. **Accessibilité**:
   - Vérifier les contrastes
   - Rouge sur blanc: ✅ OK
   - Rouge sur noir: ✅ OK
   - Blanc sur rouge: ✅ OK

## Fichier de Référence

Le fichier `src/lib/brand-colors.ts` contient toutes les couleurs officielles avec leurs nuances.

Import:
```ts
import { BRAND_COLORS, BRAND_GRADIENTS } from '@/lib/brand-colors';
```

Usage:
```tsx
<button style={{ background: BRAND_GRADIENTS.primary }}>
  {/* Contenu */}
</button>
```
