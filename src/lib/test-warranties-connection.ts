/**
 * Script de test pour vérifier la connexion et le chargement des garanties
 * Utilisez ce script dans la console du navigateur pour diagnostiquer les problèmes
 */

import { supabase } from './supabase';

export async function testWarrantiesConnection() {
  console.log('=== TEST CONNEXION GARANTIES ===\n');

  try {
    // Test 1: Connexion Supabase
    console.log('1️⃣ Test connexion Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('warranties')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Erreur connexion:', testError);
      return false;
    }
    console.log('✅ Connexion Supabase OK\n');

    // Test 2: Compter les garanties
    console.log('2️⃣ Test comptage garanties...');
    const { count, error: countError } = await supabase
      .from('warranties')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erreur comptage:', countError);
      return false;
    }
    console.log(`✅ ${count} garanties trouvées\n`);

    // Test 3: Charger une garantie
    console.log('3️⃣ Test chargement garantie...');
    const { data: warranty, error: warrantyError } = await supabase
      .from('warranties')
      .select(`
        id,
        contract_number,
        status,
        customers(first_name, last_name, email)
      `)
      .limit(1)
      .single();

    if (warrantyError) {
      console.error('❌ Erreur chargement:', warrantyError);
      return false;
    }
    console.log('✅ Garantie chargée:', warranty?.contract_number);
    console.log('   Client:', warranty?.customers);
    console.log('');

    // Test 4: Tester la fonction RPC
    console.log('4️⃣ Test fonction RPC get_warranties_optimized...');
    const rpcStart = performance.now();
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_warranties_optimized', {
        p_page: 1,
        p_page_size: 10,
        p_status_filter: 'all',
        p_search_query: ''
      });
    const rpcTime = performance.now() - rpcStart;

    if (rpcError) {
      console.error('❌ Erreur RPC:', rpcError);
      console.warn('   Ceci peut être normal si vous n\'êtes pas connecté');
      console.warn('   La fonction nécessite auth.uid() pour fonctionner');
    } else {
      console.log(`✅ RPC OK - ${rpcData?.length || 0} garanties en ${rpcTime.toFixed(0)}ms`);
    }
    console.log('');

    // Test 5: Vue matérialisée
    console.log('5️⃣ Test vue matérialisée...');
    const { data: viewData, error: viewError } = await supabase
      .from('warranty_list_view')
      .select('id, contract_number')
      .limit(5);

    if (viewError) {
      console.error('❌ Erreur vue:', viewError);
      return false;
    }
    console.log(`✅ Vue matérialisée OK - ${viewData?.length || 0} entrées`);
    console.log('');

    // Résumé
    console.log('=== RÉSUMÉ ===');
    console.log('✅ Tous les tests passés!');
    console.log(`📊 Total garanties: ${count}`);
    console.log(`⚡ Performance RPC: ${rpcTime.toFixed(0)}ms`);
    console.log('\nLe système est prêt! Vous pouvez maintenant charger la page des garanties.');

    return true;

  } catch (error) {
    console.error('❌ ERREUR CRITIQUE:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return false;
  }
}

// Rendre disponible globalement
if (typeof window !== 'undefined') {
  (window as any).testWarrantiesConnection = testWarrantiesConnection;
  console.log('💡 Test disponible! Tapez: testWarrantiesConnection()');
}
