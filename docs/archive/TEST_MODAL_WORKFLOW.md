# Test du Modal Nouveau Workflow

## Si le bouton ne fonctionne toujours pas:

### 1. Vider le cache du navigateur
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 2. Vérifier la console du navigateur
Ouvrez les DevTools (F12) et regardez:
- Onglet Console: Y a-t-il des erreurs?
- Onglet Network: Les fichiers JS se chargent-ils?

### 3. Vérifier que le code est bien déployé
Le fichier modifié: `src/components/AutomationDashboard.tsx`

Lignes critiques:
- Ligne 65: `const [showCreateModal, setShowCreateModal] = useState(false);`
- Ligne 209: `onClick={() => setShowCreateModal(true)}`
- Ligne 175: `const handleCreateWorkflow = async () => {`
- Ligne 546: `{showCreateModal && (`

### 4. Test manuel dans la console
Ouvrez la console du navigateur et tapez:
```javascript
// Vérifier si React est chargé
console.log(React);

// Vérifier l'état du composant
// (disponible seulement avec React DevTools)
```

### 5. Redémarrer le serveur de développement
```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer:
npm run dev
```

## Comportement attendu:

1. **Clic sur "Nouveau Workflow"** → Modal s'ouvre avec fond sombre
2. **Modal affiche:**
   - Titre: "Nouveau Workflow"
   - 4 champs: Nom, Description, Type, Jours
   - 2 boutons: Annuler, Créer
3. **Clic sur "Annuler"** → Modal se ferme
4. **Remplir les champs + "Créer"** → Workflow sauvegardé, modal se ferme

## Si rien ne fonctionne:

Il peut y avoir un problème avec le hot-reload. Solution:

```bash
# 1. Arrêter le serveur
Ctrl + C

# 2. Nettoyer
rm -rf dist/ node_modules/.vite

# 3. Rebuild
npm run build

# 4. Redémarrer
npm run dev
```

## Vérification rapide du build:

Le build a réussi (41.04s) donc le code est valide.
Le problème est probablement lié au cache du navigateur ou au hot-reload.
