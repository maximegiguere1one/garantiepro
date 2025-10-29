/*
  # Correction de la colonne invited_by pour permettre NULL
  
  ## Résumé
  Modifie la colonne invited_by dans franchisee_invitations pour permettre les valeurs NULL.
  Cela permet à la fonction onboard-franchisee de fonctionner correctement même quand 
  l'invitation est créée par un service (service role) plutôt qu'un utilisateur authentifié.
  
  ## Modifications
  1. **franchisee_invitations.invited_by** - Changé de NOT NULL à NULLABLE
     - Permet les invitations créées par des processus automatisés
     - Conserve la référence vers profiles quand un utilisateur invité
  
  ## Sécurité
  - Les politiques RLS existantes restent inchangées
  - La contrainte de clé étrangère reste active avec ON DELETE SET NULL
  
  ## Notes
  - Cette correction permet de résoudre l'erreur lors du renvoi d'invitation
  - Les invitations peuvent maintenant être créées sans invited_by spécifique
*/

-- Modifier la colonne invited_by pour permettre NULL
ALTER TABLE franchisee_invitations 
ALTER COLUMN invited_by DROP NOT NULL;

-- Mettre à jour le commentaire de la colonne
COMMENT ON COLUMN franchisee_invitations.invited_by IS 
'ID du profil qui a créé l''invitation. NULL si créé par un processus système.';
