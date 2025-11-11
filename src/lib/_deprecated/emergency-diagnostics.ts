import { supabase } from './supabase';

// Script de diagnostic d'urgence
export async function emergencyDiagnostics() {
  console.log('%c🚨 EMERGENCY DIAGNOSTICS - Finding Root Cause', 'font-size: 18px; color: red; font-weight: bold');
  console.log('Starting comprehensive diagnostics...\n');

  const results: any[] = [];

  // Test 1: Basic connection
  console.log('%c1️⃣ Testing basic Supabase connection...', 'color: blue; font-weight: bold');
  try {
    const start = performance.now();
    const { data: { user }, error } = await supabase.auth.getUser();
    const time = performance.now() - start;

    if (error) {
      console.error('❌ Auth check failed:', error.message);
      results.push({ test: 'Auth', status: 'FAIL', error: error.message, time });
    } else if (!user) {
      console.warn('⚠️ No user authenticated');
      results.push({ test: 'Auth', status: 'NO_USER', time });
    } else {
      console.log('✅ User authenticated:', user.email, `(${time.toFixed(0)}ms)`);
      results.push({ test: 'Auth', status: 'OK', user: user.email, time });
    }
  } catch (e: any) {
    console.error('❌ Auth exception:', e.message);
    results.push({ test: 'Auth', status: 'EXCEPTION', error: e.message });
  }

  // Test 2: Profile check
  console.log('\n%c2️⃣ Checking user profile...', 'color: blue; font-weight: bold');
  try {
    const start = performance.now();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role, organization_id')
      .limit(1)
      .maybeSingle();
    const time = performance.now() - start;

    if (error) {
      console.error('❌ Profile query failed:', error.message);
      console.error('Error details:', error);
      results.push({ test: 'Profile', status: 'FAIL', error: error.message, code: error.code, time });
    } else if (!profile) {
      console.warn('⚠️ No profile found');
      results.push({ test: 'Profile', status: 'NO_DATA', time });
    } else {
      console.log('✅ Profile found:', profile, `(${time.toFixed(0)}ms)`);
      results.push({ test: 'Profile', status: 'OK', profile, time });
    }
  } catch (e: any) {
    console.error('❌ Profile exception:', e.message);
    results.push({ test: 'Profile', status: 'EXCEPTION', error: e.message });
  }

  // Test 3: Simple warranty count
  console.log('\n%c3️⃣ Counting warranties (simple query)...', 'color: blue; font-weight: bold');
  try {
    const start = performance.now();
    const { count, error } = await supabase
      .from('warranties')
      .select('id', { count: 'exact', head: true });
    const time = performance.now() - start;

    if (error) {
      console.error('❌ Warranty count failed:', error.message);
      console.error('Error details:', error);
      results.push({ test: 'Warranty Count', status: 'FAIL', error: error.message, code: error.code, time });
    } else {
      console.log(`✅ Found ${count} warranties (${time.toFixed(0)}ms)`);
      results.push({ test: 'Warranty Count', status: 'OK', count, time });
    }
  } catch (e: any) {
    console.error('❌ Warranty count exception:', e.message);
    results.push({ test: 'Warranty Count', status: 'EXCEPTION', error: e.message });
  }

  // Test 4: Simple warranty fetch (without joins)
  console.log('\n%c4️⃣ Fetching warranties (no joins)...', 'color: blue; font-weight: bold');
  try {
    const start = performance.now();
    const { data, error } = await supabase
      .from('warranties')
      .select('id, contract_number, status')
      .limit(5);
    const time = performance.now() - start;

    if (error) {
      console.error('❌ Warranty fetch failed:', error.message);
      console.error('Error details:', error);
      results.push({ test: 'Warranty Fetch', status: 'FAIL', error: error.message, code: error.code, time });
    } else if (!data || data.length === 0) {
      console.warn('⚠️ No warranties found (table might be empty)');
      results.push({ test: 'Warranty Fetch', status: 'EMPTY', time });
    } else {
      console.log(`✅ Fetched ${data.length} warranties (${time.toFixed(0)}ms)`);
      console.log('Sample:', data[0]);
      results.push({ test: 'Warranty Fetch', status: 'OK', count: data.length, time });
    }
  } catch (e: any) {
    console.error('❌ Warranty fetch exception:', e.message);
    results.push({ test: 'Warranty Fetch', status: 'EXCEPTION', error: e.message });
  }

  // Test 5: RPC function call
  console.log('\n%c5️⃣ Testing RPC function...', 'color: blue; font-weight: bold');
  try {
    const start = performance.now();
    const { data, error } = await supabase.rpc('get_warranties_optimized', {
      p_page: 1,
      p_page_size: 5,
      p_status_filter: 'all',
      p_search_query: '',
    });
    const time = performance.now() - start;

    if (error) {
      console.error('❌ RPC function failed:', error.message);
      console.error('Error details:', error);
      results.push({ test: 'RPC Function', status: 'FAIL', error: error.message, code: error.code, hint: error.hint, time });
    } else if (!data || data.length === 0) {
      console.warn('⚠️ RPC returned no data');
      results.push({ test: 'RPC Function', status: 'EMPTY', time });
    } else {
      console.log(`✅ RPC returned ${data.length} records (${time.toFixed(0)}ms)`);
      console.log('Sample:', data[0]);
      results.push({ test: 'RPC Function', status: 'OK', count: data.length, time });
    }
  } catch (e: any) {
    console.error('❌ RPC exception:', e.message);
    results.push({ test: 'RPC Function', status: 'EXCEPTION', error: e.message });
  }

  // Test 6: Materialized view access
  console.log('\n%c6️⃣ Testing materialized view access...', 'color: blue; font-weight: bold');
  try {
    const start = performance.now();
    const { data, error } = await supabase
      .from('warranty_list_view' as any)
      .select('id, contract_number')
      .limit(5);
    const time = performance.now() - start;

    if (error) {
      console.error('❌ Materialized view access failed:', error.message);
      console.error('Error details:', error);
      results.push({ test: 'Materialized View', status: 'FAIL', error: error.message, code: error.code, time });
    } else if (!data || data.length === 0) {
      console.warn('⚠️ Materialized view is empty');
      results.push({ test: 'Materialized View', status: 'EMPTY', time });
    } else {
      console.log(`✅ Materialized view accessible with ${data.length} records (${time.toFixed(0)}ms)`);
      results.push({ test: 'Materialized View', status: 'OK', count: data.length, time });
    }
  } catch (e: any) {
    console.error('❌ Materialized view exception:', e.message);
    results.push({ test: 'Materialized View', status: 'EXCEPTION', error: e.message });
  }

  // Summary
  console.log('\n%c📊 DIAGNOSTICS SUMMARY', 'font-size: 16px; color: purple; font-weight: bold');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAIL' || r.status === 'EXCEPTION').length;
  const warnings = results.filter(r => r.status === 'NO_USER' || r.status === 'NO_DATA' || r.status === 'EMPTY').length;

  results.forEach((r, i) => {
    const icon = r.status === 'OK' ? '✅' : r.status.includes('FAIL') || r.status.includes('EXCEPTION') ? '❌' : '⚠️';
    console.log(`${icon} Test ${i + 1}: ${r.test} - ${r.status}${r.time ? ` (${r.time.toFixed(0)}ms)` : ''}`);
    if (r.error) {
      console.log(`   └─ Error: ${r.error}`);
      if (r.code) console.log(`   └─ Code: ${r.code}`);
      if (r.hint) console.log(`   └─ Hint: ${r.hint}`);
    }
  });

  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed} | ⚠️ Warnings: ${warnings}`);

  // Root cause analysis
  console.log('\n%c🔍 ROOT CAUSE ANALYSIS', 'font-size: 16px; color: orange; font-weight: bold');

  if (results[0].status !== 'OK') {
    console.error('🔴 CRITICAL: User not authenticated or auth failed');
    console.log('👉 ACTION: Check if user is logged in. Redirect to login if needed.');
  } else if (results[1].status === 'FAIL') {
    console.error('🔴 CRITICAL: Profile table inaccessible');
    console.log('👉 ACTION: Check RLS policies on profiles table');
    console.log('👉 ACTION: Verify user has a profile record');
  } else if (results[2].status === 'FAIL') {
    console.error('🔴 CRITICAL: Cannot access warranties table');
    console.log('👉 ACTION: Check RLS policies on warranties table');
    console.log('👉 ACTION: Verify user has organization_id set');
  } else if (results[3].status === 'EMPTY') {
    console.warn('🟡 WARNING: Warranties table is empty');
    console.log('👉 ACTION: This is expected if no warranties created yet');
  } else if (results[4].status === 'FAIL') {
    console.error('🔴 CRITICAL: RPC function not working');
    console.log('👉 ACTION: Check if get_warranties_optimized function exists');
    console.log('👉 ACTION: Check function permissions');
    console.log('👉 ACTION: System will use fallback query automatically');
  } else if (results[5].status === 'FAIL') {
    console.warn('🟡 WARNING: Materialized view not accessible');
    console.log('👉 ACTION: RPC function might fail, but fallback will work');
  } else {
    console.log('🟢 All critical tests passed!');
    console.log('👉 If warranties still not loading, check browser Network tab for actual request errors');
  }

  console.log('\n%cCopy this entire log and send to support if issue persists', 'color: red; font-weight: bold');

  return results;
}

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).emergencyDiagnostics = emergencyDiagnostics;
  console.log('%c🚨 Emergency Diagnostics Loaded!', 'color: red; font-weight: bold; font-size: 14px');
  console.log('Run: %cemergencyDiagnostics()', 'color: orange; font-weight: bold; font-size: 14px');
}
