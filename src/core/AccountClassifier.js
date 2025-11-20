import reglesAffectation from '../data/regles-affectation-comptes.json';

/**
 * Classificateur de comptes selon le Plan Comptable Général (PCG) 2025
 * Utilise uniquement les règles officielles définies dans regles-affectation-comptes.json
 */
class AccountClassifier {
  constructor() {
    this.rules = reglesAffectation;
    this.cache = new Map(); // Cache pour optimiser les recherches
  }

  /**
   * Normalise le numéro de compte (supprime les espaces, convertit en string)
   * @param {string|number} compteNum - Numéro de compte
   * @returns {string} Numéro de compte normalisé
   */
  normalizeAccount(compteNum) {
    if (!compteNum) return '';
    const normalized = String(compteNum).trim().replace(/\s+/g, '');
    return normalized;
  }

  /**
   * Extrait le premier chiffre (classe) du compte
   * @param {string} compteNum - Numéro de compte
   * @returns {string} Premier chiffre (classe)
   */
  getClasse(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    return normalized.length > 0 ? normalized[0] : '';
  }

  /**
   * Extrait les deux premiers chiffres (sous-classe) du compte
   * @param {string} compteNum - Numéro de compte
   * @returns {string} Deux premiers chiffres
   */
  getSousClasse(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    return normalized.length >= 2 ? normalized.substring(0, 2) : normalized;
  }

  /**
   * Vérifie si un compte correspond à un pattern (gère les wildcards comme "2x", "41x")
   * @param {string} compteNum - Numéro de compte
   * @param {string} pattern - Pattern à matcher
   * @returns {boolean}
   */
  matchesPattern(compteNum, pattern) {
    const normalized = this.normalizeAccount(compteNum);
    if (pattern.endsWith('x')) {
      const prefix = pattern.slice(0, -1);
      return normalized.startsWith(prefix);
    }
    return normalized === pattern;
  }

  /**
   * Trouve un compte dans une structure de comptes
   * @param {Object} comptesObj - Objet contenant les comptes
   * @param {string} compteNum - Numéro de compte recherché
   * @returns {string|null} Libellé du compte ou null
   */
  findAccountInObject(comptesObj, compteNum) {
    if (!comptesObj || typeof comptesObj !== 'object') return null;
    
    // Recherche exacte
    if (comptesObj[compteNum]) {
      return comptesObj[compteNum];
    }

    // Recherche par sous-classe (2 premiers chiffres)
    const sousClasse = this.getSousClasse(compteNum);
    if (comptesObj[sousClasse]) {
      return comptesObj[sousClasse];
    }

    // Recherche dans les sous-classes (pour compte de résultat)
    if (comptesObj.sousClasses) {
      for (const sousClasseKey of Object.keys(comptesObj.sousClasses)) {
        const sousClasseObj = comptesObj.sousClasses[sousClasseKey];
        if (sousClasseObj.comptes && sousClasseObj.comptes[compteNum]) {
          return sousClasseObj.comptes[compteNum];
        }
      }
    }

    // Recherche par préfixe
    for (const key of Object.keys(comptesObj)) {
      if (this.matchesPattern(compteNum, key)) {
        return comptesObj[key];
      }
    }

    return null;
  }

