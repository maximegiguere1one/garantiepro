/*
  # Create dealer_inventory table for dealer trailer management

  1. New Tables
    - `dealer_inventory`
      - `id` (uuid, primary key)
      - `dealer_id` (uuid, foreign key to profiles - the dealer managing this inventory)
      - `vin` (text, vehicle identification number - unique)
      - `make` (text, manufacturer)
      - `model` (text, model name)
      - `year` (integer, year of manufacture)
      - `trailer_type` (text, type of trailer)
      - `category` (text, category: fermee, ouverte, utilitaire)
      - `purchase_price` (numeric, what dealer paid)
      - `selling_price` (numeric, suggested selling price)
      - `quantity_in_stock` (integer, number available)
      - `status` (text, available/sold/reserved)
      - `notes` (text, optional notes)
      - `photo_urls` (jsonb, array of photo URLs)
      - `created_at` (timestamptz, auto-generated)
      - `updated_at` (timestamptz, auto-generated)

  2. Table Updates
    - Add `dealer_inventory_id` to `warranties` table to link sold trailers

  3. Security
    - Enable RLS on `dealer_inventory` table
    - Add policy for dealers (admin, f_and_i) to view their own inventory
    - Add policy for dealers to create their own inventory items
    - Add policy for dealers to update their own inventory items
    - Add policy for dealers to delete their own inventory items

  4. Indexes
    - Index on dealer_id for fast filtering
    - Index on vin for uniqueness and quick lookups
    - Index on status for filtering available items
*/

CREATE TABLE IF NOT EXISTS dealer_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vin text NOT NULL UNIQUE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  trailer_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('fermee', 'ouverte', 'utilitaire')),
  purchase_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  quantity_in_stock integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  notes text,
  photo_urls jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add dealer_inventory_id to warranties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'dealer_inventory_id'
  ) THEN
    ALTER TABLE warranties ADD COLUMN dealer_inventory_id uuid REFERENCES dealer_inventory(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE dealer_inventory ENABLE ROW LEVEL SECURITY;

-- Dealers can view their own inventory
CREATE POLICY "Dealers can view own inventory"
  ON dealer_inventory FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Dealers can create their own inventory items
CREATE POLICY "Dealers can create own inventory"
  ON dealer_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Dealers can update their own inventory items
CREATE POLICY "Dealers can update own inventory"
  ON dealer_inventory FOR UPDATE
  TO authenticated
  USING (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Dealers can delete their own inventory items
CREATE POLICY "Dealers can delete own inventory"
  ON dealer_inventory FOR DELETE
  TO authenticated
  USING (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_dealer_id ON dealer_inventory(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_vin ON dealer_inventory(vin);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_status ON dealer_inventory(status);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_category ON dealer_inventory(category);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dealer_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_dealer_inventory_updated_at ON dealer_inventory;
CREATE TRIGGER trigger_update_dealer_inventory_updated_at
  BEFORE UPDATE ON dealer_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_dealer_inventory_updated_at();