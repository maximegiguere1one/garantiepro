/*
  # Ajout de la colonne 'role' à franchisee_invitations

  1. Changements
    - Ajoute la colonne 'role' à la table franchisee_invitations
    - Permet de spécifier le rôle de l'utilisateur invité (admin, f_and_i, operations, client)
    - Valeur par défaut: 'admin'

  2. Sécurité
    - La colonne est NOT NULL avec une valeur par défaut
    - Contrainte CHECK pour valider les valeurs autorisées
*/

-- Ajouter la colonne role à la table franchisee_invitations
ALTER TABLE franchisee_invitations 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin'
CHECK (role IN ('admin', 'f_and_i', 'operations', 'client'));

-- Créer un index pour améliorer les performances des requêtes par rôle
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_role ON franchisee_invitations(role);

-- Commenter la colonne pour documentation
COMMENT ON COLUMN franchisee_invitations.role IS 
  'Rôle assigné à l''utilisateur invité: admin, f_and_i, operations, ou client';
