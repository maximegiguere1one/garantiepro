import { FileText, HelpCircle } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface ClaimsEmptyStateProps {
  onCreateClaim?: () => void;
  onViewHelp?: () => void;
}

export function ClaimsEmptyState({
  onCreateClaim,
  onViewHelp,
}: ClaimsEmptyStateProps) {
  return (
    <EmptyState
      icon={FileText}
      title="Aucune réclamation"
      description="Vous n'avez aucune réclamation en cours. Les réclamations apparaîtront ici lorsqu'un client soumettra une demande."
      action={
        onCreateClaim
          ? {
              label: 'Créer une réclamation',
              onClick: onCreateClaim,
              icon: FileText,
            }
          : undefined
      }
      secondaryAction={
        onViewHelp
          ? {
              label: 'Comment gérer les réclamations',
              onClick: onViewHelp,
            }
          : undefined
      }
    />
  );
}
