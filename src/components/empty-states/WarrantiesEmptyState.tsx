import { Shield, Book } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface WarrantiesEmptyStateProps {
  onCreateWarranty: () => void;
  onViewGuide?: () => void;
}

export function WarrantiesEmptyState({
  onCreateWarranty,
  onViewGuide,
}: WarrantiesEmptyStateProps) {
  return (
    <EmptyState
      icon={Shield}
      title="Aucune garantie pour le moment"
      description="Créez votre première garantie pour commencer à gérer vos contrats de protection. Le processus ne prend que quelques minutes."
      action={{
        label: 'Créer une garantie',
        onClick: onCreateWarranty,
        icon: Shield,
      }}
      secondaryAction={
        onViewGuide
          ? {
              label: 'Voir le guide de démarrage',
              onClick: onViewGuide,
            }
          : undefined
      }
    />
  );
}
