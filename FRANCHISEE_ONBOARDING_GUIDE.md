# Guide d'Onboarding des Franchisés - Location Pro Remorque

## Vue d'ensemble du système multi-tenant

Le système Location Pro Remorque est maintenant entièrement multi-tenant, permettant à Phil (propriétaire principal) de gérer plusieurs franchisés avec isolation complète des données.

## Architecture

### Hiérarchie des organisations

```
Location Pro Remorque (Owner - Phil)
├── Franchisé A
│   ├── Admin A
│   ├── F&I Staff A1, A2
│   └── Operations Staff A3
├── Franchisé B
│   ├── Admin B
│   └── F&I Staff B1
└── Franchisé C
    └── Admin C
```

### Isolation des données

- **Complète**: Chaque franchisé ne voit QUE ses propres données
- **Phil (Owner)**: Voit TOUTES les données de tous les franchisés
- **RLS automatique**: Pas de filtres manuels, tout est géré par la base de données

---

## Processus d'Onboarding d'un Franchisé

### Étape 1: Créer l'organisation du franchisé

**Qui**: Phil (admin owner)

**Comment**:
1. Se connecter en tant que Phil
2. Aller dans: **Paramètres > Organisations**
3. Cliquer sur "Nouvelle Organisation"
4. Remplir les informations:
   - **Nom**: Ex: "Location Pro Remorque - Laval"
   - **Type**: Franchisé
   - **Email de facturation**: contact@franchiselaval.com
   - **Adresse complète**
   - **Province**: QC (pour les taxes)
   - **Couleurs personnalisées** (optionnel)
5. Cliquer sur "Créer l'organisation"

**Résultat**: L'organisation franchisée est créée avec un ID unique

### Étape 2: Configurer la facturation (Optionnel pour Phase 1)

**Qui**: Phil (admin owner)

**Méthode**: Pourcentage sur les ventes de garanties

**Exemple de configuration**:
- Franchisé paie 10% de chaque garantie vendue
- Facturation mensuelle automatique
- Accès au tableau de facturation pour Phil

### Étape 3: Inviter l'administrateur du franchisé

**Qui**: Phil (admin owner)

**Comment**:
1. Dans la page Organisations, sélectionner le franchisé
2. Ou aller dans: **Paramètres > Utilisateurs**
3. S'assurer que l'organisation active est celle du franchisé
4. Cliquer sur "Inviter un utilisateur"
5. Remplir:
   - **Nom complet**: Ex: "Jean Tremblay"
   - **Email**: jean@franchiselaval.com
   - **Rôle**: Administrateur
6. Cliquer sur "Envoyer l'invitation"

**Résultat**:
- L'utilisateur reçoit un email avec un lien magique
- Il peut définir son mot de passe
- Il est automatiquement assigné à l'organisation du franchisé
- Il a accès à toutes les fonctionnalités admin pour son franchisé

### Étape 4: Configuration initiale du franchisé

**Qui**: Admin du franchisé (Jean)

**Paramètres à configurer**:

#### 4.1 Paramètres d'entreprise
- Logo et coordonnées
- Email et téléphone de contact
- Réseaux sociaux

#### 4.2 Taxes
- **TPS**: 5%
- **TVQ**: 9.975%
- Vérifier le code de province (QC)

#### 4.3 Plans de garanties
Options:
- **Option A**: Utiliser les plans par défaut de Phil (recommandé)
- **Option B**: Créer des plans personnalisés pour le franchisé

Pour utiliser les plans de Phil:
- Les plans de Phil sont visibles par tous (organization_id NULL)
- Le franchisé peut les utiliser directement

Pour créer des plans personnalisés:
1. Aller dans **Paramètres > Offres commerciales**
2. Créer un nouveau plan
3. Le plan sera spécifique au franchisé

#### 4.4 Règles de tarification
Configurer les règles selon les prix d'achat:
```
$0 - $5,000: $250 franchise, 15% prix
$5,001 - $10,000: $500 franchise, 12% prix
$10,001 - $20,000: $750 franchise, 10% prix
$20,001+: $1,000 franchise, 8% prix
```

#### 4.5 Notifications
- Configurer les emails de notifications
- Activer/désactiver selon les besoins

### Étape 5: Ajouter l'équipe du franchisé

**Qui**: Admin du franchisé

**Rôles disponibles**:

- **Administrateur**: Accès complet, gestion des paramètres
- **F&I (Finance et Assurance)**: Création/gestion des garanties
- **Operations**: Gestion des réclamations, support client
- **Client**: Accès lecture seule (pour les clients finaux)

**Comment inviter un membre de l'équipe**:
1. Aller dans **Paramètres > Utilisateurs**
2. Cliquer sur "Inviter un utilisateur"
3. Remplir les informations
4. Sélectionner le rôle approprié
5. L'utilisateur reçoit un email d'invitation

### Étape 6: Configuration optionnelle avancée

#### 6.1 Templates de garantie personnalisés
- Créer des templates PDF personnalisés
- Ajouter le logo du franchisé
- Personnaliser les conditions

#### 6.2 Intégrations
- QuickBooks (si le franchisé utilise sa propre instance)
- Acomba (pour la comptabilité locale)
- Stripe (paiements en ligne)

