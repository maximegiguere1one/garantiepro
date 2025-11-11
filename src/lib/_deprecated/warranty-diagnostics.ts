import { supabase } from './supabase';

export interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export class WarrantyDiagnostics {
  async runFullDiagnostics(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    results.push(await this.checkDatabaseConnection());
    results.push(await this.checkMaterializedView());
    results.push(await this.checkRPCFunction());
    results.push(await this.checkWarrantyCount());
    results.push(await this.checkUserPermissions());
    results.push(await this.testOptimizedQuery());
    results.push(await this.testFallbackQuery());

    return results;
  }

  private async checkDatabaseConnection(): Promise<DiagnosticResult> {
    try {
      const { error } = await supabase.from('warranties').select('id').limit(1);

      if (error) {
        return {
          name: 'Database Connection',
          status: 'error',
          message: `Connection failed: ${error.message}`,
        };
      }

      return {
        name: 'Database Connection',
        status: 'success',
        message: 'Successfully connected to database',
      };
    } catch (error: any) {
      return {
        name: 'Database Connection',
        status: 'error',
        message: `Connection error: ${error.message}`,
      };
    }
  }

  private async checkMaterializedView(): Promise<DiagnosticResult> {
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: "SELECT COUNT(*) as count FROM warranty_list_view;"
      }).single();

      if (error) {
        const { data: viewData, error: viewError } = await supabase
          .from('warranty_list_view' as any)
          .select('id')
          .limit(1);

        if (viewError) {
          return {
            name: 'Materialized View',
            status: 'error',
            message: `View not accessible: ${viewError.message}`,
          };
        }

        return {
          name: 'Materialized View',
          status: 'success',
          message: 'Materialized view exists and is accessible',
          details: { canQuery: true },
        };
      }

      return {
        name: 'Materialized View',
        status: 'success',
        message: `View exists with ${data?.count || 0} records`,
        details: data,
      };
    } catch (error: any) {
      return {
        name: 'Materialized View',
        status: 'warning',
        message: 'Could not verify view status',
        details: error.message,
      };
    }
  }

  private async checkRPCFunction(): Promise<DiagnosticResult> {
    try {
      const { data, error } = await supabase.rpc('get_warranties_optimized', {
        p_page: 1,
        p_page_size: 1,
        p_status_filter: 'all',
        p_search_query: '',
      });

      if (error) {
        return {
          name: 'RPC Function',
          status: 'error',
          message: `Function error: ${error.message}`,
          details: { code: error.code, hint: error.hint },
        };
      }

      return {
        name: 'RPC Function',
        status: 'success',
        message: `Function works, returned ${data?.length || 0} records`,
      };
    } catch (error: any) {
      return {
        name: 'RPC Function',
        status: 'error',
        message: `Function call failed: ${error.message}`,
      };
    }
  }

  private async checkWarrantyCount(): Promise<DiagnosticResult> {
    try {
      const { count, error } = await supabase
        .from('warranties')
        .select('id', { count: 'exact', head: true });

      if (error) {
        return {
          name: 'Warranty Count',
          status: 'error',
          message: `Count query failed: ${error.message}`,
        };
      }

      return {
        name: 'Warranty Count',
        status: count === 0 ? 'warning' : 'success',
        message: `Found ${count || 0} warranties in database`,
        details: { count },
      };
    } catch (error: any) {
      return {
        name: 'Warranty Count',
        status: 'error',
        message: `Query failed: ${error.message}`,
      };
    }
  }

  private async checkUserPermissions(): Promise<DiagnosticResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          name: 'User Permissions',
          status: 'error',
          message: 'No authenticated user found',
        };
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        return {
          name: 'User Permissions',
          status: 'error',
          message: `Profile query failed: ${error.message}`,
        };
      }

      return {
        name: 'User Permissions',
        status: 'success',
        message: `User authenticated with role: ${profile?.role || 'unknown'}`,
        details: { role: profile?.role, hasOrganization: !!profile?.organization_id },
      };
    } catch (error: any) {
      return {
        name: 'User Permissions',
        status: 'error',
        message: `Permission check failed: ${error.message}`,
      };
    }
  }

  private async testOptimizedQuery(): Promise<DiagnosticResult> {
    const startTime = performance.now();

    try {
      const { data, error } = await supabase.rpc('get_warranties_optimized', {
        p_page: 1,
        p_page_size: 10,
        p_status_filter: 'all',
        p_search_query: '',
      });

      const executionTime = performance.now() - startTime;

      if (error) {
        return {
          name: 'Optimized Query Test',
          status: 'error',
          message: `Query failed: ${error.message}`,
          details: { executionTime: `${executionTime.toFixed(2)}ms` },
        };
      }

      const status = executionTime < 500 ? 'success' : executionTime < 2000 ? 'warning' : 'error';

      return {
        name: 'Optimized Query Test',
        status,
        message: `Query completed in ${executionTime.toFixed(2)}ms`,
        details: { records: data?.length || 0, executionTime: `${executionTime.toFixed(2)}ms` },
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        name: 'Optimized Query Test',
        status: 'error',
        message: `Query exception: ${error.message}`,
        details: { executionTime: `${executionTime.toFixed(2)}ms` },
      };
    }
  }

  private async testFallbackQuery(): Promise<DiagnosticResult> {
    const startTime = performance.now();

    try {
      const { data, error, count } = await supabase
        .from('warranties')
        .select(`
          id,
          contract_number,
          status,
          customers!inner(first_name, last_name, email),
          trailers!inner(vin, make, model)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10);

      const executionTime = performance.now() - startTime;

      if (error) {
        return {
          name: 'Fallback Query Test',
          status: 'error',
          message: `Query failed: ${error.message}`,
          details: { executionTime: `${executionTime.toFixed(2)}ms` },
        };
      }

      const status = executionTime < 1000 ? 'success' : executionTime < 3000 ? 'warning' : 'error';

      return {
        name: 'Fallback Query Test',
        status,
        message: `Query completed in ${executionTime.toFixed(2)}ms`,
        details: { records: data?.length || 0, total: count, executionTime: `${executionTime.toFixed(2)}ms` },
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        name: 'Fallback Query Test',
        status: 'error',
        message: `Query exception: ${error.message}`,
        details: { executionTime: `${executionTime.toFixed(2)}ms` },
      };
    }
  }

  async printDiagnostics(): Promise<void> {
    console.log('%c=== WARRANTY SYSTEM DIAGNOSTICS ===', 'font-weight: bold; font-size: 16px; color: #4F46E5');

    const results = await this.runFullDiagnostics();

    results.forEach((result) => {
      const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      const color = result.status === 'success' ? '#10B981' : result.status === 'warning' ? '#F59E0B' : '#EF4444';

      console.log(`\n%c${icon} ${result.name}`, `color: ${color}; font-weight: bold`);
      console.log(`   ${result.message}`);

      if (result.details) {
        console.log('   Details:', result.details);
      }
    });

    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log('\n%c=== SUMMARY ===', 'font-weight: bold; font-size: 14px');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errorCount === 0 && warningCount === 0) {
      console.log('%c\n🎉 All systems operational!', 'color: #10B981; font-weight: bold; font-size: 16px');
    } else if (errorCount > 0) {
      console.log('%c\n⚠️ Critical issues detected. Check errors above.', 'color: #EF4444; font-weight: bold; font-size: 14px');
    } else {
      console.log('%c\n⚠️ System functional but with warnings.', 'color: #F59E0B; font-weight: bold; font-size: 14px');
    }
  }
}

export const warrantyDiagnostics = new WarrantyDiagnostics();

if (typeof window !== 'undefined') {
  (window as any).runWarrantyDiagnostics = () => warrantyDiagnostics.printDiagnostics();
  console.log('%cWarranty Diagnostics Available!', 'color: #4F46E5; font-weight: bold');
  console.log('Run: %crunWarrantyDiagnostics()', 'color: #10B981; font-weight: bold');
}
