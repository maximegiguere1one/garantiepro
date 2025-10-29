/*
  # Système de Signatures Numériques des Employés

  ## Description
  Ce système permet aux employés et administrateurs de créer, gérer et utiliser leurs signatures numériques personnelles.
  Les signatures peuvent être créées de deux façons:
  - Générées à partir du texte tapé avec différents styles de polices cursives
  - Dessinées à la main via un pad de signature numérique

  ## Tables Créées

  ### `employee_signatures`
  Table principale pour stocker les signatures des employés avec métadonnées complètes.

  **Colonnes:**
  - `id` (uuid, PK) - Identifiant unique de la signature
  - `user_id` (uuid, FK -> auth.users) - Référence à l'utilisateur propriétaire
  - `organization_id` (uuid, FK -> organizations) - Organisation de l'employé
  - `full_name` (text) - Nom complet utilisé pour la signature
  - `signature_type` (enum) - Type: 'generated' (texte stylisé) ou 'drawn' (dessinée)
  - `signature_data` (text) - Données de la signature (base64 pour image ou SVG)
  - `style_name` (text, nullable) - Nom du style de police pour signatures générées
  - `is_active` (boolean) - Si cette signature est actuellement active pour l'utilisateur
  - `is_approved` (boolean) - Statut d'approbation par un administrateur
  - `approved_by` (uuid, nullable) - ID de l'admin qui a approuvé
  - `approved_at` (timestamptz, nullable) - Date/heure d'approbation
  - `metadata` (jsonb) - Métadonnées additionnelles (couleur, épaisseur, dimensions, etc.)
  - `created_at` (timestamptz) - Date de création
  - `updated_at` (timestamptz) - Date de dernière modification

  ### `signature_styles`
  Bibliothèque des styles de polices disponibles pour la génération de signatures.

  **Colonnes:**
  - `id` (uuid, PK) - Identifiant unique du style
  - `style_name` (text, unique) - Nom du style (ex: "elegant", "modern", "classic")
  - `display_name` (text) - Nom affiché à l'utilisateur
  - `font_family` (text) - Police CSS à utiliser
  - `description` (text) - Description du style
  - `preview_url` (text, nullable) - URL d'aperçu du style
  - `css_properties` (jsonb) - Propriétés CSS additionnelles
  - `is_active` (boolean) - Si le style est disponible
  - `display_order` (integer) - Ordre d'affichage dans la liste
  - `created_at` (timestamptz) - Date de création

  ## Sécurité (RLS)

  ### Politiques `employee_signatures`:
  - **Lecture**: Les utilisateurs voient uniquement leurs propres signatures + admins voient toutes les signatures de leur organisation
  - **Création**: Tout utilisateur authentifié peut créer sa signature dans son organisation
  - **Mise à jour**: Les utilisateurs peuvent modifier uniquement leurs propres signatures
  - **Suppression**: Les utilisateurs peuvent supprimer uniquement leurs propres signatures
  - **Approbation**: Seuls les admins peuvent approuver les signatures

  ### Politiques `signature_styles`:
  - **Lecture**: Accessible à tous les utilisateurs authentifiés
  - **Gestion**: Seuls les super_admin peuvent créer/modifier/supprimer des styles

  ## Index pour Performance
  - Index sur `user_id` pour recherches rapides par utilisateur
  - Index sur `organization_id` pour filtrage par organisation
  - Index composite sur (`user_id`, `is_active`) pour récupération signature active
  - Index sur `is_approved` pour filtrage des signatures approuvées
  - Index sur `signature_type` pour statistiques par type

  ## Données Initiales
  Insertion de 6 styles de signature prédéfinis:
  1. **Élégant** - Style cursif raffiné et professionnel
  2. **Moderne** - Style contemporain et épuré
  3. **Classique** - Style traditionnel intemporel
  4. **Artistique** - Style créatif et expressif
  5. **Formel** - Style sobre et officiel
  6. **Décontracté** - Style naturel et accessible

  ## Triggers
  - Trigger automatique pour `updated_at` sur modifications
  - Trigger pour désactiver anciennes signatures actives lors de l'activation d'une nouvelle
*/

-- Création de l'enum pour le type de signature
DO $$ BEGIN
  CREATE TYPE signature_type AS ENUM ('generated', 'drawn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Table principale des signatures d'employés
CREATE TABLE IF NOT EXISTS employee_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  signature_type signature_type NOT NULL DEFAULT 'generated',
  signature_data text NOT NULL,
  style_name text,
  is_active boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_signature_data CHECK (length(signature_data) > 0),
  CONSTRAINT style_required_for_generated CHECK (
    signature_type = 'drawn' OR (signature_type = 'generated' AND style_name IS NOT NULL)
  )
);

-- Table des styles de signature disponibles
CREATE TABLE IF NOT EXISTS signature_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  font_family text NOT NULL,
  description text NOT NULL,
  preview_url text,
  css_properties jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index pour performances optimales
