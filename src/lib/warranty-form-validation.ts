/**
 * Validation complète du formulaire de garantie
 * Fournit des messages d'erreur clairs et précis pour chaque champ
 */

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  languagePreference: 'fr' | 'en';
  consentMarketing: boolean;
}

export interface TrailerFormData {
  vin: string;
  make: string;
  model: string;
  year: number;
  trailerType: string;
  category: 'fermee' | 'ouverte' | 'utilitaire';
  purchaseDate: string;
  purchasePrice: number;
  manufacturerWarrantyEndDate: string;
  isPromotional: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Valide un email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide un numéro de téléphone canadien
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+1|1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  return phoneRegex.test(phone);
}

/**
 * Valide un code postal canadien
 */
export function validatePostalCode(postalCode: string): boolean {
  const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
  return postalCodeRegex.test(postalCode);
}

/**
 * Valide un VIN (Vehicle Identification Number)
 */
export function validateVIN(vin: string): ValidationError | null {
  if (!vin || vin.trim().length === 0) {
    return {
      field: 'vin',
      message: 'Le numéro VIN est requis',
      severity: 'error'
    };
  }

  const cleanVin = vin.trim().toUpperCase();

  // Le VIN doit contenir exactement 17 caractères
  if (cleanVin.length !== 17) {
    return {
      field: 'vin',
      message: `Le VIN doit contenir exactement 17 caractères (actuellement: ${cleanVin.length})`,
      severity: 'error'
    };
  }

  // Le VIN ne peut pas contenir I, O ou Q
  if (/[IOQ]/.test(cleanVin)) {
    return {
      field: 'vin',
      message: 'Le VIN ne peut pas contenir les lettres I, O ou Q',
      severity: 'error'
    };
  }

  // Le VIN doit contenir uniquement des lettres et des chiffres
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
    return {
      field: 'vin',
      message: 'Le VIN contient des caractères invalides',
      severity: 'error'
    };
  }

  return null;
}

/**
 * Valide les informations du client
 */
