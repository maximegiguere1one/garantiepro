# Mode Démo Automatique pour Bolt

## 🎉 Nouvelle Fonctionnalité

L'application **détecte automatiquement** qu'elle tourne dans Bolt et active le **Mode Démonstration** après 2 secondes.

## Comment ça marche?

### 1. Au Démarrage

Quand vous ouvrez l'application dans Bolt:

1. L'app essaie de se connecter à Supabase (échoue à cause des limitations réseau)
2. Après **2 secondes**, un message apparaît: "Mode Démo Bolt Activé"
3. L'application se recharge automatiquement
4. Vous êtes connecté en tant que **"Mode Démonstration Bolt"** avec rôle **Admin**

### 2. Ce que vous pouvez faire

✅ **Fonctionnel**:
- Navigation complète dans l'interface
- Toutes les pages sont accessibles
- Interface entièrement responsive
- Design et animations visibles

⚠️ **Limitations** (mode démo):
- Pas de connexion réelle à Supabase
- Données affichées sont fictives
- Modifications ne sont pas sauvegardées
- Créations de garanties = démonstration uniquement

## Si vous voulez utiliser Supabase pour de vrai

### Option 1: Déployer en Production (Recommandé)

```bash
# Cloudflare Pages
npm run build
npx wrangler pages deploy dist

# Ou Vercel
npx vercel

# Ou Netlify
npm run build
npx netlify deploy --prod --dir=dist
```

En production, Supabase Auth fonctionnera **parfaitement**.

### Option 2: Développement Local

```bash
# Clonez le repo sur votre machine
git clone [your-repo]
cd [project]
npm install
npm run dev
```

En local, pas de limitations WebContainer = **tout fonctionne**.

## Comment désactiver le mode démo?

Si vous ne voulez PAS le mode démo automatique:

1. Ouvrez la console du navigateur (F12)
2. Tapez: `localStorage.removeItem('emergency_mode_enabled')`
3. Tapez: `localStorage.removeItem('emergency_profile')`
4. Rafraîchissez la page

Vous verrez alors la page d'erreur originale avec les options manuelles.

## Détection de Bolt

L'application détecte Bolt via:
- `webcontainer` dans le hostname
- `stackblitz` dans le hostname  
- `bolt` dans le hostname
- `staticblitz` dans le hostname

## Profil Démo Créé

```typescript
{
  id: 'demo-user-[timestamp]',
  email: 'demo@bolt.local',
  full_name: 'Mode Démonstration Bolt',
  role: 'admin',
  organization_id: 'demo-org-[timestamp]',
  emergency: true
}
```

## Pourquoi cette approche?

1. **Expérience fluide**: Pas besoin de cliquer sur des boutons d'erreur
2. **Tests rapides**: Vous pouvez tester l'interface immédiatement
3. **Transparence**: Message clair indiquant que c'est une démo
4. **Automatique**: Détection intelligente de l'environnement

## Questions?

- **"Pourquoi Supabase ne marche pas dans Bolt?"** → Limitations CORS et réseau de WebContainer
- **"Mes données sont sauvegardées?"** → Non, c'est un mode démo sans connexion réelle
- **"Comment avoir la vraie app?"** → Déployez en production ou lancez localement
- **"Puis-je tester les fonctionnalités?"** → Oui, l'interface est complète, mais sans persistance

## Fichiers Modifiés

- `src/components/BoltAutoDemo.tsx` - Nouveau composant de détection
- `src/App.tsx` - Ajout du composant BoltAutoDemo
- `src/lib/emergency-mode.ts` - Système de profil démo (existait déjà)

## Retour à la Normale

Pour revenir au comportement par défaut (page d'erreur avec boutons manuels):

```typescript
// Dans BoltAutoDemo.tsx, changez le délai:
const timer = setTimeout(activateDemo, 999999); // 999s = jamais
```

Ou supprimez simplement `<BoltAutoDemo />` de `App.tsx`.
