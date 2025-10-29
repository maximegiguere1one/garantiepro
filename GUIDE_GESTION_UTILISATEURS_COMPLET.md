# 🎯 Guide Complet - Système de Gestion d'Utilisateurs

## ✅ Système 100% Fonctionnel

Le système de gestion d'utilisateurs est maintenant **entièrement opérationnel** avec un contrôle total pour les super administrateurs.

---

## 📋 Dashboard d'Invitations

### Accès
**Navigation**: Paramètres → Gestion des invitations

### Fonctionnalités

#### 1. **Envoyer une Invitation**
```
Bouton: "Nouvelle invitation"
- Email de l'utilisateur
- Sélection du rôle (Employé, Franchisé, Admin, Super Admin)
- Envoi automatique par email avec lien d'inscription
```

#### 2. **Tableau de Bord Complet**
- **Total** - Nombre total d'invitations
- **En attente** - Invitations non acceptées
- **Acceptées** - Utilisateurs qui ont créé leur compte
- **Échouées** - Invitations avec erreur d'envoi
- **Expirées** - Invitations périmées (72h)

#### 3. **Actions sur les Invitations**
- **Renvoyer** - Renvoie l'email d'invitation
- **Supprimer** - Supprime l'invitation
- **Filtrer** - Par statut (Toutes, En attente, Envoyée, Acceptée, Échouée)

#### 4. **Informations Visibles**
- Email de l'invité
- Rôle assigné
- Statut (badge coloré)
- Date de création (relative)
- Temps avant expiration
- Qui a envoyé l'invitation

---

## 👥 Gestion des Utilisateurs

### Accès
**Navigation**: Paramètres → Utilisateurs

### Contrôles Complets pour Super Admins

#### 1. **Modifier l'Utilisateur** (Icône crayon)
```
Modal "Modifier l'utilisateur"
- Nom complet
- Rôle (Employé, Franchisé, Admin, Super Admin*)
- Téléphone
- Bouton: "Enregistrer"

*Super Admin uniquement visible pour les super admins
```

#### 2. **Changer le Mot de Passe** (Icône clé)
```
Modal "Changer le mot de passe"
- Nouveau mot de passe (minimum 8 caractères)
- Changement IMMÉDIAT
- L'utilisateur doit utiliser ce nouveau mot de passe
- Bouton: "Changer"
```

#### 3. **Envoyer Lien de Réinitialisation** (Icône email)
```
- Envoie un email professionnel
- Lien valide 24h
- L'utilisateur choisit son nouveau mot de passe
- Confirme tation par toast
```

#### 4. **Supprimer l'Utilisateur** (Icône corbeille rouge)
```
- Confirmation obligatoire
- Suppression définitive et irréversible
- Supprime le compte auth + profil
- Ne peut pas être annulé
```

### Tableau Utilisateurs

**Colonnes**:
1. **Utilisateur** - Nom complet
2. **Email** - Adresse email
3. **Téléphone** - Numéro (ou —)
4. **Rôle** - Badge coloré
   - Super Admin (violet)
   - Administrateur (rouge)
   - Franchisé (bleu)
   - Employé (gris)
5. **Créé** - Temps relatif (ex: "il y a 3 jours")
6. **Dernière connexion** - Temps relatif (ou "Jamais")
7. **Actions** - Boutons de contrôle

### Permissions

**Super Admin**:
- ✅ Peut gérer TOUS les utilisateurs
- ✅ Peut créer d'autres super admins
- ✅ Contrôle total

**Admin**:
- ✅ Peut gérer employés et franchisés
- ❌ Ne peut pas gérer les super admins
- ⚠️ Accès restreint affiché

**Autres rôles**:
- ❌ Pas d'accès à la gestion utilisateurs

---

## 🔐 Processus d'Invitation

### Étape 1: Admin Envoie l'Invitation
1. Clic sur "Nouvelle invitation"
2. Entre l'email + sélectionne le rôle
3. Clic sur "Envoyer l'invitation"
4. ✅ Email professionnel envoyé automatiquement

### Étape 2: Utilisateur Reçoit l'Email
```
Email de: Location Pro-Remorque <noreply@locationproremorque.ca>
Sujet: "Invitation à rejoindre Location Pro-Remorque"

Contenu:
- Nom de l'organisation
- Rôle assigné
- Bouton "Accepter l'invitation"
- Lien valide 72 heures
```