  /**
   * 1. Détermine si un compte est de type BILAN ou COMPTE_RESULTAT
   * @param {string|number} compteNum - Numéro de compte
   * @returns {'BILAN'|'COMPTE_RESULTAT'|null} Type du compte
   */
  getAccountType(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return null;

    const cacheKey = `type_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const classe = this.getClasse(normalized);
    
    // Classification selon le PCG :
    // Classes 1-5 : BILAN
    // Classes 6-7 : COMPTE_RESULTAT
    // Classe 8 : comptes spéciaux (régularisation) → BILAN
    // Classe 0 : comptes spéciaux (hors bilan) → peut être ignoré ou traité séparément
    
    if (['1', '2', '3', '4', '5', '8'].includes(classe)) {
      this.cache.set(cacheKey, 'BILAN');
      return 'BILAN';
    }
    
    if (['6', '7'].includes(classe)) {
      this.cache.set(cacheKey, 'COMPTE_RESULTAT');
      return 'COMPTE_RESULTAT';
    }

    // Classe 0 ou autre : non classifié
    this.cache.set(cacheKey, null);
    return null;
  }

  /**
   * 2. Détermine la position d'un compte de BILAN (ACTIF ou PASSIF)
   * @param {string|number} compteNum - Numéro de compte
   * @returns {'ACTIF'|'PASSIF'|null} Position du compte dans le bilan
   */
  getBilanPosition(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return null;

    const cacheKey = `bilan_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Vérifier d'abord si c'est un compte de bilan
    if (this.getAccountType(normalized) !== 'BILAN') {
      this.cache.set(cacheKey, null);
      return null;
    }

    const classe = this.getClasse(normalized);
    const sousClasse = this.getSousClasse(normalized);
    const bilanData = this.rules.bilan;

    // Classe 2 = Immobilisations (ACTIF)
    if (classe === '2') {
      this.cache.set(cacheKey, 'ACTIF');
      return 'ACTIF';
    }

    // Classe 3 = Stocks (ACTIF)
    if (classe === '3') {
      this.cache.set(cacheKey, 'ACTIF');
      return 'ACTIF';
    }

    // Classe 1 = Capitaux propres (PASSIF)
    if (classe === '1') {
      this.cache.set(cacheKey, 'PASSIF');
      return 'PASSIF';
    }

    // Classe 4 = Comptes de tiers (à déterminer selon le compte)
    if (classe === '4') {
      // Vérifier les règles spéciales de régularisation
      if (this.isRegularisationAccount(normalized)) {
        // Charges constatées d'avance = ACTIF
        if (normalized.startsWith('486')) {
          this.cache.set(cacheKey, 'ACTIF');
          return 'ACTIF';
        }
        
        // Produits constatés d'avance = PASSIF
        if (normalized.startsWith('487')) {
          this.cache.set(cacheKey, 'PASSIF');
          return 'PASSIF';
        }

        // Comptes se terminant par 8 dans classe 4
        if (normalized.length >= 3) {
          const dernierChiffre = normalized[normalized.length - 1];
          if (dernierChiffre === '8') {
            // 418, 468 = produits à recevoir (ACTIF)
            // 408, 428, 438, 448 = charges à payer (PASSIF)
            if (normalized.startsWith('418') || normalized.startsWith('468')) {
              this.cache.set(cacheKey, 'ACTIF');
              return 'ACTIF';
            }
            if (normalized.startsWith('408') || normalized.startsWith('428') || 
                normalized.startsWith('438') || normalized.startsWith('448')) {
              this.cache.set(cacheKey, 'PASSIF');
              return 'PASSIF';
            }
          }
        }
      }

      // Vérifier dans les données structurées du JSON
      if (bilanData.actif.classe4_actif) {
        const label = this.findAccountInObject(bilanData.actif.classe4_actif.comptes, normalized);
        if (label) {
          this.cache.set(cacheKey, 'ACTIF');
          return 'ACTIF';
        }
      }
      
      if (bilanData.passif.classe4_passif) {
        const label = this.findAccountInObject(bilanData.passif.classe4_passif.comptes, normalized);
        if (label) {
          this.cache.set(cacheKey, 'PASSIF');
          return 'PASSIF';
        }
      }

      // Règle par défaut : terminaison 8 dans classe 4
      if (normalized.length >= 3) {
        const dernierChiffre = normalized[normalized.length - 1];
        if (dernierChiffre === '8') {
          // 418, 468 = produits à recevoir (ACTIF)
          // 408, 428, 438, 448 = charges à payer (PASSIF)
          if (['418', '468'].includes(normalized)) {
            this.cache.set(cacheKey, 'ACTIF');
            return 'ACTIF';
          }
          if (['408', '428', '438', '448'].includes(normalized)) {
            this.cache.set(cacheKey, 'PASSIF');
            return 'PASSIF';
          }
        }
      }
    }

    // Classe 5 = Trésorerie (peut être ACTIF ou PASSIF selon le solde)
    // Par défaut, considérer comme ACTIF (trésorerie active)
    if (classe === '5') {
      if (bilanData.actif.classe5_actif) {
        const label = this.findAccountInObject(bilanData.actif.classe5_actif.comptes, normalized);
        if (label) {
          this.cache.set(cacheKey, 'ACTIF');
          return 'ACTIF';
        }
      }
      
      if (bilanData.passif.classe5_passif) {
        const label = this.findAccountInObject(bilanData.passif.classe5_passif.comptes, normalized);
        if (label) {
          this.cache.set(cacheKey, 'PASSIF');
          return 'PASSIF';
        }
      }
      
      // Par défaut ACTIF pour trésorerie
      this.cache.set(cacheKey, 'ACTIF');
      return 'ACTIF';
    }

    this.cache.set(cacheKey, null);
    return null;
  }

