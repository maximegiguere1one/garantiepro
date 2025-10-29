import { Shield, Users, Briefcase, User, Info } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type UserRole = Database['public']['Tables']['profiles']['Row']['role'];

interface RoleSelectorProps {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentUserRole: UserRole;
  disabled?: boolean;
  showCategory?: boolean;
}

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: typeof Shield;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  category: 'admin' | 'employee' | 'client';
  permissions: string[];
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'super_admin',
    label: 'Super Administrateur',
    description: 'Accès complet à tous les systèmes et organisations',
    icon: Shield,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-500',
    ringClass: 'ring-red-500/20',
    category: 'admin',
    permissions: [
      'Gestion complète du système',
      'Accès à toutes les organisations',
      'Gestion des super administrateurs',
      'Configuration système avancée',
    ],
  },
  {
    value: 'admin',
    label: 'Administrateur',
    description: 'Gestion complète de l\'organisation',
    icon: Shield,
    bgClass: 'bg-primary-50',
    borderClass: 'border-primary-500',
    ringClass: 'ring-primary-500/20',
    category: 'admin',
    permissions: [
      'Gestion des utilisateurs',
      'Gestion des garanties',
      'Gestion des réclamations',
      'Configuration de l\'organisation',
      'Invitation d\'employés',
    ],
  },
  {
    value: 'franchisee_employee',
    label: 'Employé',
    description: 'Accès complet aux opérations quotidiennes',
    icon: Briefcase,
    bgClass: 'bg-green-50',
    borderClass: 'border-primary-500',
    ringClass: 'ring-primary-500/20',
    category: 'employee',
    permissions: [
      'Création de garanties',
      'Gestion des réclamations',
      'Accès aux rapports',
      'Communication clients',
    ],
  },
  {
    value: 'dealer',
    label: 'Concessionnaire',
    description: 'Vente et gestion des garanties',
    icon: Briefcase,
    bgClass: 'bg-green-50',
    borderClass: 'border-primary-500',
    ringClass: 'ring-primary-500/20',
    category: 'employee',
    permissions: [
      'Vente de garanties',
      'Gestion du stock',
      'Suivi des clients',
      'Rapports de vente',
    ],
  },
  {
    value: 'f_and_i',
    label: 'Finance et Assurance',
    description: 'Gestion financière et assurances',
    icon: Briefcase,
    bgClass: 'bg-primary-50',
    borderClass: 'border-purple-500',
    ringClass: 'ring-purple-500/20',
    category: 'employee',
    permissions: [
      'Gestion financière',
      'Traitement des assurances',
      'Rapports financiers',
      'Conformité',
    ],
  },
  {
    value: 'operations',
    label: 'Opérations',
    description: 'Gestion opérationnelle',
    icon: Briefcase,
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-500',
    ringClass: 'ring-orange-500/20',
    category: 'employee',
    permissions: [
      'Gestion des opérations',
      'Coordination des équipes',
      'Suivi des processus',
      'Support technique',
    ],
  },
  {
    value: 'client',
    label: 'Client',
    description: 'Accès client uniquement',
    icon: User,
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-500',
    ringClass: 'ring-slate-500/20',
    category: 'client',
    permissions: [
      'Consulter ses garanties',
      'Soumettre des réclamations',
      'Voir l\'historique',
    ],
  },
];

const getAvailableRoles = (currentUserRole: UserRole): RoleOption[] => {
  // Master role has all permissions (same as super_admin)
  if (currentUserRole === 'master' || currentUserRole === 'super_admin') {
    return ROLE_OPTIONS;
  }

  if (currentUserRole === 'admin') {
    return ROLE_OPTIONS.filter(r => r.value !== 'super_admin');
  }

  if (currentUserRole === 'dealer' || currentUserRole === 'employee') {
    return ROLE_OPTIONS.filter(r => r.value === 'client');
  }

  return ROLE_OPTIONS.filter(r => r.value === 'client');
};

export function RoleSelector({
  selectedRole,
  onRoleChange,
  currentUserRole,
  disabled = false,
  showCategory = true,
}: RoleSelectorProps) {
  const availableRoles = getAvailableRoles(currentUserRole);
  const selectedRoleOption = ROLE_OPTIONS.find(r => r.value === selectedRole);

  const employeeRoles = availableRoles.filter(r => r.category === 'employee');
  const clientRoles = availableRoles.filter(r => r.category === 'client');
  const adminRoles = availableRoles.filter(r => r.category === 'admin');

  return (
    <div className="space-y-6">
      {showCategory && (employeeRoles.length > 0 || clientRoles.length > 0) && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-900 mb-1">
                Choisissez le type d'utilisateur
              </p>
              <p className="text-sm text-primary-700">
                <strong>Employé:</strong> Accès aux opérations et à la gestion des garanties<br />
                <strong>Client:</strong> Accès limité pour consulter ses propres garanties
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section Administrateurs */}
      {adminRoles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-600" />
            Administrateurs
          </h3>
          <div className="space-y-2">
            {adminRoles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;

              return (
                <label
                  key={role.value}
                  className={`
                    relative flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                    ${isSelected
                      ? `${role.borderClass} ${role.bgClass} ring-2 ${role.ringClass}`
                      : 'border-slate-200 bg-white hover:border-slate-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={isSelected}
                    onChange={(e) => onRoleChange(e.target.value as UserRole)}
                    disabled={disabled}
                    className="mt-1 w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{role.label}</div>
                        <div className="text-sm text-slate-600">{role.description}</div>
                      </div>
                    </div>

                    <div className="ml-13 space-y-1">
                      {role.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Employés */}
      {employeeRoles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary-600" />
            Employés
          </h3>
          <div className="space-y-2">
            {employeeRoles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;

              return (
                <label
                  key={role.value}
                  className={`
                    relative flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                    ${isSelected
                      ? `${role.borderClass} ${role.bgClass} ring-2 ${role.ringClass}`
                      : 'border-slate-200 bg-white hover:border-slate-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={isSelected}
                    onChange={(e) => onRoleChange(e.target.value as UserRole)}
                    disabled={disabled}
                    className="mt-1 w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{role.label}</div>
                        <div className="text-sm text-slate-600">{role.description}</div>
                      </div>
                    </div>

                    <div className="ml-13 space-y-1">
                      {role.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Clients */}
      {clientRoles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            Clients
          </h3>
          <div className="space-y-2">
            {clientRoles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;

              return (
                <label
                  key={role.value}
                  className={`
                    relative flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                    ${isSelected
                      ? 'border-slate-500 bg-slate-50 ring-2 ring-slate-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={isSelected}
                    onChange={(e) => onRoleChange(e.target.value as UserRole)}
                    disabled={disabled}
                    className="mt-1 w-4 h-4 text-slate-600 focus:ring-2 focus:ring-slate-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-400 to-slate-500">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{role.label}</div>
                        <div className="text-sm text-slate-600">{role.description}</div>
                      </div>
                    </div>

                    <div className="ml-13 space-y-1">
                      {role.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Résumé de la sélection */}
      {selectedRoleOption && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
              <selectedRoleOption.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Rôle sélectionné</div>
              <div className="font-semibold text-slate-900">{selectedRoleOption.label}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
