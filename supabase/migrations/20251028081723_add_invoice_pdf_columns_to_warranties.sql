/*
  # Ajout des colonnes PDF de factures à la table warranties

  1. Nouvelles Colonnes
    - `customer_invoice_pdf_url` (text, nullable) - URL du PDF de facture client
    - `merchant_invoice_pdf_url` (text, nullable) - URL du PDF de facture marchand
  
  2. Sécurité
    - Aucun changement RLS nécessaire (colonnes ajoutées à une table existante avec RLS)
*/

-- Ajouter les colonnes de PDF de factures
ALTER TABLE warranties 
ADD COLUMN IF NOT EXISTS customer_invoice_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS merchant_invoice_pdf_url TEXT;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN warranties.customer_invoice_pdf_url IS 'URL du PDF de facture envoyé au client';
COMMENT ON COLUMN warranties.merchant_invoice_pdf_url IS 'URL du PDF de facture interne pour le marchand';