  /**
   * 3. Détermine la position d'un compte de RESULTAT (CHARGE ou PRODUIT)
   * @param {string|number} compteNum - Numéro de compte
   * @returns {'CHARGE'|'PRODUIT'|null} Position du compte dans le compte de résultat
   */
  getResultatPosition(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return null;

    const cacheKey = `resultat_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Vérifier d'abord si c'est un compte de résultat
    if (this.getAccountType(normalized) !== 'COMPTE_RESULTAT') {
      this.cache.set(cacheKey, null);
      return null;
    }

    const classe = this.getClasse(normalized);
    const resultatData = this.rules.compteResultat;

    // Classe 6 = Charges
    if (classe === '6') {
      this.cache.set(cacheKey, 'CHARGE');
      return 'CHARGE';
    }

    // Classe 7 = Produits
    if (classe === '7') {
      this.cache.set(cacheKey, 'PRODUIT');
      return 'PRODUIT';
    }

    this.cache.set(cacheKey, null);
    return null;
  }

  /**
   * 4. Retourne le libellé officiel d'un compte selon le PCG
   * @param {string|number} compteNum - Numéro de compte
   * @returns {string|null} Libellé du compte
   */
  getAccountLabel(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return null;

    const cacheKey = `label_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const classe = this.getClasse(normalized);
    const sousClasse = this.getSousClasse(normalized);

    // Rechercher dans le BILAN
    if (['1', '2', '3', '4', '5'].includes(classe)) {
      const bilanData = this.rules.bilan;
      
      // Rechercher dans ACTIF
      for (const key of Object.keys(bilanData.actif)) {
        const section = bilanData.actif[key];
        if (section.comptes) {
          const label = this.findAccountInObject(section.comptes, normalized);
          if (label) {
            this.cache.set(cacheKey, label);
            return label;
          }
        }
      }

      // Rechercher dans PASSIF
      for (const key of Object.keys(bilanData.passif)) {
        const section = bilanData.passif[key];
        if (section.comptes) {
          const label = this.findAccountInObject(section.comptes, normalized);
          if (label) {
            this.cache.set(cacheKey, label);
            return label;
          }
        }
      }
    }

    // Rechercher dans le COMPTE DE RESULTAT
    if (['6', '7'].includes(classe)) {
      const libellesComptes = this.rules.libellesComptes;
      
      // Rechercher dans classe6 (charges)
      if (classe === '6' && libellesComptes.classe6) {
        // Recherche exacte
        if (libellesComptes.classe6[normalized]) {
          const compteInfo = libellesComptes.classe6[normalized];
          const label = typeof compteInfo === 'string' ? compteInfo : compteInfo.libelle;
          if (label) {
            this.cache.set(cacheKey, label);
            return label;
          }
        }
        
        // Recherche par sous-classe (2 premiers chiffres)
        if (libellesComptes.classe6[sousClasse]) {
          const compteInfo = libellesComptes.classe6[sousClasse];
          const label = typeof compteInfo === 'string' ? compteInfo : compteInfo.libelle;
          if (label) {
            this.cache.set(cacheKey, label);
            return label;
          }
        }
      }

      // Rechercher dans classe7 (produits)
      if (classe === '7' && libellesComptes.classe7) {
        // Recherche exacte
        if (libellesComptes.classe7[normalized]) {
          const compteInfo = libellesComptes.classe7[normalized];
          const label = typeof compteInfo === 'string' ? compteInfo : compteInfo.libelle;
          if (label) {
            this.cache.set(cacheKey, label);
            return label;
          }
        }
        
        // Recherche par sous-classe (2 premiers chiffres)
        if (libellesComptes.classe7[sousClasse]) {
          const compteInfo = libellesComptes.classe7[sousClasse];
          const label = typeof compteInfo === 'string' ? compteInfo : compteInfo.libelle;
          if (label) {
            this.cache.set(cacheKey, label);
            return label;
          }
        }
      }
    }

    // Si non trouvé, retourner un libellé générique
    const genericLabel = `Compte ${normalized}`;
    this.cache.set(cacheKey, genericLabel);
    return genericLabel;
  }

