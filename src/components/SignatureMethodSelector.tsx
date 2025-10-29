import { useState } from 'react';
import { Monitor, PenTool, CheckCircle, ArrowRight, Info, Clock, Shield, MapPin } from 'lucide-react';

export type SignatureMethod = 'online' | 'in_person';

interface SignatureMethodSelectorProps {
  onSelect: (method: SignatureMethod) => void;
  onCancel: () => void;
  language?: 'fr' | 'en';
  recommendedMethod?: SignatureMethod;
}

export function SignatureMethodSelector({
  onSelect,
  onCancel,
  language = 'fr',
  recommendedMethod
}: SignatureMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<SignatureMethod | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const texts = {
    fr: {
      title: 'Comment souhaitez-vous signer votre contrat ?',
      subtitle: 'Choisissez la méthode qui vous convient le mieux',
      online: {
        title: 'Signature En Ligne',
        description: 'Signez numériquement depuis votre appareil',
        advantages: [
          'Signature immédiate, en quelques minutes',
          'Aucun déplacement nécessaire',
          'Documents envoyés par email instantanément',
          'Processus 100% sécurisé et légal',
          'Accessible 24/7 de n\'importe où'
        ],
        ideal: 'Idéal pour: Signature rapide et à distance'
      },
      inPerson: {
        title: 'Signature En Personne',
        description: 'Signez sur document papier en concession',
        advantages: [
          'Contact direct avec notre équipe',
          'Assistance personnalisée disponible',
          'Document physique signé de votre main',
          'Vérification d\'identité en présence',
          'Copie papier immédiate'
        ],
        ideal: 'Idéal pour: Préférence pour le papier et assistance'
      },
      recommended: 'Recommandé pour vous',
      continue: 'Continuer avec cette méthode',
      compare: 'Comparer les deux méthodes',
      backToChoice: 'Retour au choix',
      cancel: 'Annuler',
      comparisonTitle: 'Comparaison des méthodes',
      features: 'Fonctionnalités',
      duration: 'Durée',
      durationOnline: '5-8 minutes',
      durationInPerson: '15-20 minutes',
      location: 'Lieu',
      locationOnline: 'Depuis chez vous',
      locationInPerson: 'À la concession',
      validity: 'Validité légale',
      validityBoth: '100% valide et conforme',
      documents: 'Documents',
      documentsOnline: 'Email instantané',
      documentsInPerson: 'Copie papier + Email',
      assistance: 'Assistance',
      assistanceOnline: 'Guide intégré',
      assistanceInPerson: 'Personnel sur place'
    },
    en: {
      title: 'How would you like to sign your contract?',
      subtitle: 'Choose the method that works best for you',
      online: {
        title: 'Online Signature',
        description: 'Sign digitally from your device',
        advantages: [
          'Immediate signature in minutes',
          'No travel required',
          'Documents sent by email instantly',
          '100% secure and legal process',
          'Accessible 24/7 from anywhere'
        ],
        ideal: 'Ideal for: Quick and remote signing'
      },
      inPerson: {
        title: 'In-Person Signature',
        description: 'Sign on paper at the dealership',
        advantages: [
          'Direct contact with our team',
          'Personalized assistance available',
          'Physical document signed by hand',
          'Identity verification in presence',
          'Immediate paper copy'
        ],
        ideal: 'Ideal for: Paper preference and assistance'
      },
      recommended: 'Recommended for you',
      continue: 'Continue with this method',
      compare: 'Compare both methods',
      backToChoice: 'Back to choice',
      cancel: 'Cancel',
      comparisonTitle: 'Method Comparison',
      features: 'Features',
      duration: 'Duration',
      durationOnline: '5-8 minutes',
      durationInPerson: '15-20 minutes',
      location: 'Location',
      locationOnline: 'From home',
      locationInPerson: 'At dealership',
      validity: 'Legal validity',
      validityBoth: '100% valid and compliant',
      documents: 'Documents',
      documentsOnline: 'Instant email',
      documentsInPerson: 'Paper copy + Email',
      assistance: 'Assistance',
      assistanceOnline: 'Built-in guide',
      assistanceInPerson: 'Staff on site'
    }
  };

  const t = texts[language];

  const handleSelect = (method: SignatureMethod) => {
    setSelectedMethod(method);
  };

  const handleConfirm = () => {
    if (selectedMethod) {
      onSelect(selectedMethod);
    }
  };

  if (showComparison) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-primary-50 to-indigo-50">
            <h2 className="text-2xl font-bold text-slate-900">{t.comparisonTitle}</h2>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Feature Labels */}
              <div className="space-y-4 py-3">
                <div className="h-12 flex items-center font-semibold text-slate-700">
                  {t.features}
                </div>
                <div className="h-12 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-slate-500" />
                  {t.duration}
                </div>
                <div className="h-12 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-slate-500" />
                  {t.location}
                </div>
                <div className="h-12 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-slate-500" />
                  {t.validity}
                </div>
                <div className="h-12 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-slate-500" />
                  {t.documents}
                </div>
                <div className="h-12 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-slate-500" />
                  {t.assistance}
                </div>
              </div>

              {/* Online Column */}
              <div className="space-y-4 bg-primary-50 rounded-lg p-3">
                <div className="h-12 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary-600" />
                    <span className="font-bold text-primary-900">{t.online.title}</span>
                  </div>
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.durationOnline}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.locationOnline}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-center text-slate-700">
                  {t.validityBoth}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.documentsOnline}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.assistanceOnline}
                </div>
              </div>

              {/* In-Person Column */}
              <div className="space-y-4 bg-green-50 rounded-lg p-3">
                <div className="h-12 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-primary-600" />
                    <span className="font-bold text-green-900">{t.inPerson.title}</span>
                  </div>
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.durationInPerson}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.locationInPerson}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-center text-slate-700">
                  {t.validityBoth}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.documentsInPerson}
                </div>
                <div className="h-12 flex items-center justify-center text-sm text-slate-700">
                  {t.assistanceInPerson}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setShowComparison(false)}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t.backToChoice}
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-primary-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h2>
          <p className="text-sm text-slate-600">{t.subtitle}</p>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Online Signature Card */}
            <div
              onClick={() => handleSelect('online')}
              className={`
                relative border-2 rounded-xl p-6 cursor-pointer transition-all duration-200
                ${selectedMethod === 'online'
                  ? 'border-primary-500 bg-primary-50 shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:border-primary-300 hover:shadow-md'
                }
              `}
            >
              {recommendedMethod === 'online' && (
                <div className="absolute top-3 right-3 bg-primary-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  {t.recommended}
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className={`
                  p-3 rounded-lg
                  ${selectedMethod === 'online' ? 'bg-primary-600' : 'bg-primary-100'}
                `}>
                  <Monitor className={`w-8 h-8 ${selectedMethod === 'online' ? 'text-white' : 'text-primary-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {t.online.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {t.online.description}
                  </p>
                </div>
                {selectedMethod === 'online' && (
                  <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                )}
              </div>

              <div className="space-y-2 mb-4">
                {t.online.advantages.map((advantage, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{advantage}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600 italic">
                  {t.online.ideal}
                </p>
              </div>
            </div>

            {/* In-Person Signature Card */}
            <div
              onClick={() => handleSelect('in_person')}
              className={`
                relative border-2 rounded-xl p-6 cursor-pointer transition-all duration-200
                ${selectedMethod === 'in_person'
                  ? 'border-primary-500 bg-green-50 shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:border-green-300 hover:shadow-md'
                }
              `}
            >
              {recommendedMethod === 'in_person' && (
                <div className="absolute top-3 right-3 bg-primary-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  {t.recommended}
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className={`
                  p-3 rounded-lg
                  ${selectedMethod === 'in_person' ? 'bg-primary-600' : 'bg-green-100'}
                `}>
                  <PenTool className={`w-8 h-8 ${selectedMethod === 'in_person' ? 'text-white' : 'text-primary-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {t.inPerson.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {t.inPerson.description}
                  </p>
                </div>
                {selectedMethod === 'in_person' && (
                  <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                )}
              </div>

              <div className="space-y-2 mb-4">
                {t.inPerson.advantages.map((advantage, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{advantage}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600 italic">
                  {t.inPerson.ideal}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowComparison(true)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium underline flex items-center gap-1"
            >
              <Info className="w-4 h-4" />
              {t.compare}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMethod}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all
              ${selectedMethod
                ? selectedMethod === 'online'
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'
                  : 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {t.continue}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
