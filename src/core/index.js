/**
 * Barrel export pour la logique métier (générateurs comptables)
 * 
 * Permet des imports simplifiés :
 * import { FECParser, BilanGenerator } from './core';
 * 
 * @module core
 */

// ═══════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parser de fichiers FEC (Fichier des Écritures Comptables)
 * Utilise un Web Worker pour le traitement en arrière-plan
 */
export { default as FECParser } from './FECParser';

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATEURS DE DOCUMENTS COMPTABLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Générateur de Bilan comptable (Actif / Passif)
 */
export { default as BilanGenerator } from './BilanGenerator';

/**
 * Générateur de Compte de Résultat (Charges / Produits)
 */
export { ResultatGenerator } from './ResultatGenerator';

/**
 * Générateur de SIG (Soldes Intermédiaires de Gestion)
 * Marge commerciale, VA, EBE, Résultat d'exploitation, etc.
 */
export { SIGGenerator } from './SIGGenerator';

/**
 * Générateur de Tableau des Flux de Trésorerie
 * Nécessite les données de 2 exercices (N et N-1)
 */
export { CashFlowGenerator } from './CashFlowGenerator';