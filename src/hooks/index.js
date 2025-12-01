/**
 * Barrel export pour tous les hooks personnalisés
 * 
 * Permet des imports simplifiés :
 * import { useToast, useEntrepriseSearch } from './hooks';
 * 
 * @module hooks
 */

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS DE DONNÉES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook pour générer les documents comptables (Bilan, SIG, Résultat, CashFlow)
 */
export { useFECDataGenerators } from './useFECDataGenerators';

/**
 * Hook pour obtenir les détails des comptes par cycle ou catégorie
 */
export { useAccountDetails } from './useAccountDetails';

/**
 * Hook pour calculer les données mensuelles des cycles
 */
export { useMonthlyData } from './useMonthlyData';

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS D'API / SERVICES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook pour la recherche d'entreprise par SIREN
 */
export { useEntrepriseSearch } from './useEntrepriseSearch';

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS D'UI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook pour gérer les notifications toast
 */
export { useToast } from './useToast';