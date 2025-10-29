# 🎯 Hiérarchie Complète des Rôles

**NIVEAU 10: Super Admin** (Maxime - Développeur)
- Accès TOTAL au système
- Peut tout voir et tout gérer
- Outils de développement

**NIVEAU 8: Master/Admin** (Philippe - Propriétaire)
- Vision globale de TOUTES les franchises
- Crée et gère les franchises
- Dashboard consolidé
- Ne peut PAS gérer super_admin

**NIVEAU 6: Franchisee Admin** (Gestionnaire franchise)
- Gère SA franchise uniquement
- Invite ses employés
- Paramètres de sa franchise
- NE VOIT PAS les autres franchises

**NIVEAU 4: Employee** (Vendeur/Employé)
- Opérations quotidiennes
- Crée des ventes/garanties
- Pas de gestion d'utilisateurs
- Pas d'accès aux paramètres

**NIVEAU 1: Client**
- Voit SES produits uniquement
- Soumet des réclamations

---

## 🔑 Différences Clés

### Super Admin vs Admin
- **Super Admin**: Maxime, créateur du système, accès dev tools
- **Admin/Master**: Philippe, propriétaire des franchises, pas d'accès dev

### Admin vs Franchisee Admin
- **Admin/Master**: Voit TOUTES les franchises, crée des franchises
- **Franchisee Admin**: Voit SA franchise uniquement, ne crée pas de franchises

### Franchisee Admin vs Employee
- **Franchisee Admin**: Peut inviter/gérer des employés, accès paramètres
- **Employee**: Opérations seulement, pas de gestion

---

## 📊 Qui Peut Gérer Qui?

```
Super Admin → Peut gérer TOUS les rôles
Admin/Master → Peut gérer: Admin, Franchisee Admin, Employee, Client
Franchisee Admin → Peut gérer: Ses Employees uniquement
Employee → Ne gère personne
Client → Ne gère personne
```

---

## 🏢 Isolation Multi-Tenant

**Franchise Montréal** (Jean = Franchisee Admin):
- Voit uniquement les données de Montréal
- Peut inviter des employés pour Montréal
- NE VOIT PAS Franchise Québec

**Franchise Québec** (Pierre = Franchisee Admin):
- Voit uniquement les données de Québec
- Complètement isolé de Montréal

**Master Account** (Philippe = Master):
- Voit Montréal + Québec + toutes les autres
- Dashboard consolidé