#### 6.3 Templates d'emails
- Personnaliser les emails de confirmation
- Emails de réclamation
- Rappels d'expiration

---

## Fonctionnalités par Rôle

### Phil (Owner - Administrateur)

✅ **Accès global**:
- Voir TOUTES les organisations
- Voir TOUTES les données de tous les franchisés
- Créer de nouvelles organisations
- Gérer les utilisateurs de tous les franchisés
- Accéder aux rapports consolidés
- Gérer la facturation multi-tenant

✅ **Tableau de bord consolidé**:
- Statistiques globales
- Performance par franchisé
- Revenus totaux
- Réclamations par organisation

✅ **Facturation**:
- Générer les factures mensuelles pour chaque franchisé
- Voir les transactions de garanties
- Suivre les paiements

### Admin Franchisé

✅ **Accès à son organisation uniquement**:
- Voir uniquement ses clients, garanties, réclamations
- Gérer les paramètres de son franchisé
- Inviter des utilisateurs dans son organisation
- Créer des plans de garantie personnalisés

✅ **Gestion complète**:
- Paramètres d'entreprise
- Configuration des taxes
- Plans de garanties et options
- Règles de tarification
- Utilisateurs de l'équipe
- Templates et intégrations

❌ **Restrictions**:
- Ne peut PAS voir les données d'autres franchisés
- Ne peut PAS créer d'autres organisations
- Ne peut PAS inviter d'utilisateurs dans d'autres organisations

### F&I (Finance et Assurance)

✅ **Ventes et garanties**:
- Créer de nouvelles garanties
- Gérer les clients
- Voir les statistiques de vente
- Gérer l'inventaire de remorques
- Créer des plans de garantie (si admin le permet)

❌ **Restrictions**:
- Ne peut PAS modifier les paramètres système
- Ne peut PAS inviter des utilisateurs
- Ne peut PAS gérer les réclamations (sauf consultation)

### Operations

✅ **Support et réclamations**:
- Voir toutes les garanties actives
- Gérer les réclamations
- Approuver/refuser des réclamations
- Communiquer avec les clients
- Voir les statistiques de réclamations

❌ **Restrictions**:
- Ne peut PAS créer de garanties
- Ne peut PAS modifier les paramètres
- Ne peut PAS inviter des utilisateurs
- Accès lecture seule aux ventes

### Client

✅ **Accès minimal**:
- Voir ses propres garanties
- Soumettre des réclamations
- Voir l'historique de ses réclamations

❌ **Restrictions**:
- Ne peut rien voir d'autre que ses propres données

---

## Isolation et Sécurité des Données

### Mécanismes d'isolation

#### 1. Row Level Security (RLS)
Toutes les tables sont protégées par RLS au niveau de la base de données:

```sql
-- Exemple de policy pour warranties
CREATE POLICY "Users can view own org warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
    OR EXISTS (SELECT 1 FROM customers WHERE ...)
  );
```

#### 2. Triggers automatiques
Lors de la création de données, l'`organization_id` est assigné automatiquement:

```sql
CREATE TRIGGER set_warranty_organization_id
  BEFORE INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();
```

#### 3. Fonctions helper
- `get_user_organization_id()`: Retourne l'org_id de l'utilisateur connecté
- `is_owner()`: Vérifie si l'utilisateur est Phil (owner)
- `get_user_role()`: Retourne le rôle de l'utilisateur

### Tables avec isolation

**Toutes ces tables sont isolées par organization_id**:

- ✅ profiles (utilisateurs)
- ✅ customers
- ✅ trailers
- ✅ warranties
- ✅ claims
- ✅ payments
- ✅ loyalty_credits
- ✅ nps_surveys
- ✅ dealer_inventory
- ✅ customer_products
- ✅ company_settings
- ✅ tax_settings
- ✅ pricing_settings
- ✅ notification_settings
- ✅ claim_settings
- ✅ warranty_plans
- ✅ warranty_options
- ✅ warranty_templates
- ✅ email_templates
- ✅ integration_credentials
- ✅ integration_logs
- ✅ notification_templates
- ✅ integration_settings

### Tests de sécurité à effectuer

#### Test 1: Isolation utilisateurs
```
1. Créer un utilisateur admin dans Franchisé A
2. Créer un utilisateur admin dans Franchisé B
3. Se connecter comme Admin A
4. Vérifier qu'on ne voit QUE les données de Franchisé A
5. Se connecter comme Admin B
6. Vérifier qu'on ne voit QUE les données de Franchisé B
```

#### Test 2: Phil voit tout
```
1. Se connecter comme Phil
2. Sélectionner Franchisé A dans le sélecteur
3. Voir les données de A
4. Sélectionner Franchisé B
5. Voir les données de B
```

#### Test 3: Pas de fuite de données
```sql
-- En tant qu'admin de Franchisé A, cette requête ne devrait rien retourner
SELECT * FROM warranties
WHERE organization_id IN (
  SELECT id FROM organizations WHERE id != get_user_organization_id()
);
```

---

## Scénarios d'utilisation courants

