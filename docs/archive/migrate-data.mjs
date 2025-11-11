#!/usr/bin/env node
/**
 * Script de Migration de Données Supabase
 *
 * Ce script transfère toutes les données de votre ancien projet Supabase
 * vers votre nouveau projet.
 *
 * UTILISATION:
 * 1. Créez un fichier .env.migration avec vos anciennes clés:
 *    SOURCE_SUPABASE_URL=https://votre-ancien-projet.supabase.co
 *    SOURCE_SUPABASE_SERVICE_KEY=votre_ancienne_service_key
 *
 * 2. Exécutez: node migrate-data.mjs --dry-run
 *    (pour voir ce qui sera migré sans rien faire)
 *
 * 3. Exécutez: node migrate-data.mjs --execute
 *    (pour effectuer la migration réelle)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

// Charger les variables d'environnement manuellement
function loadEnv(filePath) {
  if (!existsSync(filePath)) return;

  const envContent = readFileSync(filePath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

// Charger les fichiers .env
loadEnv('.env');
loadEnv('.env.migration');

// =====================================
// CONFIGURATION
// =====================================
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_KEY;
const TARGET_URL = process.env.VITE_SUPABASE_URL;
const TARGET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

// =====================================
// VALIDATION
// =====================================
if (!SOURCE_URL || !SOURCE_KEY) {
  console.error('❌ ERREUR: Variables SOURCE non configurées');
  console.error('   Créez un fichier .env.migration avec:');
  console.error('   SOURCE_SUPABASE_URL=...');
  console.error('   SOURCE_SUPABASE_SERVICE_KEY=...');
  process.exit(1);
}

if (!TARGET_URL || !TARGET_KEY) {
  console.error('❌ ERREUR: Variables TARGET non configurées');
  console.error('   Vérifiez votre fichier .env');
  process.exit(1);
}

if (!DRY_RUN && !EXECUTE) {
  console.log('ℹ️  USAGE:');
  console.log('   node migrate-data.mjs --dry-run   (simulation)');
  console.log('   node migrate-data.mjs --execute   (migration réelle)');
  process.exit(0);
}

// =====================================
// CONNEXIONS
// =====================================
console.log('🔌 Connexion aux bases de données...\n');

const sourceDB = createClient(SOURCE_URL, SOURCE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const targetDB = createClient(TARGET_URL, TARGET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// =====================================
// STATISTIQUES
// =====================================
const stats = {
  profiles: { source: 0, migrated: 0, errors: 0 },
  customers: { source: 0, migrated: 0, errors: 0 },
  trailers: { source: 0, migrated: 0, errors: 0 },
  warranties: { source: 0, migrated: 0, errors: 0 },
  warranty_plans: { source: 0, migrated: 0, errors: 0 },
  warranty_options: { source: 0, migrated: 0, errors: 0 },
  payments: { source: 0, migrated: 0, errors: 0 },
  claims: { source: 0, migrated: 0, errors: 0 },
  claim_timeline: { source: 0, migrated: 0, errors: 0 },
  claim_attachments: { source: 0, migrated: 0, errors: 0 },
  organizations: { source: 0, migrated: 0, errors: 0 },
  company_settings: { source: 0, migrated: 0, errors: 0 },
  tax_rates: { source: 0, migrated: 0, errors: 0 },
  pricing_rules: { source: 0, migrated: 0, errors: 0 },
};

// =====================================
// FONCTIONS UTILITAIRES
// =====================================

async function countRecords(db, table) {
  try {
    const { count, error } = await db
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.warn(`⚠️  Table ${table} n'existe pas dans la source`);
    return 0;
  }
}

async function migrateTable(tableName, options = {}) {
  console.log(`\n📦 Migration de la table: ${tableName}`);

  try {
    // 1. Compter les enregistrements source
    const sourceCount = await countRecords(sourceDB, tableName);
    stats[tableName].source = sourceCount;

    if (sourceCount === 0) {
      console.log(`   ℹ️  Aucune donnée à migrer`);
      return;
    }

    console.log(`   📊 ${sourceCount} enregistrements trouvés`);

    // 2. Récupérer toutes les données
    const { data: sourceData, error: fetchError } = await sourceDB
      .from(tableName)
      .select('*');

    if (fetchError) throw fetchError;

    if (DRY_RUN) {
      console.log(`   ✅ [DRY-RUN] ${sourceData.length} enregistrements seraient migrés`);
      stats[tableName].migrated = sourceData.length;
      return;
    }

    // 3. Insérer dans la cible
    let migrated = 0;
    let errors = 0;

    // Insertion par lots de 100
    const batchSize = 100;
    for (let i = 0; i < sourceData.length; i += batchSize) {
      const batch = sourceData.slice(i, i + batchSize);

      const { error: insertError } = await targetDB
        .from(tableName)
        .upsert(batch, {
          onConflict: options.conflictColumns || 'id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error(`   ❌ Erreur batch ${i}-${i + batchSize}:`, insertError.message);
        errors += batch.length;
      } else {
        migrated += batch.length;
        process.stdout.write(`\r   ⏳ Progression: ${migrated}/${sourceData.length}`);
      }
    }

    console.log(`\n   ✅ ${migrated} enregistrements migrés avec succès`);

    if (errors > 0) {
      console.log(`   ⚠️  ${errors} erreurs rencontrées`);
    }

    stats[tableName].migrated = migrated;
    stats[tableName].errors = errors;

  } catch (error) {
    console.error(`   ❌ ERREUR:`, error.message);
    stats[tableName].errors++;
  }
}

// =====================================
// MIGRATION PRINCIPALE
// =====================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION DE DONNÉES SUPABASE                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE: SIMULATION (DRY-RUN)');
    console.log('   Aucune donnée ne sera modifiée\n');
  } else {
    console.log('⚡ MODE: EXÉCUTION RÉELLE');
    console.log('   Les données seront transférées!\n');
  }

  console.log('📍 SOURCE:', SOURCE_URL);
  console.log('📍 CIBLE:', TARGET_URL);
  console.log('\n' + '─'.repeat(60));

  // Test de connexion
  console.log('\n🔍 Test de connexion aux bases de données...');
  try {
    const { error: sourceError } = await sourceDB.from('profiles').select('count', { count: 'exact', head: true });
    if (sourceError && !sourceError.message.includes('does not exist')) throw sourceError;
    console.log('   ✅ Connexion SOURCE établie');

    const { error: targetError } = await targetDB.from('profiles').select('count', { count: 'exact', head: true });
    if (targetError && !targetError.message.includes('does not exist')) throw targetError;
    console.log('   ✅ Connexion CIBLE établie');
  } catch (error) {
    console.error('   ❌ Erreur de connexion:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('DÉMARRAGE DE LA MIGRATION');
  console.log('='.repeat(60));

  // ORDRE DE MIGRATION (important pour les clés étrangères)

  // 1. Tables de référence (sans dépendances)
  await migrateTable('organizations');
  await migrateTable('warranty_plans');
  await migrateTable('warranty_options');
  await migrateTable('tax_rates', { conflictColumns: 'province_code' });
  await migrateTable('pricing_rules');

  // 2. Utilisateurs et profils
  await migrateTable('profiles');

  // 3. Paramètres
  await migrateTable('company_settings');

  // 4. Clients
  await migrateTable('customers');

  // 5. Remorques (dépend de customers)
  await migrateTable('trailers', { conflictColumns: 'vin' });

  // 6. Garanties (dépend de customers, trailers, warranty_plans)
  await migrateTable('warranties', { conflictColumns: 'contract_number' });

  // 7. Paiements (dépend de warranties)
  await migrateTable('payments');

  // 8. Réclamations (dépend de warranties, customers)
  await migrateTable('claims', { conflictColumns: 'claim_number' });

  // 9. Timeline et attachments (dépendent de claims)
  await migrateTable('claim_timeline');
  await migrateTable('claim_attachments');

  // =====================================
  // RAPPORT FINAL
  // =====================================
  console.log('\n' + '='.repeat(60));
  console.log('RAPPORT DE MIGRATION');
  console.log('='.repeat(60) + '\n');

  let totalSource = 0;
  let totalMigrated = 0;
  let totalErrors = 0;

  console.log('Table                  | Source | Migré  | Erreurs');
  console.log('─'.repeat(60));

  for (const [table, stat] of Object.entries(stats)) {
    if (stat.source > 0 || stat.migrated > 0 || stat.errors > 0) {
      const sourceStr = String(stat.source).padEnd(6);
      const migratedStr = String(stat.migrated).padEnd(6);
      const errorsStr = String(stat.errors).padEnd(7);
      console.log(`${table.padEnd(22)} | ${sourceStr} | ${migratedStr} | ${errorsStr}`);

      totalSource += stat.source;
      totalMigrated += stat.migrated;
      totalErrors += stat.errors;
    }
  }

  console.log('─'.repeat(60));
  console.log(`${'TOTAL'.padEnd(22)} | ${String(totalSource).padEnd(6)} | ${String(totalMigrated).padEnd(6)} | ${String(totalErrors).padEnd(7)}`);
  console.log('═'.repeat(60) + '\n');

  if (DRY_RUN) {
    console.log('✅ SIMULATION TERMINÉE');
    console.log('   Pour effectuer la migration réelle:');
    console.log('   node migrate-data.mjs --execute\n');
  } else {
    if (totalErrors === 0) {
      console.log('🎉 MIGRATION RÉUSSIE!');
      console.log(`   ${totalMigrated} enregistrements transférés avec succès\n`);
    } else {
      console.log('⚠️  MIGRATION TERMINÉE AVEC ERREURS');
      console.log(`   ${totalMigrated} réussis, ${totalErrors} erreurs\n`);
    }
  }
}

// =====================================
// EXÉCUTION
// =====================================
main()
  .then(() => {
    console.log('✅ Script terminé\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ ERREUR FATALE:', error);
    process.exit(1);
  });
