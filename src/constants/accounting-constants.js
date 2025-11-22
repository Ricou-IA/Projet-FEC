/**
 * CONSTANTES COMPTABLES - PCG 2025
 * 
 * Centralisation de toutes les constantes utilisées dans l'application
 * pour améliorer la maintenabilité et la lisibilité du code.
 */

/**
 * Seuils de calcul
 */
export const SEUILS = {
  /** Seuil en dessous duquel un solde est considéré comme nul (1 centime) */
  SOLDE_NUL: 0.01,
  
  /** Seuil d'équilibre du bilan (1 centime) */
  EQUILIBRE_BILAN: 0.01,
  
  /** Seuil de matérialité par défaut (1% du total bilan) */
  MATERIALITE_DEFAULT: 0.01
};

/**
 * Classes de comptes PCG
 */
export const CLASSES_COMPTES = {
  /** Classes du bilan */
  BILAN: ['1', '2', '3', '4', '5'],
  
  /** Classes du compte de résultat */
  RESULTAT: ['6', '7'],
  
  /** Classe 1 - Capitaux propres */
  CAPITAUX: '1',
  
  /** Classe 2 - Immobilisations */
  IMMOBILISATIONS: '2',
  
  /** Classe 3 - Stocks */
  STOCKS: '3',
  
  /** Classe 4 - Tiers */
  TIERS: '4',
  
  /** Classe 5 - Financier */
  FINANCIER: '5',
  
  /** Classe 6 - Charges */
  CHARGES: '6',
  
  /** Classe 7 - Produits */
  PRODUITS: '7',
  
  /** Classe 8 - Comptes spéciaux */
  SPECIAUX: '8'
};

/**
 * Comptes correcteurs (diminuent la valeur d'autres comptes)
 */
export const COMPTES_CORRECTEURS = {
  /** Comptes correcteurs qui vont à l'ACTIF au lieu du PASSIF */
  ACTIF: [
    '109', // Capital souscrit non appelé
    '119', // Report à nouveau débiteur (perte)
    '129', // Résultat de l'exercice (perte)
    '139', // Subventions d'investissement inscrites au CR
    '169'  // Primes de remboursement des emprunts
  ],
  
  /** Comptes d'amortissements (classe 28) */
  AMORTISSEMENTS: ['280', '281', '282', '283', '284', '286', '287', '288'],
  
  /** Comptes de dépréciations (classe 29) */
  DEPRECIATIONS: ['290', '291', '292', '293', '296', '297'],
  
  /** Comptes de dépréciations d'actif circulant */
  DEPRECIATIONS_ACTIF_CIRCULANT: ['39', '49', '59']
};

/**
 * Comptes à double position (peuvent être à l'actif ou au passif)
 */
export const COMPTES_DOUBLE_POSITION = {
  /** Comptes clients (débiteur = actif, créditeur = passif) */
  CLIENTS: ['411', '413', '416', '417', '418'],
  
  /** Comptes fournisseurs (débiteur = actif, créditeur = passif) */
  FOURNISSEURS: ['401', '403', '404', '405', '408'],
  
  /** Comptes de trésorerie (débiteur = actif, créditeur = passif) */
  TRESORERIE: ['51', '52', '53', '54'],
  
  /** Personnel et organismes sociaux */
  PERSONNEL_SOCIAL: ['42', '43', '44'],
  
  /** Autres comptes de tiers */
  AUTRES_TIERS: ['45', '46', '47', '48']
};

/**
 * Catégories du compte de résultat
 */
export const CATEGORIES_RESULTAT = {
  EXPLOITATION: 'exploitation',
  FINANCIER: 'financier',
  EXCEPTIONNEL: 'exceptionnel'
};

/**
 * Types de charges
 */
export const TYPES_CHARGES = {
  /** Achats et variations de stocks */
  ACHATS: ['60', '61', '62'],
  
  /** Autres charges externes */
  EXTERNES: ['61', '62'],
  
  /** Impôts et taxes */
  IMPOTS_TAXES: ['63'],
  
  /** Charges de personnel */
  PERSONNEL: ['64'],
  
  /** Autres charges de gestion */
  GESTION: ['65'],
  
  /** Charges financières */
  FINANCIERES: ['66'],
  
  /** Charges exceptionnelles */
  EXCEPTIONNELLES: ['67'],
  
  /** Dotations aux amortissements */
  DOTATIONS_AMORT: ['681'],
  
  /** Dotations aux provisions */
  DOTATIONS_PROV: ['685', '686', '687'],
  
  /** Impôts sur les bénéfices */
  IS: ['695']
};

/**
 * Types de produits
 */
