/**
 * Validations critiques pour la création de garanties
 *
 * Ce module centralise toutes les validations nécessaires avant et après
 * la signature de contrat pour assurer l'intégrité des données.
 */

export interface CustomerValidation {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface TrailerValidation {
  vin: string;
  make: string;
  model: string;
  year: number;
  trailerType: string;
  purchasePrice: number;
  purchaseDate: string;
  manufacturerWarrantyEndDate: string;
}

export interface SignatureDataValidation {
  signerFullName: string;
  signerEmail: string;
  signatureDataUrl: string;
  documentHash: string;
  consentGiven: boolean;
  consentTimestamp: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide les informations du client
 */
export function validateCustomer(customer: CustomerValidation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Champs obligatoires
  if (!customer.firstName || customer.firstName.trim().length === 0) {
    errors.push('Le prénom du client est obligatoire');
  }

  if (!customer.lastName || customer.lastName.trim().length === 0) {
    errors.push('Le nom du client est obligatoire');
  }

  // Validation email
  if (!customer.email || customer.email.trim().length === 0) {
    errors.push('L\'adresse email est obligatoire');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      errors.push('L\'adresse email n\'est pas valide');
    }
  }

  // Validation téléphone
  if (!customer.phone || customer.phone.trim().length === 0) {
    errors.push('Le numéro de téléphone est obligatoire');
  } else {
    // Format de base: au moins 10 chiffres
    const phoneDigits = customer.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.push('Le numéro de téléphone doit contenir au moins 10 chiffres');
    }
  }

  // Adresse
  if (!customer.address || customer.address.trim().length === 0) {
    errors.push('L\'adresse est obligatoire');
  }

  if (!customer.city || customer.city.trim().length === 0) {
    errors.push('La ville est obligatoire');
  }

