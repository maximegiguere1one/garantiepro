# 🔍 Détecteur PGRST116 - Console Browser

## Script de Détection en Temps Réel

Copiez-collez ce script dans la console du navigateur (F12) pour intercepter et identifier précisément quelle requête cause l'erreur PGRST116.

### Script à Copier

```javascript
// ============================================
// DÉTECTEUR PGRST116 - TEMPS RÉEL
// ============================================

console.log('%c🔍 DÉTECTEUR PGRST116 ACTIVÉ', 'background: #dc2626; color: white; padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 4px;');
console.log('Ce script va intercepter toutes les requêtes Supabase et identifier celles qui causent PGRST116\n');

// Sauvegarder la fonction fetch originale
const originalFetch = window.fetch;
let requestCounter = 0;
const pgrst116Errors = [];

// Intercepter fetch
window.fetch = async function(...args) {
    const requestId = ++requestCounter;
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const isSupabaseRequest = url?.includes('supabase');

    if (isSupabaseRequest) {
        const startTime = performance.now();

        try {
            const response = await originalFetch.apply(this, args);
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(0);

            // Cloner la réponse pour pouvoir la lire
            const clonedResponse = response.clone();

            // Vérifier si c'est une erreur
            if (!response.ok) {
                const errorData = await clonedResponse.json().catch(() => ({}));

                // Détection PGRST116
                if (errorData.code === 'PGRST116' || errorData.message?.includes('multiple (or no) rows')) {
                    const errorInfo = {
                        requestId,
                        url,
                        method: args[1]?.method || 'GET',
                        status: response.status,
                        code: errorData.code,
                        message: errorData.message,
                        timestamp: new Date().toISOString(),
                        duration: duration + 'ms'
                    };

                    pgrst116Errors.push(errorInfo);

                    console.group(`%c🔴 PGRST116 DÉTECTÉ (#${requestId})`, 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
                    console.log('%cURL:', 'font-weight: bold; color: #dc2626;', url);
                    console.log('%cMéthode:', 'font-weight: bold; color: #dc2626;', args[1]?.method || 'GET');
                    console.log('%cMessage:', 'font-weight: bold; color: #dc2626;', errorData.message);
                    console.log('%cDurée:', 'font-weight: bold; color: #dc2626;', duration + 'ms');

                    // Extraire la table et les paramètres de l'URL
                    try {
                        const urlObj = new URL(url);
                        const pathParts = urlObj.pathname.split('/');
                        const table = pathParts[pathParts.length - 1];
                        const params = Object.fromEntries(urlObj.searchParams);

                        console.log('%cTable:', 'font-weight: bold; color: #dc2626;', table);
                        console.log('%cParamètres:', 'font-weight: bold; color: #dc2626;', params);

                        // Afficher le body de la requête si présent
                        if (args[1]?.body) {
                            try {
                                const body = JSON.parse(args[1].body);
                                console.log('%cBody:', 'font-weight: bold; color: #dc2626;', body);
                            } catch (e) {}
                        }
                    } catch (e) {}

                    console.log('%cStack Trace:', 'font-weight: bold; color: #dc2626;');
                    console.trace();
                    console.groupEnd();

                    // Alerte visuelle
                    console.log('\n%c⚠️ SOLUTION POSSIBLE:', 'background: #f59e0b; color: white; padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 4px;');
                    console.log(`1. Recherchez cette requête dans votre code:`);
                    console.log(`   rg ".from('${table.split('?')[0]}')" src/ -A 5 | grep ".single()"`);
                    console.log(`2. Remplacez .single() par .maybeSingle()`);
                    console.log(`3. OU vérifiez s'il y a des duplicates dans cette table\n`);
                }
            }

            return response;
        } catch (error) {
            console.error('❌ Erreur fetch:', error);
            throw error;
        }
    }

    return originalFetch.apply(this, args);
};

// Fonction pour afficher le rapport
window.showPGRST116Report = function() {
    console.log('\n' + '='.repeat(80));
    console.log('%c📊 RAPPORT PGRST116', 'background: #1e40af; color: white; padding: 8px 16px; font-size: 16px; font-weight: bold; border-radius: 4px;');
    console.log('='.repeat(80) + '\n');

    if (pgrst116Errors.length === 0) {
        console.log('%c✅ Aucune erreur PGRST116 détectée!', 'color: #10b981; font-size: 14px; font-weight: bold;');
    } else {
        console.log(`%c🔴 ${pgrst116Errors.length} erreur(s) PGRST116 détectée(s)`, 'color: #dc2626; font-size: 14px; font-weight: bold;');
        console.log('\n');

        pgrst116Errors.forEach((error, index) => {
            console.group(`Erreur #${index + 1} - ${error.timestamp}`);
            console.table(error);
            console.groupEnd();
        });

        // Grouper par table
        const byTable = {};
        pgrst116Errors.forEach(error => {
            try {
                const urlObj = new URL(error.url);
                const table = urlObj.pathname.split('/').pop().split('?')[0];
                byTable[table] = (byTable[table] || 0) + 1;
            } catch (e) {}
        });

        console.log('\n%cRésumé par table:', 'font-weight: bold; font-size: 14px;');
        console.table(byTable);

        console.log('\n%c🔧 ACTIONS RECOMMANDÉES:', 'background: #dc2626; color: white; padding: 6px 12px; font-weight: bold; border-radius: 4px;');
        Object.keys(byTable).forEach(table => {
            console.log(`\n📋 Table: ${table} (${byTable[table]} erreur(s))`);
            console.log(`   Recherche: rg ".from('${table}')" src/ -A 5 | grep ".single()"`);
            console.log(`   Solution: Remplacer .single() par .maybeSingle()`);
        });
    }

    console.log('\n' + '='.repeat(80) + '\n');
};