### Étape 3: Création du Compte
1. Utilisateur clique sur le lien
2. Arrive sur https://www.garantieproremorque.com
3. Formulaire d'inscription pré-rempli:
   - Email (pré-rempli, non modifiable)
   - Nom complet (à remplir)
   - Mot de passe (à créer)
   - Confirmation mot de passe
4. Clic sur "Créer mon compte"
5. ✅ Compte créé et connecté automatiquement

### Étape 4: Premier Accès
- Utilisateur arrive sur le dashboard
- Rôle déjà assigné
- Organisation déjà liée
- Peut commencer à utiliser l'application

---

## 🎨 Interface Utilisateur

### Design Pro-Remorque
- **Couleurs**: Rouge #dc2626 (primary)
- **Cards**: Border slate-200, hover effects
- **Badges**: Colorés par rôle/statut
- **Modals**: Centre écran, overlay sombre
- **Icons**: Lucide React, taille adaptée
- **Buttons**: Loading states, variants (outline, ghost)

### États Visuels

**Invitations**:
- 🟡 **En attente** - Jaune
- 🔵 **Envoyée** - Bleu
- 🟢 **Acceptée** - Vert
- 🔴 **Échouée** - Rouge
- ⚪ **Expirée** - Gris

**Rôles**:
- 🟣 **Super Admin** - Violet
- 🔴 **Admin** - Rouge (primary)
- 🔵 **Franchisé** - Bleu
- ⚪ **Employé** - Gris

---

## 🛠️ Fonctions Edge (Backend)

### 1. `invite-user`
**Rôle**: Créer et envoyer une invitation

**Input**:
```json
{
  "email": "user@example.com",
  "role": "employee",
  "organizationId": "uuid",
  "invitedBy": "uuid"
}
```

**Actions**:
1. Vérifie que l'invitant est admin
2. Crée l'entrée dans `franchisee_invitations`
3. Génère un token unique
4. Envoie l'email via Resend
5. Retourne le succès/erreur

### 2. `send-password-reset`
**Rôle**: Changer ou réinitialiser un mot de passe

**Mode 1 - Changement Direct** (admin reset):
```json
{
  "userId": "uuid",
  "newPassword": "nouveaumotdepasse",
  "adminReset": true
}
```
- Change le mot de passe IMMÉDIATEMENT
- Pas d'email envoyé
- Utilisateur doit utiliser le nouveau mot de passe

**Mode 2 - Envoi de Lien**:
```json
{
  "email": "user@example.com"
}
```
- Génère un lien de réinitialisation
- Envoie un email professionnel
- Lien valide 24h
- Utilisateur choisit son mot de passe

### 3. `delete-user`
**Rôle**: Supprimer définitivement un utilisateur

**Input**:
```json
{
  "userId": "uuid"
}
```

**Actions**:
1. Vérifie les permissions admin
2. Supprime l'auth user (Supabase Auth)
3. Cascade supprime le profil
4. Irréversible

---

## 📊 Tables Supabase

### `franchisee_invitations`
```sql
- id (uuid)
- email (text)
- role (text)
- status (text) - pending, sent, accepted, failed, expired
- organization_id (uuid)
- invited_by (uuid)
- token (text, unique)
- expires_at (timestamptz) - 72h après création
- created_at (timestamptz)
- sent_at (timestamptz)
- accepted_at (timestamptz)
- attempts (integer)
- last_error (text)
```

### `profiles`
```sql
- id (uuid)
- user_id (uuid) - Référence auth.users
- email (text)
- full_name (text)
- role (text) - employee, franchisee, admin, super_admin
- phone (text)
- organization_id (uuid)
- created_at (timestamptz)
- last_sign_in_at (timestamptz)
```

---

## 🔒 Sécurité

### RLS (Row Level Security)

**Invitations**:
- ✅ Admins peuvent voir/gérer leurs invitations
- ✅ Super admins voient tout
- ❌ Utilisateurs standards: pas d'accès

**Profiles**:
- ✅ Utilisateurs voient leur propre profil
- ✅ Admins voient tous les profils de leur org
- ✅ Super admins voient tout
- ❌ Modification limitée par rôle

### Validation Backend
- Vérification du rôle à chaque opération
- Permissions strictes sur les operations sensibles
- Logs de toutes les actions critiques
- Expiration automatique des invitations
- Rate limiting sur les envois d'emails

---

## 📧 Configuration Email

### Resend (Service d'email)

