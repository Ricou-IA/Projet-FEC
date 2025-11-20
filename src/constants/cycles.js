/**
 * Définitions des Cycles Comptables CNCC
 * 
 * Conforme aux recommandations de la Compagnie Nationale des Commissaires aux Comptes
 * 
 * @module constants/cycles
 */

export const CYCLES_DEFINITION = {
  'ACHATS_FOURNISSEURS': {
    nom: 'Cycle Achats / Fournisseurs',
    description: 'Achats de biens et services, dettes fournisseurs',
    color: '#FF6B6B',
    comptesPrincipaux: ['40', '401', '403', '404', '405', '408', '60', '61', '62'],
    journaux: ['ACH', 'ACHAT']
  },
  'VENTES_CLIENTS': {
    nom: 'Cycle Ventes / Clients',
    description: 'Ventes de biens et services, créances clients',
    color: '#4ECDC4',
    comptesPrincipaux: ['41', '411', '413', '416', '418', '70', '701', '706', '707', '708', '709'],
    journaux: ['VT', 'VENTE']
  },
  'TRESORERIE': {
    nom: 'Cycle Trésorerie',
    description: 'Banques, caisses, opérations financières',
    color: '#95E1D3',
    comptesPrincipaux: ['51', '512', '514', '53', '531', '54'],
    journaux: ['BQ', 'BANQUE', 'CA', 'CAISSE']
  },
  'IMMOBILISATIONS': {
    nom: 'Cycle Immobilisations',
    description: 'Actifs immobilisés corporels et incorporels',
    color: '#F38181',
    comptesPrincipaux: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'],
    journaux: ['IMM', 'IMMOB']
  },
  'STOCKS': {
    nom: 'Cycle Stocks',
    description: 'Stocks de marchandises, matières premières et produits',
    color: '#AA96DA',
    comptesPrincipaux: ['31', '32', '33', '34', '35', '36', '37', '38', '39', '603', '713'],
    journaux: ['STK', 'STOCK']
  },
  'PERSONNEL': {
    nom: 'Cycle Personnel / Paie',
    description: 'Rémunérations, charges sociales',
    color: '#FCBAD3',
    comptesPrincipaux: ['42', '421', '422', '423', '424', '425', '426', '427', '428', '43', '44', '64', '641', '645', '646', '647', '648'],
    journaux: ['PAI', 'PAIE', 'SAL', 'SALAIRE']
  },
  'ETAT_TAXES': {
    nom: 'Cycle État / Taxes',
    description: 'TVA, impôts et taxes',
    color: '#FFFFD2',
    comptesPrincipaux: ['44', '445', '4456', '4457', '63', '635', '69', '695'],
    journaux: ['TVA', 'OD']
  },
  'FINANCIER': {
    nom: 'Cycle Financier / Emprunts',
    description: 'Emprunts, dettes financières, produits et charges financiers',
    color: '#A8E6CF',
    comptesPrincipaux: ['16', '17', '50', '66', '76'],
    journaux: ['FIN', 'EMPRUNT']
  },
  'CAPITAUX': {
    nom: 'Cycle Capitaux Propres',
    description: 'Capital, réserves, résultat',
    color: '#FFD3B6',
    comptesPrincipaux: ['10', '11', '12', '13', '14', '15'],
    journaux: ['CAP', 'CAPITAL']
  },
  'OPERATIONS_DIVERSES': {
    nom: 'Cycle Opérations Diverses',
    description: 'Écritures diverses, transferts de charges, provisions',
    color: '#DCEDC1',
    comptesPrincipaux: ['15', '19', '45', '46', '47', '48', '49', '58', '65', '67', '68', '75', '77', '78', '79'],
    journaux: ['OD', 'OPER']
  },
  'CLOTURE': {
    nom: 'Cycle Clôture / À-nouveaux',
    description: 'Écritures de clôture, à-nouveaux',
    color: '#C7CEEA',
    comptesPrincipaux: ['89', '88'],
    journaux: ['AN', 'CLO', 'CLOTURE']
  }
};

/**
 * Récupère la liste des codes de cycles
 */
export const getCycleCodes = () => Object.keys(CYCLES_DEFINITION);

/**
 * Récupère les informations d'un cycle par son code
 */
export const getCycleInfo = (cycleCode) => CYCLES_DEFINITION[cycleCode] || null;

/**
 * Récupère tous les cycles avec leur code
 */
export const getAllCycles = () => 
  Object.entries(CYCLES_DEFINITION).map(([code, info]) => ({
    code,
    ...info
  }));
