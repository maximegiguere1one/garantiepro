import { z } from 'zod';

export const customerSchema = z.object({
  firstName: z.string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le prénom contient des caractères invalides'),

  lastName: z.string()
    .min(1, 'Le nom de famille est requis')
    .max(50, 'Le nom de famille ne peut dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom de famille contient des caractères invalides'),

  email: z.string()
    .email('Format d\'email invalide')
    .toLowerCase()
    .max(100, 'L\'email ne peut dépasser 100 caractères'),

  phone: z.string()
    .regex(/^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      'Format de téléphone invalide (XXX) XXX-XXXX'),

  address: z.string()
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(200, 'L\'adresse ne peut dépasser 200 caractères'),

  city: z.string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne peut dépasser 100 caractères'),

  province: z.enum([
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT'
  ], { errorMap: () => ({ message: 'Province invalide' }) }),

  postalCode: z.string()
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      'Code postal invalide (format: A1A 1A1)'),

  languagePreference: z.enum(['fr', 'en'], {
    errorMap: () => ({ message: 'Langue invalide' })
  }),

  consentMarketing: z.boolean()
});

export const trailerSchema = z.object({
  vin: z.string()
    .length(17, 'Le VIN doit contenir exactement 17 caractères')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Format de VIN invalide'),

  make: z.string()
    .min(1, 'La marque est requise')
    .max(50, 'La marque ne peut dépasser 50 caractères'),

  model: z.string()
    .min(1, 'Le modèle est requis')
    .max(50, 'Le modèle ne peut dépasser 50 caractères'),

  year: z.number()
    .int('L\'année doit être un nombre entier')
    .min(1990, 'L\'année doit être >= 1990')
    .max(new Date().getFullYear() + 1, 'L\'année ne peut être dans le futur'),

  trailerType: z.string()
    .min(1, 'Le type de remorque est requis')
    .max(50, 'Le type ne peut dépasser 50 caractères'),

  category: z.enum(['fermee', 'ouverte', 'utilitaire'], {
    errorMap: () => ({ message: 'Catégorie invalide' })
  }),

  purchaseDate: z.string()
    .datetime({ message: 'Format de date invalide' })
    .refine(
      (date) => new Date(date) <= new Date(),
      'La date d\'achat ne peut être dans le futur'
    ),

  purchasePrice: z.number()
    .positive('Le prix d\'achat doit être positif')
    .max(1000000, 'Le prix d\'achat semble irréaliste')
    .multipleOf(0.01, 'Le prix doit avoir au maximum 2 décimales'),

  manufacturerWarrantyEndDate: z.string()
    .datetime({ message: 'Format de date invalide' })
    .optional(),

  isPromotional: z.boolean()
});

export const warrantyPlanSchema = z.object({
  id: z.string().uuid('ID de plan invalide'),
  name: z.string().min(1, 'Le nom du plan est requis'),
  basePrice: z.number().positive('Le prix de base doit être positif'),
  duration: z.number()
    .int('La durée doit être un nombre entier')
    .min(12, 'La durée minimale est 12 mois')
    .max(60, 'La durée maximale est 60 mois'),
  deductible: z.number()
    .min(0, 'La franchise doit être >= 0')
    .max(2000, 'La franchise ne peut dépasser 2000$')
});

export const warrantyOptionSchema = z.object({
  id: z.string().uuid('ID d\'option invalide'),
  name: z.string().min(1, 'Le nom de l\'option est requis'),
  price: z.number().nonnegative('Le prix doit être >= 0'),
  description: z.string().optional()
});

export const warrantyCreationSchema = z.object({
  customer: customerSchema,
  trailer: trailerSchema,
  planId: z.string().uuid('ID de plan invalide'),
  selectedOptions: z.array(z.string().uuid()).default([]),

  pricing: z.object({
    subtotal: z.number().positive(),
    gst: z.number().nonnegative(),
    pst: z.number().nonnegative(),
    hst: z.number().nonnegative(),
    qst: z.number().nonnegative(),
    total: z.number().positive()
  }),

  signatures: z.object({
    customer: z.string().min(1, 'La signature du client est requise'),
    vendor: z.string().min(1, 'La signature du vendeur est requise')
  }).optional()
});

export const claimSchema = z.object({
  warrantyId: z.string().uuid('ID de garantie invalide'),

  description: z.string()
    .min(20, 'La description doit contenir au moins 20 caractères')
    .max(2000, 'La description ne peut dépasser 2000 caractères'),

  incidentDate: z.string()
    .datetime({ message: 'Format de date invalide' })
    .refine(
      (date) => new Date(date) <= new Date(),
      'La date d\'incident ne peut être dans le futur'
    ),

  location: z.string()
    .min(5, 'Le lieu doit contenir au moins 5 caractères')
    .max(200, 'Le lieu ne peut dépasser 200 caractères')
    .optional(),

  estimatedCost: z.number()
    .nonnegative('Le coût estimé doit être >= 0')
    .max(1000000, 'Le coût semble irréaliste')
    .optional(),

  status: z.enum([
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'completed'
  ], { errorMap: () => ({ message: 'Statut invalide' }) }),

  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Priorité invalide' })
  }).default('medium')
});

export const organizationSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut dépasser 100 caractères'),

  type: z.enum(['master', 'franchisee', 'dealer'], {
    errorMap: () => ({ message: 'Type d\'organisation invalide' })
  }),

  email: z.string().email('Format d\'email invalide').toLowerCase(),

  phone: z.string()
    .regex(/^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      'Format de téléphone invalide'),

  address: z.string().min(5, 'L\'adresse doit contenir au moins 5 caractères').optional(),

  commissionRate: z.number()
    .min(0, 'Le taux de commission doit être >= 0')
    .max(100, 'Le taux de commission ne peut dépasser 100%')
    .optional(),

  isActive: z.boolean().default(true)
});

export const userProfileSchema = z.object({
  email: z.string().email('Format d\'email invalide').toLowerCase(),

  firstName: z.string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut dépasser 50 caractères')
    .optional(),

  lastName: z.string()
    .min(1, 'Le nom est requis')
    .max(50, 'Le nom ne peut dépasser 50 caractères')
    .optional(),

  role: z.enum([
    'super_admin',
    'admin',
    'manager',
    'employee',
    'dealer',
    'user'
  ], { errorMap: () => ({ message: 'Rôle invalide' }) }),

  organizationId: z.string().uuid('ID d\'organisation invalide'),

  phoneNumber: z.string()
    .regex(/^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      'Format de téléphone invalide')
    .optional(),

  isActive: z.boolean().default(true)
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type TrailerInput = z.infer<typeof trailerSchema>;
export type WarrantyCreationInput = z.infer<typeof warrantyCreationSchema>;
export type ClaimInput = z.infer<typeof claimSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
