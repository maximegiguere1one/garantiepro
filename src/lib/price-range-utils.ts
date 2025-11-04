/**
 * Utilitaires pour gérer les barèmes de limites de réclamation
 * selon la valeur de la remorque
 */

export interface PriceRange {
  min_price: number;
  max_price: number;
  max_claim_amount: number;
}

export interface MaxClaimLimits {
  type?: 'price_range' | 'fixed';
  ranges?: PriceRange[];
  max_total_amount?: number;
  max_per_claim?: number;
  max_claims_count?: number | null;
}

/**
 * Calcule la limite de réclamation selon le prix d'achat de la remorque
 * @param purchasePrice Prix d'achat de la remorque
 * @param maxClaimLimits Configuration des limites (barème ou fixe)
 * @returns Le montant maximum de réclamation applicable
 */
export function calculateMaxClaimAmount(
  purchasePrice: number,
  maxClaimLimits: MaxClaimLimits | null
): number | null {
  if (!maxClaimLimits) {
    return null; // Illimité
  }

  // Si c'est un barème par tranches de prix
  if (maxClaimLimits.type === 'price_range' && Array.isArray(maxClaimLimits.ranges)) {
    // Trouver la tranche correspondante
    const matchingRange = maxClaimLimits.ranges.find(
      (range) => purchasePrice >= range.min_price && purchasePrice <= range.max_price
    );

    if (matchingRange) {
      return matchingRange.max_claim_amount;
    }

    // Si aucune tranche ne correspond, retourner null (illimité)
    return null;
  }

  // Si c'est un montant fixe
  if (maxClaimLimits.max_total_amount != null && maxClaimLimits.max_total_amount > 0) {
    return maxClaimLimits.max_total_amount;
  }

  // Par défaut, illimité
  return null;
}

/**
 * Formate le montant de limite pour l'affichage
 * @param amount Montant ou null pour illimité
 * @returns Chaîne formatée
 */
export function formatMaxClaimAmount(amount: number | null): string {
  if (amount === null) {
    return 'Illimitée';
  }
  return `${amount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

/**
 * Valide que les tranches de prix ne se chevauchent pas
 * @param ranges Tableau des tranches de prix
 * @returns true si valide, message d'erreur sinon
 */
export function validatePriceRanges(ranges: PriceRange[]): { valid: boolean; error?: string } {
  if (ranges.length === 0) {
    return { valid: false, error: 'Au moins une tranche de prix est requise' };
  }

  // Trier les tranches par prix minimum
  const sorted = [...ranges].sort((a, b) => a.min_price - b.min_price);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Vérifier que min < max
    if (current.min_price >= current.max_price) {
      return {
        valid: false,
        error: `Tranche ${i + 1}: le prix minimum (${current.min_price}) doit être inférieur au prix maximum (${current.max_price})`
      };
    }

    // Vérifier que le montant de réclamation est positif
    if (current.max_claim_amount <= 0) {
      return {
        valid: false,
        error: `Tranche ${i + 1}: le montant de réclamation doit être positif`
      };
    }

    // Vérifier le chevauchement avec la tranche suivante
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (current.max_price >= next.min_price) {
        return {
          valid: false,
          error: `Tranche ${i + 1} (${current.min_price}-${current.max_price}) chevauche la tranche ${i + 2} (${next.min_price}-${next.max_price})`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Retourne un exemple de barème pour documentation
 */
export function getExamplePriceRanges(): PriceRange[] {
  return [
    { min_price: 0, max_price: 10000, max_claim_amount: 1500 },
    { min_price: 10001, max_price: 30000, max_claim_amount: 3000 },
    { min_price: 30001, max_price: 70000, max_claim_amount: 5000 },
    { min_price: 70001, max_price: 999999999, max_claim_amount: 7500 }
  ];
}