export function validateCustomer(customer: CustomerFormData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Prénom
  if (!customer.firstName || customer.firstName.trim().length === 0) {
    errors.push({
      field: 'firstName',
      message: 'Le prénom est requis',
      severity: 'error'
    });
  } else if (customer.firstName.trim().length < 2) {
    errors.push({
      field: 'firstName',
      message: 'Le prénom doit contenir au moins 2 caractères',
      severity: 'error'
    });
  }

  // Nom
  if (!customer.lastName || customer.lastName.trim().length === 0) {
    errors.push({
      field: 'lastName',
      message: 'Le nom est requis',
      severity: 'error'
    });
  } else if (customer.lastName.trim().length < 2) {
    errors.push({
      field: 'lastName',
      message: 'Le nom doit contenir au moins 2 caractères',
      severity: 'error'
    });
  }

  // Email
  if (!customer.email || customer.email.trim().length === 0) {
    errors.push({
      field: 'email',
      message: 'L\'adresse email est requise',
      severity: 'error'
    });
  } else if (!validateEmail(customer.email)) {
    errors.push({
      field: 'email',
      message: 'L\'adresse email n\'est pas valide',
      severity: 'error'
    });
  }

  // Téléphone
  if (!customer.phone || customer.phone.trim().length === 0) {
    errors.push({
      field: 'phone',
      message: 'Le numéro de téléphone est requis',
      severity: 'error'
    });
  } else if (!validatePhone(customer.phone)) {
    errors.push({
      field: 'phone',
      message: 'Le numéro de téléphone n\'est pas valide. Format attendu: (XXX) XXX-XXXX',
      severity: 'error'
    });
  }

  // Adresse
  if (!customer.address || customer.address.trim().length === 0) {
    errors.push({
      field: 'address',
      message: 'L\'adresse est requise',
      severity: 'error'
    });
  } else if (customer.address.trim().length < 5) {
    errors.push({
      field: 'address',
      message: 'L\'adresse semble incomplète',
      severity: 'error'
    });
  }

  // Ville
  if (!customer.city || customer.city.trim().length === 0) {
    errors.push({
      field: 'city',
      message: 'La ville est requise',
      severity: 'error'
    });
  }

  // Province
  if (!customer.province || customer.province.trim().length === 0) {
    errors.push({
      field: 'province',
      message: 'La province est requise',
      severity: 'error'
    });
  }

  // Code postal
  if (!customer.postalCode || customer.postalCode.trim().length === 0) {
    errors.push({
      field: 'postalCode',
      message: 'Le code postal est requis',
      severity: 'error'
    });
  } else if (!validatePostalCode(customer.postalCode)) {
    errors.push({
      field: 'postalCode',
      message: 'Le code postal n\'est pas valide. Format attendu: A1A 1A1',
      severity: 'error'
    });
  }

  // Warnings pour le Québec
  if (customer.province === 'QC' && customer.languagePreference !== 'fr') {
    warnings.push({
      field: 'languagePreference',
      message: 'La réglementation québécoise recommande les contrats en français',
      severity: 'warning'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide les informations de la remorque
 */
export function validateTrailer(trailer: TrailerFormData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // VIN
  const vinError = validateVIN(trailer.vin);
  if (vinError) {
    errors.push(vinError);
  }

  // Marque
  if (!trailer.make || trailer.make.trim().length === 0) {
    errors.push({
      field: 'make',
      message: 'La marque est requise',
      severity: 'error'
    });
  }

  // Modèle
  if (!trailer.model || trailer.model.trim().length === 0) {
    errors.push({
      field: 'model',
      message: 'Le modèle est requis',
      severity: 'error'
    });
  }

  // Année
  const currentYear = new Date().getFullYear();
  if (!trailer.year || trailer.year < 1900) {
    errors.push({
      field: 'year',
      message: 'L\'année de fabrication est requise',
      severity: 'error'
    });
  } else if (trailer.year > currentYear + 1) {
    errors.push({
      field: 'year',
      message: `L'année ne peut pas être supérieure à ${currentYear + 1}`,
      severity: 'error'
    });
  } else if (trailer.year < currentYear - 10) {
    warnings.push({
      field: 'year',
      message: 'Cette remorque a plus de 10 ans. Vérifiez l\'éligibilité à la garantie.',
      severity: 'warning'
    });
  }

  // Type
  if (!trailer.trailerType || trailer.trailerType.trim().length === 0) {
    errors.push({
      field: 'trailerType',
      message: 'Le type de remorque est requis',
      severity: 'error'
    });
  }

  // Prix d'achat
  if (!trailer.purchasePrice || trailer.purchasePrice <= 0) {
    errors.push({
      field: 'purchasePrice',
      message: 'Le prix d\'achat doit être supérieur à 0 $',
      severity: 'error'
    });
  } else if (trailer.purchasePrice < 500) {
    warnings.push({
      field: 'purchasePrice',
      message: 'Le prix d\'achat semble très bas. Veuillez vérifier.',
      severity: 'warning'
    });
  } else if (trailer.purchasePrice > 100000) {
    warnings.push({
      field: 'purchasePrice',
      message: 'Le prix d\'achat est très élevé. Vérifiez l\'éligibilité à la garantie.',
      severity: 'warning'
    });
  }

  // Date d'achat
  if (!trailer.purchaseDate) {
    errors.push({
      field: 'purchaseDate',
      message: 'La date d\'achat est requise',
      severity: 'error'
    });
  } else {
    const purchaseDate = new Date(trailer.purchaseDate);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (purchaseDate > today) {
      errors.push({
        field: 'purchaseDate',
        message: 'La date d\'achat ne peut pas être dans le futur',
        severity: 'error'
      });
    } else if (purchaseDate < oneYearAgo) {
      warnings.push({
        field: 'purchaseDate',
        message: 'L\'achat date de plus d\'un an. Vérifiez l\'éligibilité à la garantie.',
        severity: 'warning'
      });
    }
  }

  // Date de fin de garantie fabricant
  if (!trailer.manufacturerWarrantyEndDate) {
    errors.push({
      field: 'manufacturerWarrantyEndDate',
      message: 'La date de fin de garantie fabricant est requise',
      severity: 'error'
    });
  } else {
    const warrantyEndDate = new Date(trailer.manufacturerWarrantyEndDate);
    const purchaseDate = new Date(trailer.purchaseDate);

    if (warrantyEndDate < purchaseDate) {
      errors.push({
        field: 'manufacturerWarrantyEndDate',
        message: 'La date de fin de garantie ne peut pas être antérieure à la date d\'achat',
        severity: 'error'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide la sélection de la garantie
 */
export function validateWarrantySelection(
  planId: string | null,
  duration: number,
  deductible: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Plan sélectionné
  if (!planId) {
    errors.push({
      field: 'plan',
      message: 'Vous devez sélectionner un plan de garantie',
      severity: 'error'
    });
  }

  // Durée
  if (duration < 12) {
    errors.push({
      field: 'duration',
      message: 'La durée minimale est de 12 mois',
      severity: 'error'
    });
  } else if (duration > 60) {
    errors.push({
      field: 'duration',
      message: 'La durée maximale est de 60 mois',
      severity: 'error'
    });
  }

  // Franchise
  if (deductible < 0) {
    errors.push({
      field: 'deductible',
      message: 'La franchise ne peut pas être négative',
      severity: 'error'
    });
  } else if (deductible > 2000) {
    errors.push({
      field: 'deductible',
      message: 'La franchise maximale est de 2 000 $',
      severity: 'error'
    });
  } else if (deductible > 1000) {
    warnings.push({
      field: 'deductible',
      message: 'Une franchise élevée peut réduire l\'attrait de la garantie pour le client',
      severity: 'warning'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide le formulaire complet
 */
export function validateCompleteForm(
  customer: CustomerFormData,
  trailer: TrailerFormData,
  planId: string | null,
  duration: number,
  deductible: number
): ValidationResult {
  const customerValidation = validateCustomer(customer);
  const trailerValidation = validateTrailer(trailer);
  const warrantyValidation = validateWarrantySelection(planId, duration, deductible);

  return {
    isValid: customerValidation.isValid && trailerValidation.isValid && warrantyValidation.isValid,
    errors: [
      ...customerValidation.errors,
      ...trailerValidation.errors,
      ...warrantyValidation.errors
    ],
    warnings: [
      ...customerValidation.warnings,
      ...trailerValidation.warnings,
      ...warrantyValidation.warnings
    ]
  };
}