// Afficher les commandes disponibles
console.log('%c📝 COMMANDES DISPONIBLES:', 'background: #1e40af; color: white; padding: 6px 12px; font-weight: bold; border-radius: 4px;');
console.log('  • showPGRST116Report()  - Afficher le rapport complet');
console.log('  • pgrst116Errors        - Accéder au tableau des erreurs');
console.log('\n%cℹ️ Le détecteur est maintenant actif. Naviguez dans l\'application pour capturer les erreurs.', 'color: #3b82f6; font-style: italic;');
console.log('');
```

---

## 📖 Mode d'Emploi

### Étape 1: Ouvrir la Console
1. Ouvrez votre application dans Chrome ou Firefox
2. Appuyez sur **F12** pour ouvrir les DevTools
3. Cliquez sur l'onglet **Console**

### Étape 2: Activer le Détecteur
1. Copiez le script ci-dessus (tout le code JavaScript)
2. Collez-le dans la console
3. Appuyez sur **Entrée**

Vous devriez voir:
```
🔍 DÉTECTEUR PGRST116 ACTIVÉ
Ce script va intercepter toutes les requêtes Supabase...
```

### Étape 3: Reproduire l'Erreur
1. Naviguez dans l'application
2. Allez sur la page des garanties
3. Effectuez les actions qui causent normalement l'erreur

### Étape 4: Capturer l'Erreur
Quand l'erreur PGRST116 se produit, vous verrez immédiatement:

```
🔴 PGRST116 DÉTECTÉ (#1)
  URL: https://xxx.supabase.co/rest/v1/company_settings?...
  Méthode: GET
  Message: JSON object requested, multiple (or no) rows returned
  Table: company_settings
  Paramètres: { organization_id: "eq.xxx", select: "*" }
```

### Étape 5: Voir le Rapport Complet
Dans la console, tapez:
```javascript
showPGRST116Report()
```

Ceci affichera un rapport détaillé avec:
- Toutes les erreurs PGRST116 capturées
- Les tables affectées
- Les commandes pour trouver le code problématique

---

## 🎯 Exemple de Sortie

### Si Une Erreur Est Trouvée
```
🔴 PGRST116 DÉTECTÉ (#1)
  URL: https://xxx.supabase.co/rest/v1/company_settings?...
  Table: company_settings
  Paramètres: { organization_id: "eq.abc123" }

⚠️ SOLUTION POSSIBLE:
1. Recherchez: rg ".from('company_settings')" src/ -A 5 | grep ".single()"
2. Remplacez .single() par .maybeSingle()
3. OU vérifiez les duplicates dans company_settings
```

### Rapport Final
```
📊 RAPPORT PGRST116
================================================================================

🔴 2 erreur(s) PGRST116 détectée(s)

Résumé par table:
┌──────────────────────┬────────┐
│ Table                │ Count  │
├──────────────────────┼────────┤
│ company_settings     │ 1      │
│ pricing_settings     │ 1      │
└──────────────────────┴────────┘

🔧 ACTIONS RECOMMANDÉES:

📋 Table: company_settings (1 erreur)
   Recherche: rg ".from('company_settings')" src/ -A 5 | grep ".single()"
   Solution: Remplacer .single() par .maybeSingle()

📋 Table: pricing_settings (1 erreur)
   Recherche: rg ".from('pricing_settings')" src/ -A 5 | grep ".single()"
   Solution: Remplacer .single() par .maybeSingle()
```

---

## 🔧 Utilisation Avancée

### Surveiller en Continue
Le détecteur reste actif pendant toute votre session. Vous pouvez:

1. **Naviguer librement** dans l'application
2. **Tester différentes fonctionnalités**
3. **Consulter le rapport** à tout moment avec `showPGRST116Report()`

### Accéder aux Données Brutes
```javascript
// Voir toutes les erreurs capturées
console.table(pgrst116Errors)

// Filtrer par table spécifique
pgrst116Errors.filter(e => e.url.includes('company_settings'))
```

### Exporter les Résultats
```javascript
// Copier dans le presse-papier
copy(JSON.stringify(pgrst116Errors, null, 2))
```

---

## 💡 Conseils

### Si Aucune Erreur N'Est Capturée
1. L'erreur pourrait se produire au chargement initial
2. Rechargez la page avec le détecteur déjà activé
3. Ou collez le script dans la console AVANT de naviguer

### Pour Capturer au Chargement Initial
Créez un bookmark avec ce code:
```javascript
javascript:(function(){/* COLLEZ LE SCRIPT ICI */})();
```

Puis cliquez sur le bookmark avant que la page ne charge complètement.

---

## 📋 Checklist de Diagnostic

- [ ] Script collé dans la console
- [ ] Message de confirmation affiché
- [ ] Navigation vers la page des garanties
- [ ] Erreur PGRST116 capturée (si elle se produit)
- [ ] Rapport consulté avec `showPGRST116Report()`
- [ ] Table problématique identifiée
- [ ] Recherche du code effectuée
- [ ] Correction appliquée

---

**Note**: Ce script n'envoie aucune donnée à l'extérieur. Il fonctionne uniquement dans votre navigateur pour vous aider à diagnostiquer le problème.