export const TYPES_PRODUITS = {
  /** Ventes de marchandises */
  MARCHANDISES: ['70'],
  
  /** Production vendue */
  PRODUCTION: ['71', '72'],
  
  /** Production stockée */
  STOCKAGE: ['713'],
  
  /** Production immobilisée */
  IMMOBILISEE: ['72'],
  
  /** Subventions d'exploitation */
  SUBVENTIONS: ['74'],
  
  /** Autres produits */
  AUTRES: ['75'],
  
  /** Produits financiers */
  FINANCIERS: ['76'],
  
  /** Produits exceptionnels */
  EXCEPTIONNELS: ['77'],
  
  /** Reprises sur amortissements et provisions */
  REPRISES: ['781', '786', '787']
};

/**
 * Structure du bilan PCG
 */
export const STRUCTURE_BILAN = {
  ACTIF: {
    IMMOBILISE: {
      INCORPORELLES: ['20'],
      CORPORELLES: ['21', '22'],
      EN_COURS: ['23'],
      FINANCIERES: ['26', '27']
    },
    CIRCULANT: {
      STOCKS: ['31', '32', '33', '34', '35', '37'],
      CREANCES: ['40', '41', '42', '43', '44', '45', '46', '47', '48'],
      TRESORERIE: ['50', '51', '53', '54']
    }
  },
  PASSIF: {
    CAPITAUX_PROPRES: ['10', '11', '12', '13', '14'],
    PROVISIONS: ['15'],
    DETTES_LONG_TERME: ['16', '17'],
    DETTES_COURT_TERME: ['40', '41', '42', '43', '44', '45', '46', '47', '48'],
    TRESORERIE: ['51', '52']
  }
};

/**
 * Formats d'affichage
 */
export const FORMATS = {
  /** Format monétaire avec 2 décimales */
  CURRENCY_FULL: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  
  /** Format monétaire sans décimales */
  CURRENCY_NO_DECIMALS: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
  
  /** Format pourcentage */
  PERCENTAGE: { minimumFractionDigits: 2, maximumFractionDigits: 2, style: 'percent' }
};

/**
 * Messages d'erreur standards
 */
export const ERREURS = {
  BILAN_NON_EQUILIBRE: 'Le bilan n\'est pas équilibré : Actif ≠ Passif',
  DONNEES_MANQUANTES: 'Données FEC manquantes ou invalides',
  COMPTE_INVALIDE: 'Numéro de compte invalide',
  FICHIER_VIDE: 'Le fichier FEC ne contient aucune donnée',
  COLONNES_MANQUANTES: 'Colonnes obligatoires manquantes dans le FEC'
};

/**
 * Validation des fichiers FEC
 */
export const VALIDATION_FEC = {
  /** Colonnes obligatoires dans un fichier FEC */
  COLONNES_OBLIGATOIRES: [
    'compteNum',
    'compteLibelle',
    'debit',
    'credit',
    'dateEcriture',
    'journalCode',
    'ecritureLib'
  ],
  
  /** Taille maximale du fichier (50 Mo) */
  TAILLE_MAX: 50 * 1024 * 1024,
  
  /** Extensions acceptées */
  EXTENSIONS: ['.txt', '.csv']
};

/**
 * Règles de calcul PCG
 */
export const REGLES_CALCUL = {
  /** Pour les charges : Solde = Débit - Crédit */
  CHARGES: (debit, credit) => debit - credit,
  
  /** Pour les produits : Solde = Crédit - Débit */
  PRODUITS: (debit, credit) => credit - debit,
  
  /** Pour les comptes d'actif : Solde débiteur */
  ACTIF: (debit, credit) => debit - credit,
  
  /** Pour les comptes de passif : Valeur absolue du solde créditeur */
  PASSIF: (debit, credit) => Math.abs(credit - debit)
};

/**
 * Mapping des amortissements vers les immobilisations
 */
export const MAPPING_AMORTISSEMENTS = {
  '280': '20', // Amortissements des immobilisations incorporelles
  '281': '21', // Amortissements des immobilisations corporelles
  '282': '22', // Amortissements des immobilisations mises en concession
  '283': '23', // Amortissements des immobilisations en cours (rare)
  '290': '20', // Dépréciations des immobilisations incorporelles
  '291': '21', // Dépréciations des immobilisations corporelles
  '292': '22', // Dépréciations des immobilisations mises en concession
  '293': '23', // Dépréciations des immobilisations en cours
  '296': '26', // Dépréciations des participations
  '297': '27'  // Dépréciations des autres immobilisations financières
};

export default {
  SEUILS,
  CLASSES_COMPTES,
  COMPTES_CORRECTEURS,
  COMPTES_DOUBLE_POSITION,
  CATEGORIES_RESULTAT,
  TYPES_CHARGES,
  TYPES_PRODUITS,
  STRUCTURE_BILAN,
  FORMATS,
  ERREURS,
  VALIDATION_FEC,
  REGLES_CALCUL,
  MAPPING_AMORTISSEMENTS
};
