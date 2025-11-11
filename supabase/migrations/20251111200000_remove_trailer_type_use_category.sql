/*
  # Remove Duplicate trailer_type Column and Use Only category

  ## Changes

  This migration removes the redundant `trailer_type` column from the `trailers` table
  and ensures that all trailer classification uses the `category` field exclusively.

  The `category` field already exists with proper enum constraints:
  - 'fermee' (Remorque Fermée)
  - 'ouverte' (Remorque Ouverte)
  - 'utilitaire' (Remorque Utilitaire)

  ## Migration Steps

  1. Check if trailer_type column exists (safe for re-running)
  2. Copy any trailer_type data to category if needed (for safety)
  3. Drop the trailer_type column
  4. Verify category column has proper constraints

  ## Safety

  - Uses IF EXISTS checks for idempotency
  - Preserves existing data by mapping to category if needed
  - Maintains data integrity with existing category constraints
*/

DO $$
BEGIN
  -- Step 1: Check if trailer_type column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'trailers'
    AND column_name = 'trailer_type'
  ) THEN

    -- Step 2: For any rows where category might be null but trailer_type has data,
    -- map trailer_type to an appropriate category value
    -- This is a safety measure in case there's any data inconsistency
    UPDATE trailers
    SET category = CASE
      WHEN LOWER(trailer_type) LIKE '%enclosed%' OR LOWER(trailer_type) LIKE '%fermee%' THEN 'fermee'
      WHEN LOWER(trailer_type) LIKE '%open%' OR LOWER(trailer_type) LIKE '%ouverte%' OR LOWER(trailer_type) LIKE '%flatbed%' THEN 'ouverte'
      WHEN LOWER(trailer_type) LIKE '%utility%' OR LOWER(trailer_type) LIKE '%utilitaire%' THEN 'utilitaire'
      ELSE 'fermee'  -- Default to fermee if we can't determine
    END
    WHERE category IS NULL AND trailer_type IS NOT NULL;

    -- Step 3: Drop the trailer_type column
    ALTER TABLE trailers DROP COLUMN IF EXISTS trailer_type;

    RAISE NOTICE 'Successfully removed trailer_type column from trailers table';
  ELSE
    RAISE NOTICE 'trailer_type column does not exist, skipping migration';
  END IF;

  -- Step 4: Ensure category column has proper NOT NULL constraint and default
  -- (It should already have these from previous migrations, but we verify)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'trailers'
    AND column_name = 'category'
  ) THEN
    -- Ensure category is NOT NULL
    ALTER TABLE trailers
      ALTER COLUMN category SET NOT NULL,
      ALTER COLUMN category SET DEFAULT 'fermee';

    RAISE NOTICE 'Verified category column constraints';
  END IF;

END $$;

-- Drop any indexes that might exist on trailer_type
DROP INDEX IF EXISTS idx_trailers_trailer_type;

-- Verify the category index exists (created in previous migration)
CREATE INDEX IF NOT EXISTS idx_trailers_category ON trailers(category);

-- Comment on the category column for documentation
COMMENT ON COLUMN trailers.category IS 'Catégorie de remorque: fermee (Fermée), ouverte (Ouverte), ou utilitaire (Utilitaire). Remplace l''ancien champ trailer_type.';
