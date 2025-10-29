/*
  # Create customer_products table for self-service product management

  1. New Tables
    - `customer_products`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `vin` (text, vehicle identification number)
      - `make` (text, manufacturer)
      - `model` (text, model name)
      - `year` (integer, year of manufacture)
      - `trailer_type` (text, type of trailer)
      - `category` (text, category: fermee, ouverte, utilitaire)
      - `purchase_date` (date, when purchased)
      - `purchase_price` (numeric, purchase price)
      - `manufacturer_warranty_end_date` (date, when manufacturer warranty ends)
      - `notes` (text, optional customer notes)
      - `created_at` (timestamptz, auto-generated)
      - `updated_at` (timestamptz, auto-generated)

  2. Security
    - Enable RLS on `customer_products` table
    - Add policy for customers to read their own products
    - Add policy for customers to create their own products
    - Add policy for customers to update their own products
    - Add policy for customers to delete their own products
    - Add policy for staff (admin, f_and_i, operations) to read all products
*/

CREATE TABLE IF NOT EXISTS customer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vin text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  trailer_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('fermee', 'ouverte', 'utilitaire')),
  purchase_date date NOT NULL,
  purchase_price numeric NOT NULL,
  manufacturer_warranty_end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own products"
  ON customer_products FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create own products"
  ON customer_products FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update own products"
  ON customer_products FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can delete own products"
  ON customer_products FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all products"
  ON customer_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE INDEX IF NOT EXISTS idx_customer_products_customer_id ON customer_products(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_vin ON customer_products(vin);