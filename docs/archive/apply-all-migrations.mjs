import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrationsDir = join(__dirname, 'supabase', 'migrations');

async function applyMigration(filename) {
  const filepath = join(migrationsDir, filename);
  const sql = readFileSync(filepath, 'utf8');

  console.log(`Applying: ${filename}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ Error in ${filename}:`, error.message);
      return false;
    }

    console.log(`✅ Success: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception in ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migration process...\n');

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  // Skip first migration (already applied)
  const remainingFiles = files.slice(1);

  let successCount = 0;
  let errorCount = 0;

  for (const file of remainingFiles) {
    const success = await applyMigration(file);
    if (success) {
      successCount++;
    } else {
      errorCount++;
      // Continue on error for now
    }

    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total processed: ${remainingFiles.length}`);
}

main().catch(console.error);
