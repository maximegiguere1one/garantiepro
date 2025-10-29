import { addYears, differenceInDays, differenceInYears } from 'date-fns';

export interface ClaimValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedApproval: number;
  franchiseApplied: number;
  remainingLimit: number;
}

export interface WarrantyCalculations {
  annualLimit: number;
  loyaltyCredit: number;
  warrantyYear: number;
  pprStartDate: Date;
  pprEndDate: Date;
  nextEntretienDue: Date;
  durationMonths: number;
}

/**
 * Calcule la limite annuelle de réclamation selon la valeur d'achat
 * Grille PPR:
 * - 0$ à 5 000$ → 1 000$/an
 * - 5 001$ à 10 000$ → 1 500$/an
 * - 10 001$ à 20 000$ → 2 000$/an
 * - 20 001$ à 30 000$ → 3 000$/an
 * - 30 001$ à 40 000$ → 3 500$/an
 * - 40 001$ à 70 000$ → 4 000$/an
 */
export function calculateAnnualLimit(purchasePrice: number): number {
  if (purchasePrice <= 5000) return 1000;
  if (purchasePrice <= 10000) return 1500;
  if (purchasePrice <= 20000) return 2000;
  if (purchasePrice <= 30000) return 3000;
  if (purchasePrice <= 40000) return 3500;
  if (purchasePrice <= 70000) return 4000;
  return 4000;
}

/**
 * Calcule le crédit de fidélité selon la valeur d'achat
 * - Remorque ≤ 10 000$ → 250$ de crédit
 * - Remorque > 10 000$ → 500$ de crédit
 * - NON applicable sur remorques en promotion
 */
export function calculateLoyaltyCredit(
  purchasePrice: number,
  isPromotional: boolean
): number {
  if (isPromotional) {
    return 0;
  }

  if (purchasePrice <= 10000) {
    return 250;
  } else {
    return 500;
  }
}

/**
 * Calcule l'année de garantie en cours (1 à 6)
 * La garantie PPR débute après la fin de la garantie fabricant
 */
export function calculateWarrantyYear(
  pprStartDate: Date,
  currentDate: Date = new Date()
): number {
  const yearsDiff = differenceInYears(currentDate, pprStartDate);
  return Math.min(Math.max(yearsDiff + 1, 1), 6);
}

/**
 * Vérifie si l'entretien annuel est à jour
 * L'entretien doit être fait chaque année pour maintenir la garantie
 */
export function isEntretienUpToDate(
  lastEntretienDate: Date | null,
  pprStartDate: Date,
  warrantyYear: number
): boolean {
  if (!lastEntretienDate) {
    return warrantyYear === 1;
  }

  const expectedEntretienDate = addYears(pprStartDate, warrantyYear - 1);
  const daysSinceExpected = differenceInDays(new Date(), expectedEntretienDate);

  return daysSinceExpected <= 365;
}

/**
 * Vérifie si une date est dans la période de garantie PPR (6 ans)
 */
export function isWithinWarrantyPeriod(
  pprStartDate: Date,
  pprEndDate: Date,
  dateToCheck: Date
): boolean {
  return dateToCheck >= pprStartDate && dateToCheck <= pprEndDate;
}

/**
 * Détecte les exclusions dans la description de réclamation
 */
export function detectExclusions(description: string): string[] {
  const exclusions: string[] = [];
  const keywords = description.toLowerCase();

  const exclusionMap: Record<string, string[]> = {
    'Dommages causés par accident - NON COUVERT': ['accident', 'collision', 'impact'],
    'Incendie - NON COUVERT': ['incendie', 'feu', 'brûlé', 'brulé'],
    'Vol - NON COUVERT': ['vol', 'volé', 'volée'],
    'Vandalisme - NON COUVERT': ['vandalisme', 'vandalisé', 'vandalisée', 'graffiti'],
    'Catastrophe naturelle - NON COUVERTE': [
      'inondation',
      'tempête',
      'ouragan',
      'tremblement',
      'grêle',
    ],
    'Surcharge - NON COUVERTE': ['surcharge', 'surpoids', 'trop lourd', 'excès de poids'],
    'Mauvaise utilisation - NON COUVERTE': [
      'mauvaise utilisation',
      'utilisation incorrecte',
      'mal utilisé',
    ],
    'Usure normale - NON COUVERTE': [
      'pneu',
      'pneus',
      'ampoule',
      'ampoules',
      'peinture',
      'cosmétique',
      'esthétique',
      'usure',
    ],
    'Modifications non approuvées - NON COUVERTES': ['modification', 'modifié', 'customisé'],
  };

  for (const [exclusion, keywordList] of Object.entries(exclusionMap)) {
    if (keywordList.some((keyword) => keywords.includes(keyword))) {
      exclusions.push(exclusion);
    }
  }

  return exclusions;
}

