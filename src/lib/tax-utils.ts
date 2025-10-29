/**
 * Utilitaires de calcul de taxes canadiennes
 * Évite les erreurs 400 avec validation stricte
 */

export interface TaxRates {
  gst_rate?: number;
  qst_rate?: number;
  pst_rate?: number;
  hst_rate?: number;
  apply_gst?: boolean;
  apply_qst?: boolean;
  apply_pst?: boolean;
  apply_hst?: boolean;
}

export interface TaxCalculation {
  subtotal: number;
  gst: number;
  qst: number;
  pst: number;
  hst: number;
  total: number;
}

/**
 * Sanitize rate - évite NaN et valeurs invalides qui causent des 400
 */
export function sanitizeRate(value: unknown): number {
  if (typeof value === 'number' && isFinite(value) && value >= 0) {
    return value;
  }
  return 0;
}

/**
 * Calcul des taxes québécoises (QST sur base + TPS)
 * Formule correcte: QST s'applique sur montant TTC (incluant GST)
 */
export function computeQcTaxes(
  subtotal: number,
  gstRate: number = 5.0,
  qstRate: number = 9.975
): { gst: number; qst: number; total: number } {
  const cleanSubtotal = sanitizeRate(subtotal);
  const cleanGst = sanitizeRate(gstRate) / 100;
  const cleanQst = sanitizeRate(qstRate) / 100;

  // GST sur le montant de base
  const gst = +(cleanSubtotal * cleanGst).toFixed(2);
  
  // QST sur (base + GST)
  const qstBase = cleanSubtotal + gst;
  const qst = +(qstBase * cleanQst).toFixed(2);
  
  // Total final
  const total = +(cleanSubtotal + gst + qst).toFixed(2);

  return { gst, qst, total };
}

/**
 * Calcul de taxes canadiennes complet (tous types)
 */
export function calculateCanadianTaxes(
  subtotal: number,
  rates: TaxRates
): TaxCalculation {
  const cleanSubtotal = sanitizeRate(subtotal);
  
  let gst = 0;
  let qst = 0;
  let pst = 0;
  let hst = 0;

  // GST (fédérale - appliquée en premier)
  if (rates.apply_gst && rates.gst_rate) {
    gst = +(cleanSubtotal * (sanitizeRate(rates.gst_rate) / 100)).toFixed(2);
  }

  // QST (Québec - sur base + GST)
  if (rates.apply_qst && rates.qst_rate) {
    const qstBase = cleanSubtotal + gst;
    qst = +(qstBase * (sanitizeRate(rates.qst_rate) / 100)).toFixed(2);
  }

  // PST (provinciale - sur base seulement)
  if (rates.apply_pst && rates.pst_rate) {
    pst = +(cleanSubtotal * (sanitizeRate(rates.pst_rate) / 100)).toFixed(2);
  }

  // HST (harmonisée - remplace GST+PST)
  if (rates.apply_hst && rates.hst_rate) {
    hst = +(cleanSubtotal * (sanitizeRate(rates.hst_rate) / 100)).toFixed(2);
  }

  const total = +(cleanSubtotal + gst + qst + pst + hst).toFixed(2);

  return {
    subtotal: cleanSubtotal,
    gst,
    qst,
    pst,
    hst,
    total,
  };
}

/**
 * Format rate pour affichage (évite "5.0000000001")
 */
export function formatTaxRate(rate: number): string {
  return sanitizeRate(rate).toFixed(3);
}

/**
 * Validation de settings avant upsert (évite 400)
 */
export function sanitizeTaxSettings(settings: Partial<TaxRates> & { 
  user_id?: string;
  organization_id?: string;
}): Record<string, any> {
  return {
    user_id: settings.user_id || '',
    organization_id: settings.organization_id || '',
    gst_rate: sanitizeRate(settings.gst_rate),
    qst_rate: sanitizeRate(settings.qst_rate),
    pst_rate: sanitizeRate(settings.pst_rate),
    hst_rate: sanitizeRate(settings.hst_rate),
    apply_gst: Boolean(settings.apply_gst),
    apply_qst: Boolean(settings.apply_qst),
    apply_pst: Boolean(settings.apply_pst),
    apply_hst: Boolean(settings.apply_hst),
    tax_number_gst: String(settings.tax_number_gst || '').trim(),
    tax_number_qst: String(settings.tax_number_qst || '').trim(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Provinces canadiennes avec taux par défaut
 */
export const CANADIAN_TAX_RATES: Record<string, TaxRates> = {
  QC: { gst_rate: 5.0, qst_rate: 9.975, pst_rate: 0, hst_rate: 0, apply_gst: true, apply_qst: true, apply_pst: false, apply_hst: false },
  ON: { gst_rate: 0, qst_rate: 0, pst_rate: 0, hst_rate: 13.0, apply_gst: false, apply_qst: false, apply_pst: false, apply_hst: true },
  NS: { gst_rate: 0, qst_rate: 0, pst_rate: 0, hst_rate: 15.0, apply_gst: false, apply_qst: false, apply_pst: false, apply_hst: true },
  NB: { gst_rate: 0, qst_rate: 0, pst_rate: 0, hst_rate: 15.0, apply_gst: false, apply_qst: false, apply_pst: false, apply_hst: true },
  NL: { gst_rate: 0, qst_rate: 0, pst_rate: 0, hst_rate: 15.0, apply_gst: false, apply_qst: false, apply_pst: false, apply_hst: true },
  PE: { gst_rate: 0, qst_rate: 0, pst_rate: 0, hst_rate: 15.0, apply_gst: false, apply_qst: false, apply_pst: false, apply_hst: true },
  BC: { gst_rate: 5.0, qst_rate: 0, pst_rate: 7.0, hst_rate: 0, apply_gst: true, apply_qst: false, apply_pst: true, apply_hst: false },
  AB: { gst_rate: 5.0, qst_rate: 0, pst_rate: 0, hst_rate: 0, apply_gst: true, apply_qst: false, apply_pst: false, apply_hst: false },
  SK: { gst_rate: 5.0, qst_rate: 0, pst_rate: 6.0, hst_rate: 0, apply_gst: true, apply_qst: false, apply_pst: true, apply_hst: false },
  MB: { gst_rate: 5.0, qst_rate: 0, pst_rate: 7.0, hst_rate: 0, apply_gst: true, apply_qst: false, apply_pst: true, apply_hst: false },
  YT: { gst_rate: 5.0, qst_rate: 0, pst_rate: 0, hst_rate: 0, apply_gst: true, apply_qst: false, apply_pst: false, apply_hst: false },
  NT: { gst_rate: 5.0, qst_rate: 0, pst_rate: 0, hst_rate: 0, apply_gst: true, apply_qst: false, apply_pst: false, apply_hst: false },
  NU: { gst_rate: 5.0, qst_rate: 0, pst_rate: 0, hst_rate: 0, apply_gst: true, apply_qst: false, apply_pst: false, apply_hst: false },
};