  /**
   * 5. Vérifie si c'est un compte de régularisation
   * @param {string|number} compteNum - Numéro de compte
   * @returns {boolean} True si c'est un compte de régularisation
   */
  isRegularisationAccount(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return false;

    const cacheKey = `regularisation_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Comptes de régularisation selon le PCG :
    // - 486 = Charges constatées d'avance (ACTIF)
    // - 487 = Produits constatés d'avance (PASSIF)
    // - Comptes classe 4 se terminant par 8 = charges à payer / produits à recevoir
    const isRegularisation = normalized.startsWith('486') ||
                             normalized.startsWith('487') ||
                             (normalized.length >= 3 && normalized[0] === '4' && normalized[normalized.length - 1] === '8');

    this.cache.set(cacheKey, isRegularisation);
    return isRegularisation;
  }

  /**
   * Vérifie si c'est un compte spécial (régularisation, TVA, etc.)
   * @param {string|number} compteNum - Numéro de compte
   * @returns {boolean} True si c'est un compte spécial
   */
  isSpecialAccount(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return false;

    const cacheKey = `special_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Un compte est spécial s'il est de régularisation ou TVA
    const isSpecial = this.isRegularisationAccount(normalized) || this.isTVAAccount(normalized);

    this.cache.set(cacheKey, isSpecial);
    return isSpecial;
  }

  /**
   * 6. Vérifie si c'est un compte de TVA
   * @param {string|number} compteNum - Numéro de compte
   * @returns {boolean} True si c'est un compte de TVA
   */
  isTVAAccount(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return false;

    const cacheKey = `tva_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Comptes de TVA selon le PCG :
    // - 4455 = TVA à décaisser (PASSIF)
    // - 4456 = TVA déductible (ACTIF)
    // - 4457 = TVA collectée (PASSIF)
    // - Autres comptes 445x sont aussi des comptes TVA
    const isTVA = normalized.startsWith('4455') ||
                  normalized.startsWith('4456') ||
                  normalized.startsWith('4457') ||
                  (normalized.length >= 4 && normalized.startsWith('445'));

    this.cache.set(cacheKey, isTVA);
    return isTVA;
  }

  /**
   * Vérifie si un compte est à double position (peut être ACTIF et PASSIF)
   * Selon la section comptesDoublePosition du JSON
   * @param {string|number} compteNum - Numéro de compte
   * @returns {boolean} True si le compte peut avoir une double position
   */
  isDoublePositionAccount(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return false;

    const cacheKey = `doublePosition_${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Vérifier dans la section comptesDoublePosition du JSON
    const comptesDoublePosition = this.rules.comptesDoublePosition?.comptes || {};
    
    // Extraire la racine du compte (2 premiers chiffres pour 40, 41, etc.)
    const racine = normalized.substring(0, 2);
    
    // Vérifier si cette racine est dans les comptes à double position
    const isDouble = Object.keys(comptesDoublePosition).includes(racine) ||
                     Object.keys(comptesDoublePosition).includes(normalized);

    this.cache.set(cacheKey, isDouble);
    return isDouble;
  }

  /**
   * Récupère les informations d'un compte à double position depuis le JSON
   * @param {string|number} compteNum - Numéro de compte
   * @returns {Object|null} Informations du compte à double position
   */
  getDoublePositionInfo(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return null;

    const comptesDoublePosition = this.rules.comptesDoublePosition?.comptes || {};
    const racine = normalized.substring(0, 2);
    
    return comptesDoublePosition[racine] || comptesDoublePosition[normalized] || null;
  }

  /**
   * Vide le cache (utile pour forcer un rechargement)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export d'une instance singleton
const accountClassifier = new AccountClassifier();

// Export des fonctions directement
export const getAccountType = (compteNum) => accountClassifier.getAccountType(compteNum);
export const getBilanPosition = (compteNum) => accountClassifier.getBilanPosition(compteNum);
export const getResultatPosition = (compteNum) => accountClassifier.getResultatPosition(compteNum);
export const getAccountLabel = (compteNum) => accountClassifier.getAccountLabel(compteNum);
export const isSpecialAccount = (compteNum) => accountClassifier.isSpecialAccount(compteNum);
export const isRegularisationAccount = (compteNum) => accountClassifier.isRegularisationAccount(compteNum);
export const isTVAAccount = (compteNum) => accountClassifier.isTVAAccount(compteNum);
export const isDoublePositionAccount = (compteNum) => accountClassifier.isDoublePositionAccount(compteNum);
export const getDoublePositionInfo = (compteNum) => accountClassifier.getDoublePositionInfo(compteNum);

// Export de la classe également
export default accountClassifier;