/**
 * Valide une réclamation selon les règles PPR
 */
export function validateClaim(
  claimData: {
    incidentDate: Date;
    description: string;
    estimatedCost: number;
  },
  warrantyData: {
    pprStartDate: Date;
    pprEndDate: Date;
    annualLimit: number;
    totalClaimedThisYear: number;
    franchiseAmount: number;
    lastEntretienDate: Date | null;
    warrantyYear: number;
  }
): ClaimValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    pprStartDate,
    pprEndDate,
    annualLimit,
    totalClaimedThisYear,
    franchiseAmount,
    lastEntretienDate,
    warrantyYear,
  } = warrantyData;

  const { incidentDate, description, estimatedCost } = claimData;

  // 1. Vérifier si dans période de garantie
  if (!isWithinWarrantyPeriod(pprStartDate, pprEndDate, incidentDate)) {
    errors.push('Date de l\'incident hors période de garantie PPR (6 ans)');
  }

  // 2. Vérifier entretien à jour
  if (!isEntretienUpToDate(lastEntretienDate, pprStartDate, warrantyYear)) {
    errors.push(
      'Entretien annuel non effectué - La garantie peut être NULLE selon les conditions générales'
    );
  }

  // 3. Vérifier exclusions
  const exclusions = detectExclusions(description);
  if (exclusions.length > 0) {
    errors.push(...exclusions);
  }

  // 4. Calculer limite restante
  const remainingLimit = annualLimit - totalClaimedThisYear;

  if (remainingLimit <= 0) {
    errors.push(
      `Limite annuelle atteinte: ${totalClaimedThisYear.toLocaleString('fr-CA')} $ / ${annualLimit.toLocaleString('fr-CA')} $`
    );
  }

  // 5. Avertissements sur la limite
  if (estimatedCost > remainingLimit && remainingLimit > 0) {
    warnings.push(
      `Coût estimé (${estimatedCost.toLocaleString('fr-CA')} $) dépasse la limite restante (${remainingLimit.toLocaleString('fr-CA')} $)`
    );
  }

  // 6. Calculer montant d'approbation estimé
  const costAfterFranchise = Math.max(0, estimatedCost - franchiseAmount);
  const estimatedApproval = Math.min(costAfterFranchise, remainingLimit);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    estimatedApproval: Math.max(0, estimatedApproval),
    franchiseApplied: estimatedCost > 0 ? franchiseAmount : 0,
    remainingLimit,
  };
}

/**
 * Calcule toutes les données de garantie PPR
 */
export function calculateWarrantyData(
  purchasePrice: number,
  manufacturerWarrantyEndDate: Date,
  isPromotional: boolean = false
): WarrantyCalculations {
  const pprStartDate = manufacturerWarrantyEndDate;
  const pprEndDate = addYears(pprStartDate, 6);
  const warrantyYear = calculateWarrantyYear(pprStartDate);
  const nextEntretienDue = addYears(pprStartDate, warrantyYear);

  // CRITIQUE: La durée PPR est TOUJOURS 6 ans = 72 mois
  const durationMonths = 72;

  return {
    annualLimit: calculateAnnualLimit(purchasePrice),
    loyaltyCredit: calculateLoyaltyCredit(purchasePrice, isPromotional),
    warrantyYear,
    pprStartDate,
    pprEndDate,
    nextEntretienDue,
    durationMonths,
  };
}

/**
 * Formate une limite annuelle pour l'affichage
 */
export function formatAnnualLimit(purchasePrice: number): string {
  const limit = calculateAnnualLimit(purchasePrice);
  return `${limit.toLocaleString('fr-CA')} $ / an`;
}

/**
 * Formate un crédit de fidélité pour l'affichage
 */
export function formatLoyaltyCredit(purchasePrice: number, isPromotional: boolean): string {
  const credit = calculateLoyaltyCredit(purchasePrice, isPromotional);
  if (credit === 0 && isPromotional) {
    return 'Non applicable (achat promotionnel)';
  }
  return `${credit.toLocaleString('fr-CA')} $`;
}
