import { useState, lazy, Suspense } from 'react';
import {
  Building2,
  DollarSign,
  FileText,
  Users,
  User,
  Bell,
  Receipt,
  Shield,
  Plug,
  History,
  Mail,
  Settings,
  Activity,
  MessageSquare,
  Inbox,
  PenTool,
} from 'lucide-react';

const CompanySettings = lazy(() => import('./settings/CompanySettings').then(m => ({ default: m.CompanySettings })));
const WarrantyPlansManagement = lazy(() => import('./settings/WarrantyPlansManagement').then(m => ({ default: m.WarrantyPlansManagement })));
const AddOnOptionsSettings = lazy(() => import('./settings/AddOnOptionsSettings').then(m => ({ default: m.AddOnOptionsSettings })));
const TaxSettings = lazy(() => import('./settings/TaxSettings').then(m => ({ default: m.TaxSettings })));
const PricingSettings = lazy(() => import('./settings/PricingSettings').then(m => ({ default: m.PricingSettings })));
const EmailNotificationSettings = lazy(() => import('./settings/EmailNotificationSettings').then(m => ({ default: m.EmailNotificationSettings })));
const ClaimSettings = lazy(() => import('./settings/ClaimSettings').then(m => ({ default: m.ClaimSettings })));
const EmailTemplatesSettings = lazy(() => import('./settings/EmailTemplatesSettings').then(m => ({ default: m.EmailTemplatesSettings })));
const EmailConfigWizard = lazy(() => import('./EmailConfigWizard').then(m => ({ default: m.EmailConfigWizard })));
const SystemDiagnostics = lazy(() => import('./SystemDiagnostics').then(m => ({ default: m.SystemDiagnostics })));
const ResponseTemplatesManager = lazy(() => import('./ResponseTemplatesManager').then(m => ({ default: m.ResponseTemplatesManager })));
const EmailQueueManager = lazy(() => import('./EmailQueueManager').then(m => ({ default: m.EmailQueueManager })));
const SignatureGenerator = lazy(() => import('./settings/SignatureGenerator').then(m => ({ default: m.SignatureGenerator })));
const UsersManagement = lazy(() => import('./settings/UsersManagement').then(m => ({ default: m.UsersManagement })));
const MyProfile = lazy(() => import('./settings/MyProfile').then(m => ({ default: m.MyProfile })));

type SettingsTab =
  | 'profile'
  | 'company'
  | 'plans'
  | 'options'
  | 'taxes'
  | 'pricing'
  | 'users'
  | 'notifications'
  | 'emails'
  | 'emailconfig'
  | 'emailqueue'
  | 'claims'
  | 'signatures'
  | 'diagnostics'
  | 'templates';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
  </div>
);

const ComingSoon = ({ title }: { title: string }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Settings className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 mb-4 leading-relaxed">
      Cette section sera disponible prochainement.
    </p>
    <p className="text-sm text-slate-500">
      Nous travaillons activement sur cette fonctionnalité pour vous offrir la meilleure expérience possible.
    </p>
  </div>
);

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    { id: 'profile' as const, name: 'Mon Profil', icon: User },
    { id: 'company' as const, name: 'Entreprise', icon: Building2 },
    { id: 'users' as const, name: 'Utilisateurs', icon: Users },
    { id: 'signatures' as const, name: 'Signatures', icon: PenTool },
    { id: 'emailconfig' as const, name: 'Config Email', icon: Settings },
    { id: 'plans' as const, name: 'Plans de Garantie', icon: Shield },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell },
    { id: 'emails' as const, name: 'Templates Emails', icon: Mail },
    { id: 'emailqueue' as const, name: 'File d\'attente Emails', icon: Inbox },
    { id: 'templates' as const, name: 'Templates Réponses', icon: MessageSquare },
    { id: 'options' as const, name: 'Options Add-on', icon: FileText },
    { id: 'taxes' as const, name: 'Taxes', icon: Receipt },
    { id: 'pricing' as const, name: 'Tarification', icon: DollarSign },
    { id: 'claims' as const, name: 'Réclamations', icon: History },
    { id: 'diagnostics' as const, name: 'Diagnostic', icon: Activity },
  ];

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'profile':
          return <MyProfile />;
        case 'company':
          return <CompanySettings />;
        case 'users':
          return <UsersManagement />;
        case 'plans':
          return <WarrantyPlansManagement />;
        case 'emailconfig':
          return <EmailConfigWizard />;
        case 'emailqueue':
          return <EmailQueueManager />;
        case 'templates':
          return <ResponseTemplatesManager />;
        case 'diagnostics':
          return <SystemDiagnostics />;
        case 'taxes':
          return <TaxSettings />;
        case 'pricing':
          return <PricingSettings />;
        case 'notifications':
          return <EmailNotificationSettings />;
        case 'claims':
          return <ClaimSettings />;
        case 'emails':
          return <EmailTemplatesSettings />;
        case 'signatures':
          return <SignatureGenerator />;
        case 'options':
          return <AddOnOptionsSettings />;
        default:
          return (
            <div className="text-center py-12">
              <p className="text-slate-600">Sélectionnez une section dans le menu</p>
            </div>
          );
      }
    })();

    return (
      <Suspense fallback={<LoadingSpinner />}>
        {content}
      </Suspense>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-600 mt-2">
          Configurez votre compte
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? 'text-primary-700 border-primary-600 bg-primary-50/50'
                    : 'text-slate-600 border-transparent hover:text-primary-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div className="min-h-[500px]">{renderContent()}</div>
      </div>
    </div>
  );
}
