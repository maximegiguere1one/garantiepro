import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, X, AlertCircle, CheckCircle, Loader2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  parseExcelFile,
  parseCSVFile,
  validateInventoryRow,
  importInventoryItems,
  generateExcelTemplate,
  type ImportResult,
  type InventoryImportRow,
} from '../lib/inventory-import-utils';

interface BulkInventoryImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export function BulkInventoryImport({ onClose, onImportComplete }: BulkInventoryImportProps) {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validatedData, setValidatedData] = useState<ImportResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    successful: number;
    failed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      alert('Format de fichier non supporté. Veuillez utiliser Excel (.xlsx, .xls) ou CSV (.csv)');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      let data: any[];
      if (fileExtension === '.csv') {
        data = await parseCSVFile(selectedFile);
      } else {
        data = await parseExcelFile(selectedFile);
      }

      const validated = data.map((row, index) => validateInventoryRow(row, index + 1));
      setValidatedData(validated);
      setShowPreview(true);
    } catch (error: any) {
      alert(`Erreur lors de la lecture du fichier: ${error.message}`);
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!profile?.id) {
      alert('Erreur: Impossible de trouver votre profil');
      return;
    }

    const validItems = validatedData
      .filter((result) => result.success && result.data)
      .map((result) => result.data as InventoryImportRow);

    if (validItems.length === 0) {
      alert('Aucune donnée valide à importer');
      return;
    }

    setImporting(true);

    try {
      const summary = await importInventoryItems(validItems, profile.id);
      setImportSummary(summary);
      setImportComplete(true);

      if (summary.successful > 0) {
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (error: any) {
      alert(`Erreur lors de l'importation: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    generateExcelTemplate();
  };

  const validCount = validatedData.filter((r) => r.success).length;
  const errorCount = validatedData.filter((r) => !r.success).length;

  if (importComplete && importSummary) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Importation terminée!</h2>
            <p className="text-slate-600 mb-6">Vos remorques ont été ajoutées à l'inventaire</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Total</p>
                <p className="text-3xl font-bold text-slate-900">{importSummary.total}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-sm text-emerald-600 mb-1">Réussi</p>
                <p className="text-3xl font-bold text-emerald-600">{importSummary.successful}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-red-600 mb-1">Échoué</p>
                <p className="text-3xl font-bold text-red-600">{importSummary.failed}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Importation en masse</h2>
            <p className="text-sm text-slate-600 mt-1">
              Importez plusieurs remorques à la fois via Excel ou CSV
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!showPreview ? (
            <>
              <div className="mb-6">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Télécharger le modèle Excel
                </button>
                <p className="text-sm text-slate-600 mt-2">
                  Utilisez ce modèle pour formater vos données correctement
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                  isDragging
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {parsing ? (
                  <div>
                    <Loader2 className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-spin" />
                    <p className="text-lg font-medium text-slate-900 mb-2">
                      Analyse du fichier en cours...
                    </p>
                    <p className="text-slate-600">Veuillez patienter</p>
                  </div>
                ) : file ? (
                  <div>
                    <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-900 mb-2">{file.name}</p>
                    <button
                      onClick={() => {
                        setFile(null);
                        setValidatedData([]);
                        setShowPreview(false);
                      }}
                      className="text-sm text-slate-600 hover:text-slate-900"
                    >
                      Choisir un autre fichier
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-900 mb-2">
                      Glissez-déposez votre fichier ici
                    </p>
                    <p className="text-slate-600 mb-4">ou</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Parcourir les fichiers
                    </button>
                    <p className="text-sm text-slate-500 mt-4">
                      Formats acceptés: Excel (.xlsx, .xls) ou CSV (.csv)
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary-900 mb-2">
                      Format du fichier Excel/CSV:
                    </p>
                    <ul className="text-sm text-primary-800 space-y-1">
                      <li>• <strong>vin:</strong> Numéro d'identification du véhicule (unique)</li>
                      <li>• <strong>make:</strong> Marque de la remorque</li>
                      <li>• <strong>model:</strong> Modèle de la remorque</li>
                      <li>• <strong>year:</strong> Année de fabrication</li>
                      <li>• <strong>trailer_type:</strong> Type (ex: Cargo, Utilitaire)</li>
                      <li>• <strong>category:</strong> fermee, ouverte ou utilitaire</li>
                      <li>• <strong>purchase_price:</strong> Prix d'achat</li>
                      <li>• <strong>selling_price:</strong> Prix de vente</li>
                      <li>• <strong>quantity_in_stock:</strong> Quantité en stock</li>
                      <li>• <strong>status:</strong> available, sold ou reserved</li>
                      <li>• <strong>notes:</strong> Notes optionnelles</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    Aperçu des données ({validatedData.length} lignes)
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      {validCount} valides
                    </span>
                    {errorCount > 0 && (
                      <span className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {errorCount} erreurs
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setFile(null);
                    setValidatedData([]);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Choisir un autre fichier
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Ligne</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">NIV</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Marque</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Modèle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Année</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {validatedData.map((result) => (
                      <tr
                        key={result.row}
                        className={result.success ? 'bg-white' : 'bg-red-50'}
                      >
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            {result.row}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {result.data?.vin || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {result.data?.make || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {result.data?.model || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {result.data?.year || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {result.success ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Valide
                            </span>
                          ) : (
                            <div>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Erreur
                              </span>
                              <div className="text-xs text-red-600 mt-1">
                                {result.errors.join(', ')}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setFile(null);
                    setValidatedData([]);
                  }}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={importing}
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Importation en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Importer {validCount} remorque{validCount > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>

              {errorCount > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 mb-1">
                        {errorCount} ligne{errorCount > 1 ? 's' : ''} contient des erreurs
                      </p>
                      <p className="text-sm text-red-700">
                        Ces lignes seront ignorées lors de l'importation. Corrigez les erreurs dans votre fichier et réimportez si nécessaire.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
