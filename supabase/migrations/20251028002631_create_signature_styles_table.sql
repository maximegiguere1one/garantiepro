/*
  # Create signature_styles table - Oct 28, 2025
  
  Table for predefined signature styles used in the signature generator
*/

CREATE TABLE IF NOT EXISTS signature_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  font_family text NOT NULL,
  description text,
  preview_url text,
  css_properties jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE signature_styles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active signature styles
CREATE POLICY "Users can view active signature styles"
  ON signature_styles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow admins to manage signature styles
CREATE POLICY "Admins can manage signature styles"
  ON signature_styles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'super_admin', 'admin')
    )
  );

-- Insert default signature styles
INSERT INTO signature_styles (style_name, display_name, font_family, description, css_properties, display_order, is_active)
VALUES 
  (
    'elegant_script',
    'Élégant Script',
    'Brush Script MT, cursive',
    'Style d''écriture cursive élégante',
    '{"fontSize": "32px", "fontStyle": "italic", "letterSpacing": "1px"}',
    1,
    true
  ),
  (
    'professional_sans',
    'Professionnel Sans-Serif',
    'Arial, sans-serif',
    'Style moderne et professionnel',
    '{"fontSize": "28px", "fontWeight": "600", "letterSpacing": "0.5px"}',
    2,
    true
  ),
  (
    'classic_serif',
    'Classique Serif',
    'Times New Roman, serif',
    'Style traditionnel et formel',
    '{"fontSize": "30px", "fontWeight": "500"}',
    3,
    true
  ),
  (
    'modern_bold',
    'Moderne Gras',
    'Helvetica, Arial, sans-serif',
    'Style audacieux et contemporain',
    '{"fontSize": "32px", "fontWeight": "700", "letterSpacing": "0.5px"}',
    4,
    true
  ),
  (
    'handwritten',
    'Manuscrit',
    'Comic Sans MS, cursive',
    'Style d''écriture manuscrite décontractée',
    '{"fontSize": "28px", "fontStyle": "normal"}',
    5,
    true
  )
ON CONFLICT (style_name) DO NOTHING;

CREATE INDEX idx_signature_styles_active ON signature_styles(is_active);
CREATE INDEX idx_signature_styles_order ON signature_styles(display_order);