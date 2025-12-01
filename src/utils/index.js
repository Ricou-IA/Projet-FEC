/**
 * Barrel export pour les utilitaires
 * 
 * Permet des imports simplifiés :
 * import { analyzeFec, formatCurrency, exportBalanceComptable } from './utils';
 * 
 * @module utils
 */

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSE FEC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyse les écritures FEC et les répartit par cycle d'audit
 */
export { analyzeFec } from './fecCycleAnalyzer';

// ═══════════════════════════════════════════════════════════════════════════
// FORMATAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fonctions de formatage (devises, dates, pourcentages)
 */
export { 
  formatCurrency, 
  formatDate, 
  formatPercent,
  formatCurrencyNoDecimals 
} from './formatters';

/**
 * Fonctions de manipulation des couleurs
 */
export { 
  hexToRgb, 
  rgbToHsl, 
  hslToRgb, 
  rgbToHex, 
  brightenColor, 
  darkenColor, 
  hexToRgba, 
  getContrastColor, 
  generatePalette 
} from './colors';

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export de la balance comptable au format Excel
 */
export { exportBalanceComptable } from './balanceExporter';

// ═══════════════════════════════════════════════════════════════════════════
// FICHIERS D'EXEMPLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Génère un fichier FEC d'exemple pour les démonstrations
 */
export { createSampleFECFile } from './sampleFEC';

// ═══════════════════════════════════════════════════════════════════════════
// CALCULS AUDIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcul des seuils de signification pour l'audit
 */
export { calculerSeuilsAudit, formatSeuil } from './seuilCalculator';