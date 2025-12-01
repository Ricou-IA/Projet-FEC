/**
 * Configuration de l'application
 * 
 * Paramètres techniques, limites et endpoints API.
 * 
 * @module config/app.config
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION DES FICHIERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Limites et paramètres pour les fichiers FEC
 */
export const FILE_CONFIG = {
    // Taille maximale autorisée (en Mo)
    MAX_SIZE_MB: 50,
    
    // Extensions de fichiers acceptées
    ALLOWED_EXTENSIONS: ['.txt'],
    
    // Type MIME pour l'upload
    ACCEPT_TYPES: '.txt',
    
    // Délimiteur attendu dans les fichiers FEC
    DELIMITER: '\t', // Tabulation
    
    // Encodage attendu
    ENCODING: 'UTF-8',
    
    // Nom du fichier d'exemple téléchargeable
    SAMPLE_FILENAME: 'exemple_FEC.txt',
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ENDPOINTS API
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * URLs des APIs externes utilisées
   */
  export const API_ENDPOINTS = {
    // Recherche d'entreprise par SIREN (API Sirene)
    SIRENE_SEARCH: 'https://api.insee.fr/entreprises/sirene/V3.11/siren',
    
    // Alternative : API entreprise.data.gouv.fr (gratuite, sans clé)
    ENTREPRISE_DATA_GOUV: 'https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales',
  };
  
  /**
   * Configuration des requêtes API
   */
  export const API_CONFIG = {
    // Timeout en millisecondes
    TIMEOUT_MS: 10000,
    
    // Nombre de tentatives en cas d'échec
    RETRY_COUNT: 2,
    
    // Délai entre les tentatives (ms)
    RETRY_DELAY_MS: 1000,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PARAMÈTRES D'AFFICHAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Paramètres d'affichage et pagination
   */
  export const DISPLAY_CONFIG = {
    // Nombre de lignes par page dans les tableaux
    ROWS_PER_PAGE: 50,
    
    // Durée des animations CSS (ms)
    ANIMATION_DURATION_MS: 300,
    
    // Durée d'affichage des toasts (ms)
    TOAST_DURATION_MS: 5000,
    
    // Délai avant masquage automatique des messages (ms)
    AUTO_HIDE_DELAY_MS: 3000,
  };
  
  /**
   * Configuration des graphiques
   */
  export const CHART_CONFIG = {
    // Hauteur par défaut des graphiques (px)
    DEFAULT_HEIGHT: 300,
    
    // Marges des graphiques Recharts
    MARGINS: {
      top: 20,
      right: 30,
      bottom: 20,
      left: 40,
    },
    
    // Nombre de graduations sur l'axe Y
    Y_AXIS_TICKS: 5,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION SIREN
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Configuration de la validation SIREN
   */
  export const SIREN_CONFIG = {
    // Longueur exacte d'un SIREN
    LENGTH: 9,
    
    // Expression régulière de validation
    REGEX: /^\d{9}$/,
    
    // Message d'erreur
    ERROR_MESSAGE: 'Le SIREN doit contenir exactement 9 chiffres',
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION COMPTABLE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Paramètres comptables PCG
   */
  export const ACCOUNTING_CONFIG = {
    // Classes de comptes
    CLASSES: {
      CAPITAUX: '1',
      IMMOBILISATIONS: '2',
      STOCKS: '3',
      TIERS: '4',
      FINANCIER: '5',
      CHARGES: '6',
      PRODUITS: '7',
    },
    
    // Seuil de signification pour les écarts (en %)
    SIGNIFICANCE_THRESHOLD_PERCENT: 5,
    
    // Seuil de matérialité par défaut (en €)
    DEFAULT_MATERIALITY_EUR: 10000,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT PAR DÉFAUT
  // ═══════════════════════════════════════════════════════════════════════════
  
  export default {
    FILE_CONFIG,
    API_ENDPOINTS,
    API_CONFIG,
    DISPLAY_CONFIG,
    CHART_CONFIG,
    SIREN_CONFIG,
    ACCOUNTING_CONFIG,
  };