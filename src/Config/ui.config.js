/**
 * Configuration de l'interface utilisateur
 * 
 * Centralise tous les labels, couleurs et messages affichés dans l'application.
 * Modifier ces valeurs impactera toute l'application.
 * 
 * @module config/ui.config
 */

// ═══════════════════════════════════════════════════════════════════════════
// LABELS DE L'APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Titre et description de l'application
 */
export const APP_LABELS = {
    TITLE: 'TRADUCTION ET ANALYSE DE FICHIERS FEC',
    SUBTITLE: 'La donnée facile à analyser pour les experts comptables et les entreprises.',
  };
  
  /**
   * Labels des exercices comptables
   */
  export const EXERCICE_LABELS = {
    N: 'Exercice N',
    N_ACTUEL: 'Exercice N (Actuel)',
    N1: 'Exercice N-1',
    N1_PRECEDENT: 'Exercice N-1 (Précédent)',
    OPTIONNEL: '(optionnel)',
  };
  
  /**
   * Labels des boutons d'action
   */
  export const BUTTON_LABELS = {
    TELECHARGER_EXEMPLE: 'Télécharger un fichier d\'exemple',
    EXPORTER_BALANCE: 'Exporter la balance',
    RECHERCHER: 'Rechercher',
  };
  
  /**
   * Labels des modes d'affichage (CyclesView)
   */
  export const VIEW_MODE_LABELS = {
    PAR_ECRITURE: 'Par écriture',
    PAR_SOLDE: 'Par solde',
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGES DE NOTIFICATION (TOASTS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Messages de succès
   */
  export const SUCCESS_MESSAGES = {
    FILE_N_LOADED: (count) => `Fichier Exercice N chargé avec succès (${count.toLocaleString('fr-FR')} écritures)`,
    FILE_N1_LOADED: (count) => `Fichier Exercice N-1 chargé avec succès (${count.toLocaleString('fr-FR')} écritures)`,
    SAMPLE_DOWNLOADED: 'Fichier d\'exemple téléchargé avec succès',
    BALANCE_EXPORTED: 'Balance comptable exportée avec succès',
  };
  
  /**
   * Messages d'erreur
   */
  export const ERROR_MESSAGES = {
    FILE_N_ERROR: (msg) => `Erreur Exercice N: ${msg}`,
    FILE_N1_ERROR: (msg) => `Erreur Exercice N-1: ${msg}`,
    EXPORT_ERROR: (msg) => `Erreur lors de l'export : ${msg}`,
    GENERIC_ERROR: 'Une erreur est survenue',
    SIREN_INVALID: 'Numéro SIREN invalide (9 chiffres requis)',
    ENTREPRISE_NOT_FOUND: 'Entreprise non trouvée',
  };
  
  /**
   * Messages de chargement
   */
  export const LOADING_MESSAGES = {
    PROCESSING_FILES: 'Traitement des fichiers FEC en cours...',
    PROCESSING_N: 'Traitement Exercice N en cours...',
    PROCESSING_N1: 'Traitement Exercice N-1 en cours...',
    SEARCHING_ENTREPRISE: 'Recherche en cours...',
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COULEURS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Palette de couleurs pour les graphiques
   * Utilisée dans les graphiques Recharts et D3
   */
  export const CHART_COLORS = {
    // Couleurs principales
    PRIMARY: '#4F46E5',    // Indigo
    SECONDARY: '#7C3AED',  // Violet
    SUCCESS: '#10B981',    // Vert
    DANGER: '#EF4444',     // Rouge
    WARNING: '#F59E0B',    // Orange
    INFO: '#3B82F6',       // Bleu
    
    // Palette pour les cycles (correspondance avec cycles-definition.json)
    CYCLES: {
      ACHATS_FOURNISSEURS: '#FF6B6B',
      VENTES_CLIENTS: '#4ECDC4',
      TRESORERIE: '#95E1D3',
      IMMOBILISATIONS: '#F38181',
      STOCKS: '#AA96DA',
      PERSONNEL: '#FCBAD3',
      ETAT_TAXES: '#FFFFD2',
      FINANCIER: '#A8E6CF',
      CAPITAUX: '#FFD3B6',
      OPERATIONS_DIVERSES: '#DCEDC1',
      CLOTURE: '#C7CEEA',
    },
    
    // Couleurs pour comparaison N vs N-1
    EXERCICE_N: '#4F46E5',
    EXERCICE_N1: '#9CA3AF',
    VARIATION_POSITIVE: '#10B981',
    VARIATION_NEGATIVE: '#EF4444',
  };
  
  /**
   * Couleurs des toasts par type
   */
  export const TOAST_COLORS = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
    },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FORMAT DES NOMBRES ET DATES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Configuration du formatage des nombres
   */
  export const NUMBER_FORMAT = {
    LOCALE: 'fr-FR',
    CURRENCY: 'EUR',
    DECIMALS: 2,
    CURRENCY_OPTIONS: {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    PERCENT_OPTIONS: {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  };
  
  /**
   * Configuration du formatage des dates
   */
  export const DATE_FORMAT = {
    LOCALE: 'fr-FR',
    SHORT: { day: '2-digit', month: '2-digit', year: 'numeric' },
    LONG: { day: 'numeric', month: 'long', year: 'numeric' },
    MONTH_YEAR: { month: 'long', year: 'numeric' },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS DE FORMATAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Formate un nombre en devise (EUR)
   * @param {number} value - Valeur à formater
   * @returns {string} Valeur formatée (ex: "1 234,56 €")
   */
  export const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat(NUMBER_FORMAT.LOCALE, NUMBER_FORMAT.CURRENCY_OPTIONS).format(value);
  };
  
  /**
   * Formate un nombre avec séparateurs de milliers
   * @param {number} value - Valeur à formater
   * @returns {string} Valeur formatée (ex: "1 234 567")
   */
  export const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat(NUMBER_FORMAT.LOCALE).format(value);
  };
  
  /**
   * Formate un pourcentage
   * @param {number} value - Valeur décimale (ex: 0.15 pour 15%)
   * @returns {string} Valeur formatée (ex: "15,0 %")
   */
  export const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat(NUMBER_FORMAT.LOCALE, NUMBER_FORMAT.PERCENT_OPTIONS).format(value);
  };