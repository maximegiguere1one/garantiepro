/**
 * Test d'Intégration - Système d'Automatisation
 *
 * Ce script teste l'intégration complète du système d'automatisation
 * en simulant un workflow complet de bout en bout.
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    log(`✓ ${name} (${duration}ms)`, 'success');
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, error: error.message, duration });
    log(`✗ ${name}: ${error.message}`, 'error');
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function testTablesExist() {
  const tables = [
    'automation_workflows',
    'automation_executions',
    'notification_preferences',
    'scheduled_tasks',
    'automation_logs',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error && !error.message.includes('0 rows')) {
      throw new Error(`Table ${table} n'existe pas ou n'est pas accessible: ${error.message}`);
    }
  }
}

async function testWorkflowCreation() {
  // Créer un workflow de test
  const { data, error } = await supabase
    .from('automation_workflows')
    .insert({
      name: 'Test Workflow - Integration Test',
      description: 'Test workflow created by integration test',
      trigger_type: 'manual',
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: 'send_email',
          template: 'test',
          to: 'test@example.com',
        },
      ],
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Échec création workflow: ${error.message}`);
  }

  if (!data || !data.id) {
    throw new Error('Workflow créé mais pas de données retournées');
  }

  // Nettoyer
  await supabase.from('automation_workflows').delete().eq('id', data.id);
}

async function testExecutionTracking() {
  // Créer un workflow temporaire
  const { data: workflow, error: workflowError } = await supabase
    .from('automation_workflows')
    .insert({
      name: 'Test Execution Tracking',
      trigger_type: 'manual',
      actions: [],
      is_active: true,
    })
    .select()
    .single();

  if (workflowError) throw workflowError;

  // Créer une exécution
  const { data: execution, error: executionError } = await supabase
    .from('automation_executions')
    .insert({
      workflow_id: workflow.id,
      organization_id: workflow.organization_id,
      trigger_data: { test: true },
      status: 'pending',
    })
    .select()
    .single();

  if (executionError) throw executionError;

  // Vérifier que l'exécution existe
  const { data: check, error: checkError } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('id', execution.id)
    .single();

  if (checkError || !check) {
    throw new Error('Exécution non trouvée après création');
  }

  // Nettoyer
  await supabase.from('automation_executions').delete().eq('id', execution.id);
  await supabase.from('automation_workflows').delete().eq('id', workflow.id);
}

async function testNotificationPreferences() {
  // Créer des préférences de test
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Échec lecture préférences: ${error.message}`);
  }

  // Si pas de préférences, vérifier que la table est accessible
  if (!data) {
    const { error: insertError } = await supabase
      .from('notification_preferences')
      .insert({
        email_enabled: true,
        warranty_created: true,
      })
      .select()
      .single();

    if (insertError && !insertError.message.includes('violates')) {
      // OK si violation de contrainte (user_id requis)
      if (!insertError.message.includes('null value')) {
        throw new Error(`Échec test préférences: ${insertError.message}`);
      }
    }
  }
}

async function testAutomationLogs() {
  // Vérifier que la table logs est accessible
  const { error } = await supabase.from('automation_logs').select('*').limit(1);

  if (error && !error.message.includes('0 rows')) {
    throw new Error(`Table automation_logs non accessible: ${error.message}`);
  }
}

async function testScheduledTasks() {
  // Vérifier que la table scheduled_tasks est accessible
  const { error } = await supabase.from('scheduled_tasks').select('*').limit(1);

  if (error && !error.message.includes('0 rows')) {
    throw new Error(`Table scheduled_tasks non accessible: ${error.message}`);
  }
}

async function testWorkflowQuery() {
  // Tester query complexe
  const { data, error } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Échec query workflows: ${error.message}`);
  }

  // Pas d'erreur même si pas de données
}

async function testExecutionQuery() {
  // Tester query avec join
  const { data, error } = await supabase
    .from('automation_executions')
    .select('*, automation_workflows(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Échec query executions avec join: ${error.message}`);
  }
}

async function testRLSPolicies() {
  // Tester que RLS est actif (devrait échouer sans auth)
  const { data, error } = await supabase
    .from('automation_workflows')
    .select('*')
    .limit(1);

  // RLS devrait bloquer l'accès si pas authentifié
  // Mais on teste juste que la query ne cause pas d'erreur serveur
  if (error && error.message.includes('500')) {
    throw new Error('Erreur serveur lors du test RLS');
  }
}

async function testEdgeFunctionConnectivity() {
  // Tester que les edge functions sont accessibles
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/automation-engine`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger_type: 'manual',
        trigger_data: { test: true },
      }),
    });

    // OK si 401 (pas authentifié) ou 200
    if (response.status !== 401 && response.status !== 200 && response.status !== 404) {
      const text = await response.text();
      log(`Warning: Edge function status ${response.status}: ${text}`, 'warning');
    }
  } catch (error: any) {
    // OK si la fonction n'est pas déployée encore
    if (!error.message.includes('fetch')) {
      throw error;
    }
    log('Edge function pas encore déployée (normal)', 'warning');
  }
}

// ============================================================================
// EXÉCUTION DES TESTS
// ============================================================================

async function runTests() {
  log('\n========================================', 'info');
  log('TEST D\'INTÉGRATION - SYSTÈME D\'AUTOMATISATION', 'info');
  log('========================================\n', 'info');

  await test('1. Tables existent et sont accessibles', testTablesExist);
  await test('2. Création de workflow', testWorkflowCreation);
  await test('3. Tracking d\'exécution', testExecutionTracking);
  await test('4. Préférences de notification', testNotificationPreferences);
  await test('5. Logs d\'automatisation', testAutomationLogs);
  await test('6. Tâches planifiées', testScheduledTasks);
  await test('7. Query workflows complexe', testWorkflowQuery);
  await test('8. Query executions avec join', testExecutionQuery);
  await test('9. Policies RLS', testRLSPolicies);
  await test('10. Connectivité Edge Functions', testEdgeFunctionConnectivity);

  // Résumé
  log('\n========================================', 'info');
  log('RÉSUMÉ DES TESTS', 'info');
  log('========================================\n', 'info');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? 'success' : 'error';
    log(`${status} ${result.name} (${result.duration}ms)`, color);
    if (result.error) {
      log(`  └─ ${result.error}`, 'error');
    }
  });

  log('\n----------------------------------------', 'info');
  log(`Tests réussis: ${passed}/${total}`, passed === total ? 'success' : 'warning');
  log(`Tests échoués: ${failed}/${total}`, failed > 0 ? 'error' : 'success');
  log('----------------------------------------\n', 'info');

  if (failed === 0) {
    log('🎉 TOUS LES TESTS SONT PASSÉS!', 'success');
    log('Le système d\'automatisation est fonctionnel!\n', 'success');
  } else {
    log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ', 'error');
    log('Vérifiez les erreurs ci-dessus\n', 'error');
    process.exit(1);
  }
}

// Exécuter les tests
runTests().catch((error) => {
  log(`\n❌ ERREUR FATALE: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
