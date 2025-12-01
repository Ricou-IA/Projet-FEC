/**
 * Configuration centralisée de l'application FEC Analyzer V2
 * 
 * Point d'entrée unique pour toute la configuration.
 * 
 * @example
 * import { UI_CONFIG, APP_CONFIG, NAV_CONFIG } from './config';
 * 
 * // Utilisation
 * console.log(UI_CONFIG.APP_LABELS.TITLE);
 * console.log(APP_CONFIG.FILE_CONFIG.MAX_SIZE_MB);
 * console.log(NAV_CONFIG.NAVIGATION_STRUCTURE);
 * 
 * @module config
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS GROUPÉS PAR FICHIER
// ═══════════════════════════════════════════════════════════════════════════

// Configuration UI (labels, couleurs, messages, formatage)
export * from './ui.config';

// Configuration Application (fichiers, API, paramètres techniques)
export * from './app.config';

// Configuration Navigation (structure des onglets)
export * from './navigation.config';

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS NOMMÉS POUR USAGE SIMPLIFIÉ
// ═══════════════════════════════════════════════════════════════════════════

import * as UI from './ui.config';
import * as APP from './app.config';
import * as NAV from './navigation.config';

/**
 * Configuration UI regroupée
 */
export const UI_CONFIG = {
  ...UI,
};

/**
 * Configuration Application regroupée
 */
export const APP_CONFIG = {
  ...APP,
};

/**
 * Configuration Navigation regroupée
 */
export const NAV_CONFIG = {
  ...NAV,
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  UI: UI_CONFIG,
  APP: APP_CONFIG,
  NAV: NAV_CONFIG,
};