CREATE INDEX IF NOT EXISTS idx_employee_signatures_user_id ON employee_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_signatures_organization_id ON employee_signatures(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_signatures_user_active ON employee_signatures(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_employee_signatures_approved ON employee_signatures(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_employee_signatures_type ON employee_signatures(signature_type);
CREATE INDEX IF NOT EXISTS idx_signature_styles_active ON signature_styles(is_active, display_order) WHERE is_active = true;

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_employee_signature_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_employee_signature_timestamp ON employee_signatures;
CREATE TRIGGER trigger_update_employee_signature_timestamp
  BEFORE UPDATE ON employee_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_signature_updated_at();

-- Fonction pour désactiver les anciennes signatures actives
CREATE OR REPLACE FUNCTION deactivate_other_signatures()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE employee_signatures
    SET is_active = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour désactivation automatique
DROP TRIGGER IF EXISTS trigger_deactivate_other_signatures ON employee_signatures;
CREATE TRIGGER trigger_deactivate_other_signatures
  BEFORE INSERT OR UPDATE OF is_active ON employee_signatures
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_other_signatures();

-- Enable RLS
ALTER TABLE employee_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour employee_signatures

-- Lecture: Utilisateur voit ses propres signatures + Admins voient toutes les signatures de leur org
CREATE POLICY "Users can view own signatures and admins view all org signatures"
  ON employee_signatures FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = employee_signatures.organization_id
        AND profiles.role IN ('super_admin', 'admin', 'franchisee_admin', 'master')
    )
  );

-- Création: Utilisateurs authentifiés peuvent créer leurs signatures
CREATE POLICY "Users can create own signatures"
  ON employee_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = employee_signatures.organization_id
    )
  );

-- Mise à jour: Utilisateurs peuvent modifier leurs propres signatures, admins peuvent approuver
CREATE POLICY "Users can update own signatures and admins can approve"
  ON employee_signatures FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = employee_signatures.organization_id
        AND profiles.role IN ('super_admin', 'admin', 'franchisee_admin', 'master')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = employee_signatures.organization_id
        AND profiles.role IN ('super_admin', 'admin', 'franchisee_admin', 'master')
    )
  );

-- Suppression: Utilisateurs peuvent supprimer leurs propres signatures
CREATE POLICY "Users can delete own signatures"
  ON employee_signatures FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies pour signature_styles

-- Lecture: Tous les utilisateurs authentifiés peuvent voir les styles actifs
CREATE POLICY "Anyone can view active signature styles"
  ON signature_styles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Gestion: Seuls les super_admin peuvent gérer les styles
CREATE POLICY "Super admins can manage signature styles"
  ON signature_styles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master')
    )
  );

-- Insertion des styles de signature prédéfinis
INSERT INTO signature_styles (style_name, display_name, font_family, description, css_properties, display_order, is_active) VALUES
  (
    'elegant',
    'Élégant',
    '''Brush Script MT'', ''Lucida Calligraphy'', cursive',
    'Style cursif raffiné et professionnel, parfait pour les documents formels',
    '{"fontSize": "32px", "fontWeight": "normal", "fontStyle": "italic", "letterSpacing": "1px"}'::jsonb,
    1,
    true
  ),
  (
    'modern',
    'Moderne',
    '''Segoe Script'', ''Comic Sans MS'', cursive',
    'Style contemporain et épuré avec une touche personnelle',
    '{"fontSize": "30px", "fontWeight": "600", "fontStyle": "normal", "letterSpacing": "0.5px"}'::jsonb,
    2,
    true
  ),
  (
    'classic',
    'Classique',
    '''Times New Roman'', ''Georgia'', serif',
    'Style traditionnel intemporel pour une signature distinguée',
    '{"fontSize": "28px", "fontWeight": "bold", "fontStyle": "italic", "letterSpacing": "0px"}'::jsonb,
    3,
    true
  ),
  (
    'artistic',
    'Artistique',
    '''Brush Script MT'', ''Edwardian Script ITC'', cursive',
    'Style créatif et expressif avec une touche artistique unique',
    '{"fontSize": "36px", "fontWeight": "normal", "fontStyle": "normal", "letterSpacing": "2px"}'::jsonb,
    4,
    true
  ),
  (
    'formal',
    'Formel',
    '''Garamond'', ''Palatino'', serif',
    'Style sobre et officiel pour les contextes professionnels',
    '{"fontSize": "26px", "fontWeight": "600", "fontStyle": "normal", "letterSpacing": "0px"}'::jsonb,
    5,
    true
  ),
  (
    'casual',
    'Décontracté',
    '''Bradley Hand'', ''Courier New'', monospace',
    'Style naturel et accessible, comme une signature manuscrite détendue',
    '{"fontSize": "28px", "fontWeight": "normal", "fontStyle": "normal", "letterSpacing": "1px"}'::jsonb,
    6,
    true
  )
ON CONFLICT (style_name) DO NOTHING;

-- Commentaires pour documentation
COMMENT ON TABLE employee_signatures IS 'Signatures numériques des employés - générées ou dessinées';
COMMENT ON TABLE signature_styles IS 'Bibliothèque des styles de polices disponibles pour génération de signatures';
COMMENT ON COLUMN employee_signatures.signature_type IS 'Type: generated (texte stylisé) ou drawn (dessinée à main)';
COMMENT ON COLUMN employee_signatures.signature_data IS 'Données signature: base64 pour image ou SVG/texte pour générée';
COMMENT ON COLUMN employee_signatures.is_approved IS 'Statut approbation admin requis selon politique organisation';
COMMENT ON COLUMN signature_styles.css_properties IS 'Propriétés CSS JSON: fontSize, fontWeight, fontStyle, letterSpacing, etc.';
