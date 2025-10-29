export const microcopy = {
  errors: {
    generic: {
      title: 'Une erreur est survenue',
      message: 'Nous rencontrons un problème technique. Veuillez réessayer dans quelques instants.',
      action: 'Réessayer',
    },
    network: {
      title: 'Problème de connexion',
      message: 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet et réessayez.',
      action: 'Réessayer la connexion',
    },
    validation: {
      required: (field: string) => `Le champ "${field}" est obligatoire`,
      email: 'Veuillez entrer une adresse courriel valide (ex: nom@exemple.com)',
      phone: 'Veuillez entrer un numéro de téléphone valide (ex: 514-555-1234)',
      minLength: (field: string, min: number) => `${field} doit contenir au moins ${min} caractères`,
      maxLength: (field: string, max: number) => `${field} ne peut pas dépasser ${max} caractères`,
      positiveNumber: (field: string) => `${field} doit être un nombre positif supérieur à zéro`,
      pastDate: 'La date ne peut pas être dans le futur',
      futureDate: 'La date ne peut pas être dans le passé',
    },
    auth: {
      invalidCredentials: {
        title: 'Identifiants incorrects',
        message: 'L\'adresse courriel ou le mot de passe est incorrect. Veuillez vérifier vos informations et réessayer.',
        hint: 'Mot de passe oublié? Utilisez le lien "Réinitialiser" ci-dessous.',
      },
      sessionExpired: {
        title: 'Session expirée',
        message: 'Pour votre sécurité, votre session a expiré après une période d\'inactivité.',
        action: 'Se reconnecter',
      },
      noPermission: {
        title: 'Accès refusé',
        message: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action. Contactez un administrateur si vous pensez qu\'il s\'agit d\'une erreur.',
      },
    },
    warranty: {
      noPlan: {
        title: 'Aucun plan de garantie disponible',
        message: 'Avant de créer une garantie, vous devez configurer au moins un plan de garantie actif.',
        action: 'Créer un plan de garantie',
        link: '/settings?tab=warranty-plans',
      },
      invalidData: {
        title: 'Informations incomplètes',
        message: 'Certaines informations requises sont manquantes ou invalides. Veuillez vérifier tous les champs marqués en rouge.',
      },
      organizationMissing: {
        title: 'Organisation introuvable',
        message: 'Impossible de détecter votre organisation. Veuillez vous déconnecter puis vous reconnecter.',
        action: 'Se reconnecter',
      },
    },
    claim: {
      noWarranties: {
        title: 'Aucune garantie active',
        message: 'Pour soumettre une réclamation, vous devez avoir au moins une garantie active. Contactez votre concessionnaire si vous pensez avoir une garantie.',
      },
    },
  },

  success: {
    warranty: {
      created: {
        title: 'Garantie créée avec succès',
        message: (contractNumber: string) => `Votre garantie ${contractNumber} a été créée et activée.`,
        nextSteps: 'Le client recevra un courriel de confirmation avec tous les documents dans quelques instants.',
      },
      updated: {
        title: 'Modifications enregistrées',
        message: 'Les informations de la garantie ont été mises à jour avec succès.',
      },
    },
    claim: {
      submitted: {
        title: 'Réclamation soumise',
        message: (claimNumber: string) => `Votre réclamation ${claimNumber} a été enregistrée.`,
        nextSteps: 'Vous recevrez une réponse dans les 48 heures ouvrables. Un courriel de confirmation vous a été envoyé.',
      },
      updated: {
        title: 'Réclamation mise à jour',
        message: 'Les informations de votre réclamation ont été mises à jour.',
      },
    },
    settings: {
      saved: {
        title: 'Paramètres enregistrés',
        message: 'Vos modifications ont été enregistrées avec succès.',
      },
    },
    export: {
      completed: {
        title: 'Export terminé',
        message: 'Le fichier a été téléchargé sur votre appareil.',
      },
    },
  },

  confirmations: {
    delete: {
      title: 'Confirmer la suppression',
      message: (item: string) => `Êtes-vous sûr de vouloir supprimer ${item}? Cette action est irréversible.`,
      confirm: 'Oui, supprimer',
      cancel: 'Annuler',
    },
    cancel: {
      title: 'Abandonner les modifications',
      message: 'Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter sans enregistrer?',
      confirm: 'Quitter sans enregistrer',
      cancel: 'Continuer la modification',
    },
    submit: {
      title: 'Confirmer l\'envoi',
      message: 'Veuillez vérifier que toutes les informations sont correctes avant de soumettre.',
      confirm: 'Confirmer et envoyer',
      cancel: 'Vérifier à nouveau',
    },
  },

  forms: {
    warranty: {
      customer: {
        title: 'Informations du client',
        description: 'Entrez les coordonnées complètes du client pour la garantie',
        firstName: {
          label: 'Prénom',
          placeholder: 'Jean',
          hint: 'Tel qu\'il apparaît sur les documents officiels',
        },
        lastName: {
          label: 'Nom de famille',
          placeholder: 'Tremblay',
          hint: 'Tel qu\'il apparaît sur les documents officiels',
        },
        email: {
          label: 'Adresse courriel',
          placeholder: 'jean.tremblay@exemple.com',
          hint: 'Le client recevra les documents de garantie à cette adresse',
        },
        phone: {
          label: 'Numéro de téléphone',
          placeholder: '514-555-1234',
          hint: 'Format: XXX-XXX-XXXX',
        },
        address: {
          label: 'Adresse complète',
          placeholder: '123 Rue Principale',
          hint: 'Numéro civique et nom de rue',
        },
        city: {
          label: 'Ville',
          placeholder: 'Montréal',
        },
        province: {
          label: 'Province',
          hint: 'La province détermine les taxes applicables',
        },
        postalCode: {
          label: 'Code postal',
          placeholder: 'H1A 1A1',
          hint: 'Format: A1A 1A1',
        },
        language: {
          label: 'Langue de communication préférée',
          hint: 'La langue des documents et courriels',
        },
        marketingConsent: {
          label: 'J\'accepte de recevoir des communications marketing par courriel',
          hint: 'Conforme à la Loi canadienne anti-pourriel (LCAP). Vous pouvez vous désabonner à tout moment.',
        },
      },
      trailer: {
        title: 'Informations de la remorque',
        description: 'Détails du véhicule couvert par la garantie',
        vin: {
          label: 'Numéro d\'identification (NIV)',
          placeholder: '1HGBH41JXMN109186',
          hint: '17 caractères alphanumériques - trouvé sur la plaque du châssis',
        },
        make: {
          label: 'Marque',
          placeholder: 'Remorques Québec',
          hint: 'Fabricant ou marque de la remorque',
        },
        model: {
          label: 'Modèle',
          placeholder: 'Cargo Pro 2000',
          hint: 'Nom du modèle spécifique',
        },
        year: {
          label: 'Année de fabrication',
          hint: 'Année indiquée sur le certificat d\'origine',
        },
        type: {
          label: 'Type de remorque',
          placeholder: 'Cargo fermée',
          hint: 'Ex: Utilitaire, Cargo, Plateforme, Transport',
        },
        category: {
          label: 'Catégorie',
          hint: 'La catégorie détermine les limites de couverture',
        },
        purchaseDate: {
          label: 'Date d\'achat',
          hint: 'Date figurant sur la facture de vente',
        },
        purchasePrice: {
          label: 'Prix d\'achat (avant taxes)',
          placeholder: '15000.00',
          hint: 'Montant payé pour la remorque, excluant les taxes. Détermine la limite de réclamation annuelle.',
        },
        manufacturerWarrantyEnd: {
          label: 'Fin de la garantie fabricant',
          hint: 'Date à laquelle la garantie d\'origine prend fin. La garantie prolongée débute après cette date.',
          important: 'Important: La garantie PPR commence uniquement après l\'expiration de la garantie fabricant.',
        },
        promotional: {
          label: 'Achat promotionnel ou rabais spécial',
          hint: 'Cochez si la remorque a été achetée en promotion. Affecte le crédit de fidélité.',
        },
      },
      plan: {
        title: 'Sélection du plan de garantie',
        description: 'Choisissez le niveau de protection adapté aux besoins du client',
        noPlanAvailable: 'Aucun plan actif disponible',
        noPlanMessage: 'Vous devez créer au moins un plan de garantie avant de pouvoir vendre des garanties.',
        createPlanAction: 'Créer un plan de garantie maintenant',
        planCharacteristics: 'Caractéristiques de la garantie PPR',
        duration: 'Durée de la couverture',
        deductible: 'Franchise par réclamation',
        coverage: 'Couverture complète pièces et main-d\'œuvre',
      },
      review: {
        title: 'Révision finale',
        description: 'Vérifiez attentivement toutes les informations avant de finaliser la vente',
        customerSection: 'Informations du client',
        trailerSection: 'Détails de la remorque',
        coverageSection: 'Couverture et protection',
        pricingSection: 'Détail des coûts',
        basePriceLabel: 'Prix du plan de garantie',
        optionsLabel: 'Options supplémentaires',
        taxesLabel: 'Taxes',
        totalLabel: 'Total à payer',
        marginLabel: 'Marge bénéficiaire',
        loyaltyInfo: 'Crédit de fidélité inclus',
        loyaltyDescription: 'Crédit de 2 000$ CAD automatiquement accordé si aucune réclamation n\'est déposée pendant la durée de la garantie.',
      },
    },
    claim: {
      title: 'Nouvelle réclamation',
      description: 'Soumettez votre demande de réclamation sous garantie',
      selectCustomer: {
        label: 'Client concerné',
        placeholder: 'Sélectionnez un client',
        hint: 'Cherchez le client par nom ou courriel',
      },
      selectWarranty: {
        label: 'Garantie concernée',
        placeholder: 'Sélectionnez une garantie active',
        selectCustomerFirst: 'Sélectionnez d\'abord un client',
        hint: 'Seules les garanties actives apparaissent ici',
      },
      incidentDate: {
        label: 'Date de l\'incident',
        hint: 'Quand le problème est-il survenu? Ne peut pas être dans le futur.',
      },
      incidentDescription: {
        label: 'Description détaillée de l\'incident',
        placeholder: 'Décrivez précisément: Quand? Où? Comment? Quels dommages? Quels symptômes?',
        hint: 'Plus votre description est précise et détaillée, plus le traitement sera rapide et efficace.',
        examples: 'Incluez: circonstances, symptômes observés, pièces affectées, tentatives de réparation.',
      },
      repairShop: {
        title: 'Garage de réparation (facultatif)',
        description: 'Si vous avez déjà contacté un garage, entrez ses coordonnées',
        name: {
          label: 'Nom du garage',
          placeholder: 'Garage Mécanique Plus Inc.',
        },
        contact: {
          label: 'Coordonnées du garage',
          placeholder: 'Téléphone: 514-555-9999 ou courriel',
        },
      },
      attachments: {
        label: 'Pièces justificatives',
        hint: 'Photos des dommages, estimations de réparation, factures, rapports d\'inspection...',
        maxFiles: 'Maximum 10 fichiers',
        acceptedFormats: 'Formats acceptés: PDF, JPG, PNG (max 10 MB par fichier)',
      },
      importantInfo: {
        title: 'Informations importantes à savoir',
        slaTime: 'Votre réclamation sera évaluée dans les 48 heures ouvrables suivant sa réception.',
        notifications: 'Vous recevrez des notifications par courriel à chaque étape du traitement.',
        documents: 'Conservez tous les documents originaux (factures, rapports, photos) jusqu\'à la fermeture du dossier.',
        contact: 'Pour toute question urgente, contactez notre service client au numéro indiqué dans votre confirmation.',
      },
    },
  },

  buttons: {
    save: 'Enregistrer les modifications',
    saveAndContinue: 'Enregistrer et continuer',
    saveDraft: 'Enregistrer comme brouillon',
    cancel: 'Annuler',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    submit: 'Soumettre',
    create: 'Créer',
    update: 'Mettre à jour',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    retry: 'Réessayer',
    refresh: 'Actualiser',
    export: 'Exporter',
    download: 'Télécharger',
    upload: 'Téléverser',
    search: 'Rechercher',
    filter: 'Filtrer',
    clearFilters: 'Effacer les filtres',
    viewDetails: 'Voir les détails',
    edit: 'Modifier',
    duplicate: 'Dupliquer',
    archive: 'Archiver',
    loading: 'Chargement...',
    processing: 'Traitement en cours...',
    saving: 'Enregistrement...',
    deleting: 'Suppression...',
    warranty: {
      create: 'Créer une nouvelle garantie',
      complete: 'Finaliser la vente',
      sign: 'Signer le contrat',
      download: 'Télécharger le contrat',
      viewContract: 'Voir le contrat',
      viewInvoice: 'Voir la facture',
    },
    claim: {
      create: 'Soumettre une réclamation',
      approve: 'Approuver la réclamation',
      reject: 'Refuser la réclamation',
      review: 'Examiner la réclamation',
    },
  },

  status: {
    warranty: {
      active: {
        label: 'Active',
        description: 'La garantie est en vigueur et couvre les réclamations admissibles.',
      },
      draft: {
        label: 'Brouillon',
        description: 'Garantie en cours de création, non encore finalisée.',
      },
      expired: {
        label: 'Expirée',
        description: 'La période de couverture est terminée. Aucune nouvelle réclamation ne peut être soumise.',
      },
      cancelled: {
        label: 'Annulée',
        description: 'Cette garantie a été annulée et n\'est plus valide.',
      },
      pending: {
        label: 'En attente',
        description: 'En attente de signature ou de documents.',
      },
    },
    claim: {
      submitted: {
        label: 'Soumise',
        description: 'Réclamation reçue et en attente d\'évaluation initiale.',
      },
      under_review: {
        label: 'En évaluation',
        description: 'Notre équipe examine votre réclamation et les documents fournis.',
      },
      approved: {
        label: 'Approuvée',
        description: 'Réclamation approuvée. Les réparations peuvent commencer.',
      },
      rejected: {
        label: 'Refusée',
        description: 'Réclamation non couverte par les termes de la garantie.',
      },
      completed: {
        label: 'Complétée',
        description: 'Réclamation traitée et dossier fermé.',
      },
      pending_documents: {
        label: 'Documents requis',
        description: 'En attente de documents ou informations supplémentaires de votre part.',
      },
    },
  },

  emptyStates: {
    warranties: {
      title: 'Aucune garantie pour le moment',
      message: 'Commencez par créer votre première garantie pour un client.',
      action: 'Créer une garantie',
    },
    warrantiesFiltered: {
      title: 'Aucun résultat trouvé',
      message: 'Aucune garantie ne correspond à vos critères de recherche.',
      suggestion: 'Essayez d\'ajuster vos filtres ou modifiez votre recherche.',
      action: 'Effacer les filtres',
    },
    claims: {
      title: 'Aucune réclamation',
      message: 'Aucune réclamation n\'a encore été soumise.',
      action: 'Soumettre une réclamation',
    },
    customers: {
      title: 'Aucun client enregistré',
      message: 'Les clients seront automatiquement ajoutés lors de la création de garanties.',
    },
    searchResults: {
      title: 'Aucun résultat',
      message: (query: string) => `Aucun résultat pour "${query}"`,
      suggestion: 'Vérifiez l\'orthographe ou essayez d\'autres mots-clés.',
    },
  },

  search: {
    warranties: {
      placeholder: 'Rechercher par numéro de contrat, nom du client, courriel ou NIV...',
      resultsCount: (count: number) => `${count} garantie${count > 1 ? 's' : ''} trouvée${count > 1 ? 's' : ''}`,
    },
    customers: {
      placeholder: 'Rechercher par nom, courriel ou numéro de téléphone...',
      resultsCount: (count: number) => `${count} client${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}`,
    },
    claims: {
      placeholder: 'Rechercher par numéro de réclamation, client ou garantie...',
      resultsCount: (count: number) => `${count} réclamation${count > 1 ? 's' : ''} trouvée${count > 1 ? 's' : ''}`,
    },
    global: {
      placeholder: 'Rechercher partout: clients, garanties, réclamations...',
      noResults: 'Aucun résultat trouvé',
    },
  },

  filters: {
    status: {
      label: 'Filtrer par statut',
      all: 'Tous les statuts',
    },
    dateRange: {
      label: 'Période',
      allTime: 'Toute la période',
      last30Days: '30 derniers jours',
      last90Days: '90 derniers jours',
      thisYear: 'Cette année',
      custom: 'Période personnalisée',
    },
    applied: (count: number) => `${count} filtre${count > 1 ? 's' : ''} appliqué${count > 1 ? 's' : ''}`,
    clearAll: 'Effacer tous les filtres',
  },

  loading: {
    default: 'Chargement en cours...',
    warranties: 'Chargement des garanties...',
    claims: 'Chargement des réclamations...',
    customers: 'Chargement des clients...',
    saving: 'Enregistrement de vos modifications...',
    processing: 'Traitement de votre demande...',
    uploading: 'Téléversement des fichiers...',
    generating: 'Génération du document...',
    slow: 'Cela prend plus de temps que prévu. Merci de patienter...',
  },

  pagination: {
    showing: (start: number, end: number, total: number) =>
      `Affichage de ${start} à ${end} sur ${total} résultat${total > 1 ? 's' : ''}`,
    previous: 'Page précédente',
    next: 'Page suivante',
    first: 'Première page',
    last: 'Dernière page',
    goToPage: 'Aller à la page',
  },

  tooltips: {
    required: 'Ce champ est obligatoire',
    optional: 'Ce champ est facultatif',
    info: 'Plus d\'informations',
    help: 'Aide',
    copy: 'Copier',
    copied: 'Copié!',
    download: 'Télécharger',
    edit: 'Modifier',
    delete: 'Supprimer',
    view: 'Voir',
    refresh: 'Actualiser',
  },

  validation: {
    checking: 'Vérification...',
    valid: 'Valide',
    invalid: 'Invalide',
    formatting: 'Mise en forme...',
  },

  time: {
    justNow: 'À l\'instant',
    minutesAgo: (minutes: number) => `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`,
    hoursAgo: (hours: number) => `Il y a ${hours} heure${hours > 1 ? 's' : ''}`,
    daysAgo: (days: number) => `Il y a ${days} jour${days > 1 ? 's' : ''}`,
    weeksAgo: (weeks: number) => `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`,
    monthsAgo: (months: number) => `Il y a ${months} mois`,
  },
} as const;

export type Microcopy = typeof microcopy;
