import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import {
  PrimaryButton,
  SecondaryButton,
  EnhancedInputField,
  KPICard,
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardContent,
  EnhancedCardFooter,
  useEnhancedToast,
} from './ui';
import {
  Plus,
  Search,
  Download,
  TrendingUp,
  DollarSign,
  Shield,
  Users,
  FileText,
  CheckCircle
} from 'lucide-react';

export function UIV2Demo() {
  const t = useTranslation();
  const toast = useEnhancedToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePrimaryAction = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Votre action a été exécutée avec succès!', {
        description: t('common.status.success'),
      });
    }, 2000);
  };

  const handleToastDemo = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: 'Garantie créée avec succès!',
      error: 'Une erreur est survenue lors de la création',
      warning: 'Veuillez vérifier les informations saisies',
      info: 'Nouveau message reçu'
    };

    const message = messages[type];
    const description = t(`common.status.${type}`);

    if (type === 'error') {
      toast.error(message, {
        description,
        action: {
          label: 'Réessayer',
          onClick: () => console.log('Retry clicked'),
        }
      });
    } else {
      toast[type](message, { description });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      {/* Header Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-neutral-900">
          Composants UI V2 - Pro-Remorque
        </h1>
        <p className="text-lg text-neutral-600">
          Démonstration des nouveaux composants professionnels avec design system modernisé
        </p>
      </div>

      {/* KPI Cards Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Cartes KPI</h2>
          <p className="text-neutral-600">Tableaux de bord avec indicateurs clés de performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title={t('dashboard.kpis.revenue.title')}
            value="127,450 $"
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: 12.5, isPositive: true }}
            subtitle={t('dashboard.kpis.revenue.thisMonth')}
            variant="primary"
          />

          <KPICard
            title={t('dashboard.kpis.warranties.title')}
            value="234"
            icon={<Shield className="w-5 h-5" />}
            trend={{ value: 8.3, isPositive: true }}
            subtitle="Actives ce mois"
            variant="secondary"
          />

          <KPICard
            title={t('dashboard.kpis.claims.title')}
            value="12"
            icon={<FileText className="w-5 h-5" />}
            trend={{ value: -5.2, isPositive: false }}
            subtitle="En attente de traitement"
            variant="warning"
          />

          <KPICard
            title="Clients"
            value="892"
            icon={<Users className="w-5 h-5" />}
            trend={{ value: 15.8, isPositive: true }}
            subtitle="Clients actifs"
            variant="success"
          />
        </div>
      </section>

      {/* Buttons Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Boutons</h2>
          <p className="text-neutral-600">Boutons primaires et secondaires avec états de chargement</p>
        </div>

        <EnhancedCard>
          <EnhancedCardHeader
            title="Actions principales"
            subtitle="Boutons pour les actions importantes"
          />
          <EnhancedCardContent>
            <div className="space-y-6">
              {/* Primary Buttons */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700">Boutons primaires</h3>
                <div className="flex flex-wrap gap-3">
                  <PrimaryButton
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={handlePrimaryAction}
                  >
                    Petit
                  </PrimaryButton>

                  <PrimaryButton
                    size="md"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={handlePrimaryAction}
                  >
                    Moyen
                  </PrimaryButton>

                  <PrimaryButton
                    size="lg"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={handlePrimaryAction}
                  >
                    Grand
                  </PrimaryButton>

                  <PrimaryButton
                    size="md"
                    loading={loading}
                    onClick={handlePrimaryAction}
                  >
                    État de chargement
                  </PrimaryButton>

                  <PrimaryButton
                    size="md"
                    disabled
                  >
                    Désactivé
                  </PrimaryButton>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700">Boutons secondaires</h3>
                <div className="flex flex-wrap gap-3">
                  <SecondaryButton
                    size="sm"
                    leftIcon={<Search className="w-4 h-4" />}
                  >
                    Rechercher
                  </SecondaryButton>

                  <SecondaryButton
                    size="md"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Télécharger
                  </SecondaryButton>

                  <SecondaryButton
                    size="lg"
                    leftIcon={<TrendingUp className="w-4 h-4" />}
                  >
                    Analyser
                  </SecondaryButton>

                  <SecondaryButton
                    size="md"
                    variant="ghost"
                  >
                    Mode fantôme
                  </SecondaryButton>

                  <SecondaryButton
                    size="md"
                    variant="danger"
                  >
                    Supprimer
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </section>

      {/* Form Fields Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Champs de formulaire</h2>
          <p className="text-neutral-600">Champs de saisie avec validation et états</p>
        </div>

        <EnhancedCard>
          <EnhancedCardHeader
            title="Exemples de champs"
            subtitle="Différents états de validation"
          />
          <EnhancedCardContent>
            <div className="space-y-6 max-w-2xl">
              <EnhancedInputField
                label="État par défaut"
                placeholder="Entrez votre email"
                helpText="Nous ne partagerons jamais votre email"
                type="email"
              />

              <EnhancedInputField
                label="État de succès"
                placeholder="email@exemple.com"
                value="utilisateur@exemple.com"
                state="success"
                successMessage="Email valide et disponible"
              />

              <EnhancedInputField
                label="État d'erreur"
                placeholder="Entrez votre email"
                value="email-invalide"
                state="error"
                errorMessage="Veuillez entrer une adresse email valide"
              />

              <EnhancedInputField
                label="Avec icône"
                placeholder="Rechercher..."
                leftIcon={<Search className="w-4 h-4" />}
              />

              <EnhancedInputField
                label="Champ désactivé"
                placeholder="Champ désactivé"
                value="Valeur fixe"
                disabled
              />

              <EnhancedInputField
                label="Avec compteur de caractères"
                placeholder="Description"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={100}
                helpText="Maximum 100 caractères"
              />
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </section>

      {/* Toast Notifications Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Notifications Toast</h2>
          <p className="text-neutral-600">Système de notifications avec ARIA live regions</p>
        </div>

        <EnhancedCard>
          <EnhancedCardHeader
            title="Démo des notifications"
            subtitle="Testez différents types de notifications"
          />
          <EnhancedCardContent>
            <div className="flex flex-wrap gap-3">
              <SecondaryButton
                onClick={() => handleToastDemo('success')}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Succès
              </SecondaryButton>

              <SecondaryButton
                onClick={() => handleToastDemo('error')}
                variant="danger"
              >
                Erreur
              </SecondaryButton>

              <SecondaryButton
                onClick={() => handleToastDemo('warning')}
              >
                Avertissement
              </SecondaryButton>

              <SecondaryButton
                onClick={() => handleToastDemo('info')}
              >
                Information
              </SecondaryButton>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </section>

      {/* Cards Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Cartes</h2>
          <p className="text-neutral-600">Cartes avec en-têtes, contenu et pieds de page</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnhancedCard>
            <EnhancedCardHeader
              title="Garanties récentes"
              subtitle="Les 5 dernières garanties créées"
            />
            <EnhancedCardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">Garantie #{1000 + i}</p>
                        <p className="text-sm text-neutral-500">Client Example {i}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-primary-600">1,500 $</span>
                  </div>
                ))}
              </div>
            </EnhancedCardContent>
            <EnhancedCardFooter>
              <SecondaryButton fullWidth>
                Voir toutes les garanties
              </SecondaryButton>
            </EnhancedCardFooter>
          </EnhancedCard>

          <EnhancedCard variant="bordered">
            <EnhancedCardHeader
              title="Activité récente"
              subtitle="Ce qui se passe en temps réel"
            />
            <EnhancedCardContent>
              <div className="space-y-4">
                {[
                  { text: 'Nouvelle garantie créée', time: "Il y a 2 minutes", icon: Plus },
                  { text: 'Réclamation approuvée', time: "Il y a 15 minutes", icon: CheckCircle },
                  { text: 'Paiement reçu', time: "Il y a 1 heure", icon: DollarSign },
                  { text: 'Nouveau client inscrit', time: "Il y a 2 heures", icon: Users },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-secondary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{item.text}</p>
                      <p className="text-xs text-neutral-500">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </div>
      </section>

      {/* Design Tokens Reference */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Palette de couleurs</h2>
          <p className="text-neutral-600">Nouvelles couleurs du système de design V2</p>
        </div>

        <EnhancedCard>
          <EnhancedCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Primary */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-700">Primaire (Rouge Pro-Remorque)</h3>
                <div className="space-y-1">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div key={shade} className="flex items-center gap-2">
                      <div className={`w-12 h-8 rounded bg-primary-${shade} border border-neutral-200`} />
                      <span className="text-xs text-neutral-600">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-700">Secondaire (Teal)</h3>
                <div className="space-y-1">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div key={shade} className="flex items-center gap-2">
                      <div className={`w-12 h-8 rounded bg-secondary-${shade} border border-neutral-200`} />
                      <span className="text-xs text-neutral-600">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accent */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-700">Accent (Bleu)</h3>
                <div className="space-y-1">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div key={shade} className="flex items-center gap-2">
                      <div className={`w-12 h-8 rounded bg-accent-${shade} border border-neutral-200`} />
                      <span className="text-xs text-neutral-600">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </section>
    </div>
  );
}
