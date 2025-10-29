/**
 * Couleurs officielles de la marque Location Pro-Remorque
 * Basées sur le logo officiel
 */

export const BRAND_COLORS = {
  // Rouge Pro-Remorque (couleur principale)
  primary: {
    DEFAULT: '#DC2626',    // Rouge principal
    dark: '#B91C1C',       // Rouge foncé
    light: '#EF4444',      // Rouge clair
    50: '#FEF2F2',         // Rouge très pâle (backgrounds)
    100: '#FEE2E2',        // Rouge pâle
    200: '#FECACA',        // Rouge léger
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',        // Rouge brand
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Noir/Gris (couleur secondaire)
  secondary: {
    DEFAULT: '#1F2937',    // Noir du logo
    dark: '#111827',       // Noir très foncé
    light: '#374151',      // Gris foncé
  },

  // Gris neutres pour UI
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Couleurs sémantiques
  success: {
    DEFAULT: '#16A34A',
    light: '#22C55E',
    dark: '#15803D',
  },

  warning: {
    DEFAULT: '#F59E0B',
    light: '#FCD34D',
    dark: '#D97706',
  },

  error: {
    DEFAULT: '#DC2626',    // Utilise le rouge brand
    light: '#EF4444',
    dark: '#B91C1C',
  },

  info: {
    DEFAULT: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
  },
} as const;

/**
 * Dégradés de la marque
 */
export const BRAND_GRADIENTS = {
  primary: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
  primaryReverse: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)',
  hero: 'linear-gradient(135deg, #DC2626 0%, #1F2937 100%)',
  subtle: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
} as const;

/**
 * Ombres avec couleur rouge
 */
export const BRAND_SHADOWS = {
  sm: '0 1px 2px 0 rgba(220, 38, 38, 0.05)',
  md: '0 4px 6px -1px rgba(220, 38, 38, 0.1)',
  lg: '0 10px 15px -3px rgba(220, 38, 38, 0.1)',
  xl: '0 20px 25px -5px rgba(220, 38, 38, 0.1)',
  button: '0 2px 8px rgba(220, 38, 38, 0.3)',
} as const;