### Scénario 1: Nouveau franchisé à Québec

1. Phil crée l'organisation "Location Pro Remorque - Québec"
2. Phil configure la facturation: 8% des ventes
3. Phil invite Pierre Gagnon comme admin: pierre@lpr-quebec.com
4. Pierre reçoit l'email, définit son mot de passe
5. Pierre configure:
   - Logo et coordonnées du franchisé
   - Taxes (TPS/TVQ)
   - Utilise les plans de garantie de Phil
6. Pierre invite son équipe:
   - Marie (F&I): marie@lpr-quebec.com
   - Luc (Operations): luc@lpr-quebec.com
7. L'équipe peut commencer à travailler immédiatement

### Scénario 2: Franchisé veut des plans personnalisés

1. Admin franchisé va dans Paramètres > Offres commerciales
2. Crée un nouveau plan "Plan Premium Laval"
3. Configure les prix, durées, couvertures
4. Le plan est maintenant disponible SEULEMENT pour ce franchisé
5. Les autres franchisés ne le voient pas
6. Phil peut voir tous les plans de tous les franchisés

### Scénario 3: Phil analyse les performances

1. Phil se connecte
2. Va dans Analytics ou Facturation
3. Voit un tableau avec tous les franchisés
4. Peut filtrer par franchisé spécifique
5. Génère des rapports consolidés
6. Peut comparer les performances entre franchisés

---

## Facturation Multi-Tenant (À venir)

### Modèles de facturation supportés

#### 1. Pourcentage sur garanties
- Le franchisé paie X% du prix de chaque garantie vendue
- Facturation mensuelle automatique
- Rapport détaillé des transactions

#### 2. Frais fixes mensuels
- Abonnement mensuel fixe
- Indépendant du volume de ventes
- Facture générée automatiquement le 1er du mois

#### 3. Hybride
- Frais fixes + pourcentage
- Exemple: $500/mois + 5% des ventes

### Processus de facturation

1. **Fin du mois**: Edge Function génère les factures
2. **Calcul automatique**: Basé sur les warranties vendues
3. **Email envoyé**: Facture PDF envoyée au franchisé
4. **Tableau de bord**: Franchisé peut voir ses factures
5. **Paiement**: Enregistrement manuel ou automatique

---

## FAQ Techniques

### Q: Un franchisé peut-il voir les données d'un autre?
**R**: Non, impossible. L'isolation est garantie par RLS au niveau de la base de données.

### Q: Phil peut-il déléguer la gestion d'un franchisé?
**R**: Oui, en invitant un admin dans l'organisation du franchisé.

### Q: Les plans de garantie sont-ils partagés?
**R**: Par défaut, les plans de Phil (organization_id = NULL) sont visibles par tous. Chaque franchisé peut aussi créer ses propres plans.

### Q: Comment migrer les données existantes?
**R**: Toutes les données existantes avant le multi-tenant sont assignées à l'organisation Owner de Phil.

### Q: Les intégrations (QuickBooks, Stripe) sont-elles partagées?
**R**: Non, chaque franchisé a ses propres credentials d'intégration, isolés.

### Q: Peut-on désactiver un franchisé?
**R**: Oui, Phil peut changer le statut de l'organisation à "inactive".

### Q: Les emails sont-ils personnalisés par franchisé?
**R**: Oui, chaque franchisé peut créer ses propres templates d'email.

---

## Checklist de lancement franchisé

### Avant le lancement
- [ ] Organisation créée dans le système
- [ ] Configuration facturation définie
- [ ] Admin principal invité et connecté
- [ ] Paramètres d'entreprise configurés
- [ ] Taxes configurées (TPS/TVQ)
- [ ] Plans de garantie sélectionnés ou créés
- [ ] Règles de tarification configurées
- [ ] Équipe invitée et formée

### Jour du lancement
- [ ] Test de création de garantie
- [ ] Test de soumission de réclamation
- [ ] Vérification des emails
- [ ] Vérification des PDF générés
- [ ] Test des paiements (si applicable)

### Post-lancement
- [ ] Suivi hebdomadaire avec le franchisé
- [ ] Vérification des factures mensuelles
- [ ] Support technique si nécessaire
- [ ] Formation continue de l'équipe

---

## Support et Assistance

### Pour les franchisés
- **Email**: support@locationproremorque.com
- **Documentation**: Disponible dans l'application
- **Formation**: Vidéos et guides disponibles

### Pour Phil (Owner)
- **Accès complet**: Dashboard consolidé
- **Alertes**: Notifications pour nouveaux franchisés
- **Rapports**: Analytics globaux et par franchisé

---

## Notes importantes

⚠️ **Sécurité**: Toutes les données sont isolées par RLS. Aucun code applicatif ne gère l'isolation.

⚠️ **Performance**: Les indexes sur `organization_id` assurent des requêtes rapides.

⚠️ **Évolutivité**: Le système peut gérer des centaines de franchisés sans problème.

⚠️ **Conformité**: Chaque franchisé est responsable de ses données selon les lois locales.

---

**Version**: 1.0
**Dernière mise à jour**: Octobre 2025
**Contact**: Phil - Location Pro Remorque