  // Code postal canadien
  if (!customer.postalCode || customer.postalCode.trim().length === 0) {
    errors.push('Le code postal est obligatoire');
  } else {
    const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    if (!postalCodeRegex.test(customer.postalCode)) {
      warnings.push('Le format du code postal ne semble pas être canadien (A1A 1A1)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide les informations de la remorque
 */
export function validateTrailer(trailer: TrailerValidation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // VIN obligatoire et format
  if (!trailer.vin || trailer.vin.trim().length === 0) {
    errors.push('Le numéro VIN est obligatoire');
  } else {
    // VIN standard: 17 caractères alphanumériques
    const vinCleaned = trailer.vin.replace(/[^A-Z0-9]/gi, '');
    if (vinCleaned.length !== 17) {
      warnings.push('Le VIN devrait contenir exactement 17 caractères. Veuillez vérifier.');
    }
  }

  // Marque et modèle
  if (!trailer.make || trailer.make.trim().length === 0) {
    errors.push('La marque de la remorque est obligatoire');
  }

  if (!trailer.model || trailer.model.trim().length === 0) {
    errors.push('Le modèle de la remorque est obligatoire');
  }

  // Année valide
  const currentYear = new Date().getFullYear();
  if (!trailer.year || trailer.year < 1900) {
    errors.push('L\'année de la remorque est obligatoire');
  } else if (trailer.year > currentYear + 1) {
    warnings.push(`L'année ${trailer.year} semble être dans le futur`);
  } else if (trailer.year < currentYear - 50) {
    warnings.push(`La remorque est très ancienne (${trailer.year})`);
  }

  // Type de remorque
  if (!trailer.trailerType || trailer.trailerType.trim().length === 0) {
    errors.push('Le type de remorque est obligatoire');
  }

  // Prix d'achat CRITIQUE
  if (!trailer.purchasePrice || trailer.purchasePrice <= 0) {
    errors.push('Le prix d\'achat doit être supérieur à 0 $');
  } else if (trailer.purchasePrice > 1000000) {
    warnings.push('Le prix d\'achat semble très élevé. Veuillez vérifier.');
  } else if (trailer.purchasePrice < 100) {
    warnings.push('Le prix d\'achat semble très bas. Veuillez vérifier.');
  }

  // Date d'achat
  if (!trailer.purchaseDate) {
    errors.push('La date d\'achat est obligatoire');
  } else {
    const purchaseDate = new Date(trailer.purchaseDate);
    const now = new Date();
    if (purchaseDate > now) {
      errors.push('La date d\'achat ne peut pas être dans le futur');
    }

    // Vérifier que la date n'est pas trop ancienne
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (purchaseDate < twoYearsAgo) {
      warnings.push('La date d\'achat remonte à plus de 2 ans');
    }
  }

  // Date de fin de garantie fabricant CRITIQUE
  if (!trailer.manufacturerWarrantyEndDate) {
    errors.push('La date de fin de garantie fabricant est obligatoire');
  } else {
    const warrantyEndDate = new Date(trailer.manufacturerWarrantyEndDate);
    const purchaseDate = new Date(trailer.purchaseDate);

    if (warrantyEndDate < purchaseDate) {
      errors.push('La date de fin de garantie fabricant ne peut pas être avant la date d\'achat');
    }

    // La garantie PPR commence après la garantie fabricant
    const now = new Date();
    if (warrantyEndDate < now) {
      warnings.push('La garantie fabricant est déjà expirée. La garantie PPR débutera immédiatement.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide les données de signature
 */
export function validateSignatureData(data: SignatureDataValidation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Nom complet
  if (!data.signerFullName || data.signerFullName.trim().length === 0) {
    errors.push('Le nom complet du signataire est obligatoire');
  } else if (data.signerFullName.trim().length < 3) {
    errors.push('Le nom complet doit contenir au moins 3 caractères');
  }

  // Email
  if (!data.signerEmail || data.signerEmail.trim().length === 0) {
    errors.push('L\'adresse email du signataire est obligatoire');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.signerEmail)) {
      errors.push('L\'adresse email du signataire n\'est pas valide');
    }
  }

  // Signature (data URL)
  if (!data.signatureDataUrl || data.signatureDataUrl.trim().length === 0) {
    errors.push('La signature est obligatoire');
  } else if (!data.signatureDataUrl.startsWith('data:image/')) {
    errors.push('Le format de la signature n\'est pas valide');
  }

  // Hash du document
  if (!data.documentHash || data.documentHash.trim().length === 0) {
    errors.push('Le hash du document est manquant');
  } else if (data.documentHash.length !== 64) {
    warnings.push('Le hash du document ne semble pas être un SHA-256 valide');
  }

  // Consentement CRITIQUE
  if (!data.consentGiven) {
    errors.push('Le consentement explicite est obligatoire pour signer le contrat');
  }

  // Timestamp du consentement
  if (!data.consentTimestamp) {
    errors.push('La date et heure du consentement sont manquantes');
  } else {
    const consentDate = new Date(data.consentTimestamp);
    const now = new Date();

    if (isNaN(consentDate.getTime())) {
      errors.push('Le timestamp du consentement n\'est pas valide');
    } else if (consentDate > now) {
      errors.push('La date du consentement ne peut pas être dans le futur');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide qu'une organisation est valide et active
 */
export function validateOrganization(organizationId: string | null | undefined): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!organizationId) {
    errors.push('L\'organisation n\'est pas définie. Veuillez vous reconnecter.');
  } else {
    // Vérifier format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      errors.push('L\'ID d\'organisation n\'est pas valide');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide qu'un plan de garantie est sélectionné et valide
 */
export function validateWarrantyPlan(planId: string | null | undefined): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!planId) {
    errors.push('Aucun plan de garantie n\'est sélectionné');
  } else {
    // Vérifier format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(planId)) {
      errors.push('L\'ID du plan de garantie n\'est pas valide');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validation complète avant de commencer le processus de signature
 */
export function validateBeforeSignature(
  customer: CustomerValidation,
  trailer: TrailerValidation,
  organizationId: string | null | undefined,
  planId: string | null | undefined
): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Valider l'organisation d'abord (critique)
  const orgValidation = validateOrganization(organizationId);
  allErrors.push(...orgValidation.errors);
  allWarnings.push(...orgValidation.warnings);

  // Valider le plan
  const planValidation = validateWarrantyPlan(planId);
  allErrors.push(...planValidation.errors);
  allWarnings.push(...planValidation.warnings);

  // Valider le client
  const customerValidation = validateCustomer(customer);
  allErrors.push(...customerValidation.errors);
  allWarnings.push(...customerValidation.warnings);

  // Valider la remorque
  const trailerValidation = validateTrailer(trailer);
  allErrors.push(...trailerValidation.errors);
  allWarnings.push(...trailerValidation.warnings);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validation complète après la signature avant de finaliser
 */
export function validateAfterSignature(
  signatureData: SignatureDataValidation,
  customerEmail: string
): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Valider les données de signature
  const signatureValidation = validateSignatureData(signatureData);
  allErrors.push(...signatureValidation.errors);
  allWarnings.push(...signatureValidation.warnings);

  // Vérifier que l'email du signataire correspond au client
  if (signatureData.signerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
    allWarnings.push('L\'email du signataire ne correspond pas à l\'email du client');
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