**Variables d'environnement** (déjà configurées):
```env
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@locationproremorque.ca
FROM_NAME=Location Pro-Remorque
SITE_URL=https://www.garantieproremorque.com
```

**Domaine vérifié**: `locationproremorque.ca`

### Templates d'Email

1. **Invitation**:
   - Design professionnel rouge/blanc
   - Logo Pro-Remorque
   - Bouton CTA clair
   - Informations rôle/organisation
   - Expiration visible

2. **Réinitialisation**:
   - Design sécurité (rouge/orange)
   - Icône cadenas
   - Alerte si non demandé
   - Conseils mot de passe fort
   - Expiration 24h

---

## 🎯 Flux Utilisateur Complet

### Scénario: Ajouter un Employé

```
1. Super Admin se connecte
   ↓
2. Va dans Paramètres → Gestion des invitations
   ↓
3. Clic "Nouvelle invitation"
   ↓
4. Entre: jean.dupont@example.com, Rôle: Employé
   ↓
5. Clic "Envoyer l'invitation"
   ↓
6. ✅ Toast: "Invitation envoyée avec succès"
   ↓
7. Jean reçoit l'email
   ↓
8. Jean clique sur "Accepter l'invitation"
   ↓
9. Arrive sur page d'inscription
   ↓
10. Entre: Nom complet + Mot de passe
    ↓
11. Clic "Créer mon compte"
    ↓
12. ✅ Compte créé, connecté automatiquement
    ↓
13. Arrive sur dashboard avec rôle Employé
    ↓
14. Admin voit dans "Utilisateurs" → Jean Dupont (Employé)
```

### Scénario: Changer Mot de Passe d'un Utilisateur

```
1. Super Admin → Paramètres → Utilisateurs
   ↓
2. Trouve l'utilisateur dans la liste
   ↓
3. Clic sur l'icône Clé 🔑
   ↓
4. Modal s'ouvre: "Changer le mot de passe"
   ↓
5. Entre le nouveau mot de passe (8+ caractères)
   ↓
6. Clic "Changer"
   ↓
7. ✅ Toast: "Mot de passe réinitialisé avec succès"
   ↓
8. Utilisateur doit maintenant utiliser ce nouveau mot de passe
```

---

## 🚀 Prêt pour Production

### ✅ Checklist Complète

**Fonctionnalités**:
- ✅ Système d'invitations fonctionnel
- ✅ Envoi d'emails automatique
- ✅ Gestion complète des utilisateurs
- ✅ Changement de mot de passe direct
- ✅ Envoi de lien de réinitialisation
- ✅ Suppression d'utilisateurs
- ✅ Modification de profils
- ✅ Permissions par rôle
- ✅ RLS sécurisé
- ✅ UI/UX professionnelle

**Sécurité**:
- ✅ Row Level Security activé
- ✅ Validation backend
- ✅ Tokens expirables
- ✅ Permissions strictes
- ✅ Logs complets
- ✅ CORS configuré

**Design**:
- ✅ 100% en français
- ✅ Couleurs Pro-Remorque
- ✅ Responsive
- ✅ Loading states
- ✅ Error handling
- ✅ Modals professionnels
- ✅ Toast notifications

**Domaine**:
- ✅ https://www.garantieproremorque.com
- ✅ Emails from @locationproremorque.ca
- ✅ SSL configuré
- ✅ Redirections correctes

---

## 📱 Support

### URLs Importantes
- **Application**: https://www.garantieproremorque.com
- **Dashboard**: https://www.garantieproremorque.com/dashboard
- **Invitations**: https://www.garantieproremorque.com/settings (onglet Invitations)
- **Utilisateurs**: https://www.garantieproremorque.com/settings (onglet Utilisateurs)

### Contacts Email
- **Expéditeur**: noreply@locationproremorque.ca
- **Nom**: Location Pro-Remorque

---

## 🎉 Résumé

Le client (super administrateur) a maintenant un **contrôle total à 100%** sur:

1. ✅ **Inviter** n'importe qui avec n'importe quel rôle
2. ✅ **Modifier** les informations de tous les utilisateurs
3. ✅ **Changer** immédiatement le mot de passe de n'importe qui
4. ✅ **Envoyer** des liens de réinitialisation par email
5. ✅ **Supprimer** définitivement n'importe quel utilisateur
6. ✅ **Suivre** toutes les invitations en temps réel
7. ✅ **Gérer** les rôles et permissions
8. ✅ **Voir** l'historique de connexion

**Le système est simple, intuitif et puissant!** 🚀
