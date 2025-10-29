import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { runAllWarrantyFormTests } from '../lib/warranty-form-test';

interface TestResult {
  suite: string;
  total: number;
  passed: number;
}

interface OverallResults {
  success: boolean;
  totalTests: number;
  totalPassed: number;
  results: TestResult[];
}

export function WarrantyFormTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<OverallResults | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string>('');

  const handleRunTests = () => {
    setIsRunning(true);
    setConsoleOutput('');

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    let output = '';

    console.log = (...args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      output += message + '\n';
      originalLog(...args);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      output += '❌ ' + message + '\n';
      originalError(...args);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      output += '⚠️ ' + message + '\n';
      originalWarn(...args);
    };

    try {
      const testResults = runAllWarrantyFormTests();
      setResults(testResults);
      setConsoleOutput(output);
    } catch (error) {
      console.error('Erreur lors de l\'exécution des tests:', error);
      setConsoleOutput(output);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: number, total: number) => {
    if (passed === total) {
      return <CheckCircle className="w-5 h-5 text-primary-600" />;
    } else if (passed > 0) {
      return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (passed: number, total: number) => {
    if (passed === total) return 'bg-green-50 border-green-200';
    if (passed > 0) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Test du Formulaire de Création de Garantie
            </h1>
            <p className="text-slate-600">
              Vérifiez que toutes les validations fonctionnent correctement avant de créer des garanties
            </p>
          </div>
          <FileText className="w-12 h-12 text-primary-600" />
        </div>

        <div className="mb-8">
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
              ${isRunning
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 hover:shadow-lg active:scale-95'
              }
              text-white
            `}
          >
            <Play className="w-5 h-5" />
            {isRunning ? 'Tests en cours...' : 'Lancer tous les tests'}
          </button>
        </div>

        {results && (
          <div className="space-y-6">
            <div className={`
              p-6 rounded-xl border-2 transition-all
              ${results.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
              }
            `}>
              <div className="flex items-start gap-4">
                {results.success ? (
                  <CheckCircle className="w-8 h-8 text-primary-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold mb-2 ${
                    results.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {results.success ? 'Tous les tests sont passés!' : 'Certains tests ont échoué'}
                  </h2>
                  <p className={`text-lg ${
                    results.success ? 'text-primary-700' : 'text-red-700'
                  }`}>
                    {results.totalPassed} / {results.totalTests} tests réussis
                    ({Math.round((results.totalPassed / results.totalTests) * 100)}%)
                  </p>
                  {results.success && (
                    <p className="text-primary-700 mt-2">
                      Le formulaire de création de garantie est prêt à être utilisé.
                      Toutes les validations fonctionnent correctement.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900">Détails des tests</h3>

              {results.results.map((result, index) => (
                <div
                  key={index}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${getStatusColor(result.passed, result.total)}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.passed, result.total)}
                      <div>
                        <h4 className="font-semibold text-slate-900">{result.suite}</h4>
                        <p className="text-sm text-slate-600">
                          {result.passed} / {result.total} tests passés
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">
                        {Math.round((result.passed / result.total) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <details className="bg-slate-50 rounded-lg border border-slate-200">
                <summary className="px-4 py-3 cursor-pointer font-medium text-slate-900 hover:bg-slate-100 transition-colors rounded-lg">
                  Afficher la sortie console complète
                </summary>
                <div className="p-4 border-t border-slate-200">
                  <pre className="text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap bg-white p-4 rounded border border-slate-200 max-h-96 overflow-y-auto">
                    {consoleOutput}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        )}

        {!results && !isRunning && (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-lg">Cliquez sur "Lancer tous les tests" pour commencer</p>
            <p className="text-sm mt-2">Les tests vérifieront toutes les validations du formulaire</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <h4 className="font-semibold text-primary-900 mb-2">Ce qui est testé:</h4>
          <ul className="text-sm text-primary-800 space-y-1">
            <li>✓ Validation des informations client (nom, email, téléphone, adresse)</li>
            <li>✓ Validation des informations remorque (VIN, marque, modèle, prix)</li>
            <li>✓ Validation des données de signature électronique</li>
            <li>✓ Validation de l'organisation et du plan de garantie</li>
            <li>✓ Validation complète avant et après signature</li>
            <li>✓ Gestion des erreurs et avertissements</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
