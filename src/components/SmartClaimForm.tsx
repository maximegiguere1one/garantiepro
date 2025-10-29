import { useState, useEffect } from 'react';
import { FileText, Calendar, AlertCircle, Camera, Mic, Loader2 } from 'lucide-react';
import { SmartFormField } from './common/SmartFormField';
import { useFormState } from '../hooks/useFormState';
import { getRecentValues } from '../lib/form-auto-complete';

interface SmartClaimFormProps {
  customerId?: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const INCIDENT_TEMPLATES = [
  {
    label: 'Dommage mécanique',
    description: 'Le [composant] a cessé de fonctionner le [date]. Symptômes observés: [description des symptômes]. La remorque a parcouru [kilométrage] km.',
  },
  {
    label: 'Dommage accidentel',
    description: 'Accident survenu le [date] à [lieu]. Circonstances: [description]. Dommages visibles sur: [parties endommagées].',
  },
  {
    label: 'Défaut de fabrication',
    description: 'Problème détecté avec [composant]. Le défaut semble être d\'origine car [raison]. Aucun choc ou mauvaise utilisation.',
  },
  {
    label: 'Problème électrique',
    description: 'Système électrique défaillant. Problèmes avec: [systèmes affectés]. Début des symptômes: [date/circonstances].',
  },
];

export function SmartClaimForm({ customerId, onSubmit, onCancel }: SmartClaimFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [useVoiceInput, setUseVoiceInput] = useState(false);
  const [listening, setListening] = useState(false);

  const { values, setValue, reset } = useFormState({
    initialValues: {
      warranty_id: '',
      incident_date: new Date().toISOString().split('T')[0],
      incident_description: '',
      repair_shop_name: '',
      repair_shop_contact: '',
      estimated_cost: '',
    },
    storageKey: `claim_draft_${customerId}`,
    autoSaveInterval: 30000,
  });

  const applyTemplate = (template: typeof INCIDENT_TEMPLATES[0]) => {
    setValue('incident_description', template.description);
  };

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'fr-CA';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setValue('incident_description', values.incident_description + ' ' + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
      };

      recognition.start();
    }
  };

  const handleQuickDateSelect = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    setValue('incident_date', date.toISOString().split('T')[0]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      reset();
    } catch (error) {
      console.error('Error submitting claim:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-50 to-cyan-50 border-2 border-primary-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-primary-900 mb-2">Soumission rapide</h3>
            <p className="text-sm text-primary-800 mb-3">
              Cette réclamation sera traitée dans les 48 heures ouvrables
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickDateSelect(0)}
                className="px-3 py-1.5 bg-white border border-primary-300 text-primary-700 rounded-lg text-sm hover:bg-primary-50 transition-colors"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect(1)}
                className="px-3 py-1.5 bg-white border border-primary-300 text-primary-700 rounded-lg text-sm hover:bg-primary-50 transition-colors"
              >
                Hier
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect(7)}
                className="px-3 py-1.5 bg-white border border-primary-300 text-primary-700 rounded-lg text-sm hover:bg-primary-50 transition-colors"
              >
                Il y a 7 jours
              </button>
            </div>
          </div>
        </div>
      </div>

      <SmartFormField
        label="Date de l'incident"
        name="incident_date"
        type="date"
        value={values.incident_date}
        onChange={(v) => setValue('incident_date', v)}
        required
        max={new Date().toISOString().split('T')[0]}
        icon={<Calendar className="w-4 h-4" />}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Description de l'incident <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
              <button
                type="button"
                onClick={startVoiceInput}
                disabled={listening}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  listening
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Mic className="w-4 h-4" />
                {listening ? 'En écoute...' : 'Voix'}
              </button>
            )}
          </div>
        </div>

        {INCIDENT_TEMPLATES.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-600 mb-2">Modèles rapides:</p>
            <div className="flex flex-wrap gap-2">
              {INCIDENT_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 transition-colors"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={values.incident_description}
          onChange={(e) => setValue('incident_description', e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all resize-none"
          placeholder="Décrivez ce qui s'est passé: quand, où, comment, quels dommages..."
          required
        />

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{values.incident_description.length} caractères</span>
          <span>Minimum recommandé: 50 caractères</span>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-medium text-slate-700 mb-3">Garage de réparation (optionnel)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SmartFormField
            label="Nom du garage"
            name="repair_shop_name"
            value={values.repair_shop_name}
            onChange={(v) => setValue('repair_shop_name', v)}
            placeholder="Garage Mécanique Pro"
            recentValues={getRecentValues('repair_shop_name')}
          />
          <SmartFormField
            label="Contact"
            name="repair_shop_contact"
            type="tel"
            value={values.repair_shop_contact}
            onChange={(v) => setValue('repair_shop_contact', v)}
            placeholder="(514) 555-0123"
          />
        </div>
      </div>

      <SmartFormField
        label="Estimation des réparations (optionnel)"
        name="estimated_cost"
        type="number"
        value={values.estimated_cost}
        onChange={(v) => setValue('estimated_cost', v)}
        placeholder="0.00"
        hint="Si vous avez déjà une estimation du garage"
      />

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !values.incident_description || values.incident_description.length < 20}
          className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi...
            </>
          ) : (
            'Soumettre la réclamation'
          )}
        </button>
      </div>
    </div>
  );
}
