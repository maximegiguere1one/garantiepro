/*
  # Create Onboarding and Feedback System

  1. New Tables
    - `user_onboarding_progress`
      - Tracks user progress through onboarding checklist
      - Records completion of key tasks
      - Stores celebration/badge unlocks

    - `user_feedback`
      - Collects contextual feedback from users
      - Links to specific features/pages
      - Stores sentiment and category

    - `help_articles`
      - FAQ and help content
      - Searchable and categorizable
      - Role-based visibility

    - `feature_requests`
      - User suggestions and feature requests
      - Voting system for prioritization
      - Status tracking (proposed, planned, in_progress, completed)

  2. Security
    - Enable RLS on all new tables
    - Users can only see/edit their own progress and feedback
    - Help articles are public
    - Feature requests are visible to all but editable by admins only
*/

-- User Onboarding Progress Table
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Progress tracking
  has_completed_profile boolean DEFAULT false,
  has_created_first_warranty boolean DEFAULT false,
  has_viewed_dashboard boolean DEFAULT false,
  has_explored_settings boolean DEFAULT false,
  has_created_customer boolean DEFAULT false,
  has_used_search boolean DEFAULT false,
  has_viewed_analytics boolean DEFAULT false,
  has_completed_tour boolean DEFAULT false,

  -- Completion metrics
  total_steps integer DEFAULT 8,
  completed_steps integer DEFAULT 0,
  completion_percentage integer DEFAULT 0,

  -- Badges/Achievements
  badges_earned jsonb DEFAULT '[]'::jsonb,
  last_celebration_shown_at timestamptz,

  -- Timestamps
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, organization_id)
);

-- User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Feedback details
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'improvement', 'question', 'praise', 'other')),
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  category text, -- e.g., 'warranties', 'claims', 'settings', 'performance'

  -- Context
  page_url text,
  page_title text,
  user_agent text,

  -- Content
  subject text NOT NULL,
  message text NOT NULL,
  screenshot_url text,

  -- Response tracking
  status text DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'responded', 'resolved', 'closed')),
  admin_response text,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Help Articles Table
CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Article details
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL,
  excerpt text,

  -- Organization
  category text NOT NULL, -- e.g., 'getting_started', 'warranties', 'claims', 'settings'
  subcategory text,
  tags text[] DEFAULT ARRAY[]::text[],

  -- Visibility
  is_published boolean DEFAULT true,
  required_role text, -- If set, only visible to users with this role or higher

  -- Engagement metrics
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,

  -- SEO
  meta_description text,

  -- Management
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(slug)
);

-- Feature Requests Table
CREATE TABLE IF NOT EXISTS feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Request details
  title text NOT NULL,
  description text NOT NULL,
  category text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Status tracking
  status text DEFAULT 'proposed' CHECK (status IN ('proposed', 'under_review', 'planned', 'in_progress', 'completed', 'declined')),
  status_updated_at timestamptz DEFAULT now(),

  -- Voting
  vote_count integer DEFAULT 0,

  -- Admin response
  admin_notes text,
  estimated_completion_date date,
  completed_at timestamptz,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feature Request Votes Table
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id uuid REFERENCES feature_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  created_at timestamptz DEFAULT now(),

  UNIQUE(feature_request_id, user_id)
);

-- Help Article Views Table (for analytics)
CREATE TABLE IF NOT EXISTS help_article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES help_articles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  viewed_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_article_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_onboarding_progress
CREATE POLICY "Users can view own onboarding progress"
  ON user_onboarding_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON user_onboarding_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
  ON user_onboarding_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback in their organization"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'master')
    )
  );

CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update feedback in their organization"
  ON user_feedback FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'master')
    )
  );

-- RLS Policies for help_articles
CREATE POLICY "Everyone can view published articles"
  ON help_articles FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Admins can manage help articles"
  ON help_articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'master')
    )
  );

-- RLS Policies for feature_requests
CREATE POLICY "Users can view feature requests in their organization"
  ON feature_requests FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own feature requests"
  ON feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update feature requests in their organization"
  ON feature_requests FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'master')
    )
  );

-- RLS Policies for feature_request_votes
CREATE POLICY "Users can view votes in their organization"
  ON feature_request_votes FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own votes"
  ON feature_request_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON feature_request_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for help_article_views
CREATE POLICY "Users can insert article views"
  ON help_article_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_onboarding_progress_user_id ON user_onboarding_progress(user_id);
CREATE INDEX idx_user_onboarding_progress_organization_id ON user_onboarding_progress(organization_id);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_organization_id ON user_feedback(organization_id);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_help_articles_category ON help_articles(category);
CREATE INDEX idx_help_articles_slug ON help_articles(slug);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_organization_id ON feature_requests(organization_id);
CREATE INDEX idx_feature_request_votes_feature_request_id ON feature_request_votes(feature_request_id);

