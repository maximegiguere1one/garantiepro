import { useState, useEffect, useRef } from 'react';
import { PenTool, Save, Download, Trash2, Check } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  getSignatureStyles,
  getUserSignatures,
  generateTextSignature,
  saveSignature,
  setActiveSignature,
  deleteSignature,
  downloadSignature,
  type SignatureStyle,
  type EmployeeSignature,
} from '../../lib/signature-generator-utils';

export function SignatureGenerator() {
  const { profile, organization } = useAuth();
  const { showToast } = useToast();
  const [styles, setStyles] = useState<SignatureStyle[]>([]);
  const [signatures, setSignatures] = useState<EmployeeSignature[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<SignatureStyle | null>(null);
  const [fullName, setFullName] = useState('');
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      loadData();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedStyle && fullName) {
      generatePreview();
    }
  }, [selectedStyle, fullName]);

  const loadData = async () => {
    try {
      const [stylesData, signaturesData] = await Promise.all([
        getSignatureStyles(),
        profile?.user_id ? getUserSignatures(profile.id) : Promise.resolve([]),
      ]);
      setStyles(stylesData);
      setSignatures(signaturesData);
      if (stylesData.length > 0 && !selectedStyle) {
        setSelectedStyle(stylesData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generatePreview = () => {
    if (!selectedStyle || !fullName) return;
    try {
      const preview = generateTextSignature(fullName, selectedStyle);
      setPreviewData(preview);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const handleSave = async () => {
    if (!profile?.user_id || !organization?.id || !previewData || !selectedStyle) return;

    setLoading(true);
    try {
      await saveSignature({
        user_id: profile.id,
        organization_id: organization.id,
        full_name: fullName,
        signature_type: 'generated',
        signature_data: previewData,
        style_name: selectedStyle.style_name,
        is_active: signatures.length === 0,
        metadata: {},
      });

      showToast('Signature enregistrée avec succès', 'success');
      await loadData();
    } catch (error) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (signatureId: string) => {
    try {
      await setActiveSignature(signatureId);
      showToast('Signature activée', 'success');
      await loadData();
    } catch (error) {
      showToast('Erreur', 'error');
    }
  };

  const handleDelete = async (signatureId: string) => {
    if (!confirm('Supprimer cette signature ?')) return;
    try {
      await deleteSignature(signatureId);
      showToast('Signature supprimée', 'success');
      await loadData();
    } catch (error) {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
          <PenTool className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Générateur de signatures</h3>
          <p className="text-sm text-slate-600">Créez votre signature pour les documents</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-4">Votre nom</h4>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Votre nom complet"
            />
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-4">Choisir un style</h4>
            <div className="space-y-2">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedStyle?.id === style.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 bg-white hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{style.display_name}</span>
                    {selectedStyle?.id === style.id && (
                      <Check className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: style.font_family,
                      fontSize: '24px',
                      ...style.css_properties,
                    }}
                  >
                    {fullName || 'Aperçu'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-4">Aperçu</h4>
            <div className="bg-white rounded-lg border border-slate-200 p-6 min-h-[150px] flex items-center justify-center">
              {previewData ? (
                <img src={previewData} alt="Aperçu signature" className="max-w-full h-auto" />
              ) : (
                <p className="text-slate-400 text-sm">Entrez votre nom pour voir l'aperçu</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSave}
                loading={loading}
                disabled={!previewData}
                className="flex-1"
                leftIcon={<Save className="w-4 h-4" />}
              >
                Enregistrer
              </Button>
              {previewData && (
                <Button
                  variant="outline"
                  onClick={() => downloadSignature(previewData, `signature-${fullName}.png`)}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Télécharger
                </Button>
              )}
            </div>
          </div>

          {signatures.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Mes signatures</h4>
              <div className="space-y-3">
                {signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className={`bg-white rounded-lg border-2 p-4 ${
                      sig.is_active ? 'border-primary-500' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{sig.full_name}</span>
                      {sig.is_active && (
                        <span className="px-2 py-1 text-xs font-semibold bg-primary-100 text-primary-700 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <img src={sig.signature_data} alt="Signature" className="h-12 mb-3" />
                    <div className="flex gap-2">
                      {!sig.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(sig.id)}
                        >
                          Activer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(sig.id)}
                        leftIcon={<Trash2 className="w-3 h-3" />}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
