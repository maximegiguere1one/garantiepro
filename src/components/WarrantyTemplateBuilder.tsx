import { FileText, AlertCircle } from 'lucide-react';

export function WarrantyTemplateBuilder() {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Fonctionnalité temporairement désactivée
          </h2>
          <p className="text-slate-700 mb-4">
            Le système de modèles de documents est en cours de mise à jour pour améliorer les performances et la fiabilité.
          </p>
          <div className="bg-white rounded-lg p-4 mt-6 text-left">
            <p className="text-sm text-slate-600 mb-2">
              <strong>En attendant :</strong>
            </p>
            <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
              <li>Les garanties utilisent le modèle par défaut optimisé</li>
              <li>Tous les PDF de garantie sont générés automatiquement</li>
              <li>Les contrats incluent toutes les informations légales requises</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500 mt-6">
            Cette fonctionnalité sera réactivée prochainement avec des améliorations.
          </p>
        </div>
      </div>
    </div>
  );
}

// Code original conservé pour référence - sera réactivé après la mise à jour du schéma
/*
const loadTemplates = async () => {
  try {
    // Note: Ancien code utilisait dealer_id, maintenant organization_id
    const { data, error } = await supabase
      .from('warranty_templates')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setTemplates(data || []);
  } catch (error) {
    console.error('Error loading templates:', error);
  }
};

const loadDefaultSections = async () => {
  try {
    // Note: Colonne is_default n'existe plus dans warranty_template_sections
    const { data, error } = await supabase
      .from('warranty_template_sections')
      .select('*')
      .order('section_order');

    if (error) throw error;
    setDefaultSections(data || []);
  } catch (error) {
    console.error('Error loading default sections:', error);
  }
};

*/
