import { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface BulkEmailModalProps {
  selectedOrganizations: Array<{ id: string; name: string; billing_email: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkEmailModal({ selectedOrganizations, onClose, onSuccess }: BulkEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const templates = [
    {
      name: 'Rappel de formation',
      subject: 'Formation obligatoire - Action requise',
      message: `Bonjour,\n\nNous vous rappelons qu'une formation obligatoire est planifiée prochainement.\n\nMerci de confirmer votre présence.\n\nCordialement,`
    },
    {
      name: 'Mise à jour système',
      subject: 'Nouvelle mise à jour de la plateforme',
      message: `Bonjour,\n\nNous avons déployé une nouvelle mise à jour avec des fonctionnalités améliorées.\n\nConsultez les notes de version pour plus de détails.\n\nCordialement,`
    },
    {
      name: 'Rappel quota',
      subject: 'Quota mensuel - Rappel',
      message: `Bonjour,\n\nNous constatons que votre quota mensuel approche de sa limite.\n\nContactez-nous pour ajuster vos paramètres si nécessaire.\n\nCordialement,`
    }
  ];

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      let successCount = 0;
      let failCount = 0;

      for (const org of selectedOrganizations) {
        try {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1e293b;">${subject}</h2>
              </div>
              <div style="padding: 20px; line-height: 1.6; color: #475569;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <div style="border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>Cet email a été envoyé à ${org.name}</p>
              </div>
            </div>
          `;

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: org.billing_email,
                subject,
                html: emailHtml,
                body: message,
              }),
            }
          );

          if (response.ok) {
            successCount++;

            await supabase.from('organization_communications').insert({
              organization_id: org.id,
              type: 'email',
              subject,
              content: message,
              sent_by: user?.id,
              status: 'sent',
            });
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          console.error(`Error sending to ${org.name}:`, error);
        }
      }

      if (successCount > 0) {
        showToast(
          `${successCount} email(s) envoyé(s) avec succès${failCount > 0 ? `, ${failCount} échec(s)` : ''}`,
          failCount > 0 ? 'warning' : 'success'
        );
        onSuccess();
        onClose();
      } else {
        showToast('Erreur lors de l\'envoi des emails', 'error');
      }
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      showToast('Erreur lors de l\'envoi des emails', 'error');
    } finally {
      setSending(false);
    }
  };

  const loadTemplate = (template: typeof templates[0]) => {
    setSubject(template.subject);
    setMessage(template.message);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Envoi d'email groupé</h2>
              <p className="text-sm text-slate-600 mt-1">
                {selectedOrganizations.length} destinataire{selectedOrganizations.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Templates rapides
            </label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => loadTemplate(template)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sujet *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de l'email"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contenu de l'email..."
              rows={12}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-2">Destinataires:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedOrganizations.map(org => (
                <span key={org.id} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm">
                  {org.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Envoi en cours...' : `Envoyer (${selectedOrganizations.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