-- Function to update onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completed_steps := (
    (CASE WHEN NEW.has_completed_profile THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_created_first_warranty THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_viewed_dashboard THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_explored_settings THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_created_customer THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_used_search THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_viewed_analytics THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_completed_tour THEN 1 ELSE 0 END)
  );

  NEW.completion_percentage := ROUND((NEW.completed_steps::float / NEW.total_steps::float) * 100);
  NEW.last_activity_at := now();

  -- Mark as completed if all steps done
  IF NEW.completed_steps = NEW.total_steps AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for onboarding progress
DROP TRIGGER IF EXISTS update_onboarding_progress_trigger ON user_onboarding_progress;
CREATE TRIGGER update_onboarding_progress_trigger
  BEFORE INSERT OR UPDATE ON user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress();

-- Function to update feature request vote count
CREATE OR REPLACE FUNCTION update_feature_request_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_requests
    SET vote_count = vote_count + 1
    WHERE id = NEW.feature_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_requests
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.feature_request_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for feature request votes
DROP TRIGGER IF EXISTS update_feature_request_vote_count_trigger ON feature_request_votes;
CREATE TRIGGER update_feature_request_vote_count_trigger
  AFTER INSERT OR DELETE ON feature_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_request_vote_count();

-- Function to auto-fill organization_id
CREATE OR REPLACE FUNCTION auto_fill_organization_id_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-filling organization_id
DROP TRIGGER IF EXISTS auto_fill_organization_id_onboarding_trigger ON user_onboarding_progress;
CREATE TRIGGER auto_fill_organization_id_onboarding_trigger
  BEFORE INSERT ON user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id_onboarding();

DROP TRIGGER IF EXISTS auto_fill_organization_id_feedback_trigger ON user_feedback;
CREATE TRIGGER auto_fill_organization_id_feedback_trigger
  BEFORE INSERT ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id_onboarding();

DROP TRIGGER IF EXISTS auto_fill_organization_id_feature_request_trigger ON feature_requests;
CREATE TRIGGER auto_fill_organization_id_feature_request_trigger
  BEFORE INSERT ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id_onboarding();

DROP TRIGGER IF EXISTS auto_fill_organization_id_feature_vote_trigger ON feature_request_votes;
CREATE TRIGGER auto_fill_organization_id_feature_vote_trigger
  BEFORE INSERT ON feature_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id_onboarding();

-- Insert default help articles
INSERT INTO help_articles (title, slug, content, excerpt, category, is_published) VALUES
(
  'Bienvenue dans Pro-Remorque',
  'bienvenue',
  E'# Bienvenue dans Pro-Remorque!\n\nVotre système de gestion de garanties est maintenant prêt à l''emploi.\n\n## Premiers pas\n\n1. Complétez votre profil\n2. Configurez les paramètres de votre entreprise\n3. Créez votre première garantie\n\n## Besoin d''aide?\n\nN''hésitez pas à explorer notre centre d''aide ou à nous contacter.',
  'Guide de démarrage rapide pour les nouveaux utilisateurs',
  'getting_started',
  true
),
(
  'Comment créer une garantie',
  'creer-garantie',
  E'# Créer une garantie\n\n## Étapes\n\n1. Cliquez sur "Nouvelle Garantie" dans le menu\n2. Remplissez les informations du client\n3. Saisissez les détails du véhicule (VIN, marque, modèle)\n4. Choisissez le plan de garantie\n5. Vérifiez les calculs automatiques\n6. Signez électroniquement\n7. Téléchargez les documents\n\n## Conseils\n\n- Le VIN est validé automatiquement\n- Les taxes sont calculées selon votre province\n- Tous les documents sont générés en temps réel',
  'Guide étape par étape pour créer une garantie',
  'warranties',
  true
),
(
  'Gérer les réclamations',
  'gerer-reclamations',
  E'# Gérer les réclamations\n\n## Processus\n\n1. Les clients soumettent via QR code ou formulaire\n2. Vous recevez une notification\n3. Examinez les pièces jointes\n4. Approuvez ou refusez avec justification\n5. Une lettre de décision est générée automatiquement\n\n## Statuts\n\n- **Soumise**: En attente d''examen\n- **En révision**: Sous analyse\n- **Approuvée**: Acceptée, en cours de traitement\n- **Refusée**: Rejetée avec raison\n- **Résolue**: Complétée',
  'Comment traiter les réclamations de garantie',
  'claims',
  true
)
ON CONFLICT (slug) DO NOTHING;