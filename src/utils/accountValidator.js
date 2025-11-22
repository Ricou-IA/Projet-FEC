import {
  getAccountType,
  getBilanPosition,
  getResultatPosition,
  getAccountLabel
} from '../core/AccountClassifier';
import reglesAffectation from '../data/regles-affectation-comptes.json';

/**
 * Validateur de comptes comptables selon le Plan Comptable Général (PCG) 2025
 * Utilise les règles définies dans regles-affectation-comptes.json
 */
export class AccountValidator {
  constructor() {
    this.rules = reglesAffectation;
    this.validationCache = new Map();
  }

  /**
   * Normalise un numéro de compte
   * @param {string|number} compteNum - Numéro de compte
   * @returns {string} Numéro de compte normalisé
   */
  normalizeAccount(compteNum) {
    if (!compteNum) return '';
    return String(compteNum).trim().replace(/\s+/g, '');
  }

  /**
   * Extrait la classe (premier chiffre) d'un compte
   * @param {string} compteNum - Numéro de compte
   * @returns {string} Classe du compte
   */
  getClasse(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    return normalized.length > 0 ? normalized[0] : '';
  }

  /**
   * Vérifie si un compte existe dans le PCG selon le JSON
   * @param {string} compteNum - Numéro de compte
   * @returns {boolean} True si le compte existe
   */
  accountExists(compteNum) {
    const normalized = this.normalizeAccount(compteNum);
    if (!normalized) return false;

    const cacheKey = `exists_${normalized}`;
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    const classe = this.getClasse(normalized);
    
    // Vérifier dans la classification
    const classification = this.rules.classification;
    const isValidClass = 
      classification.bilan.classes.includes(classe) ||
      classification.compteResultat.classes.includes(classe) ||
      classification.speciaux.classes.includes(classe);
    
    if (!isValidClass) {
      this.validationCache.set(cacheKey, false);
      return false;
    }

    // Vérifier dans le bilan
    if (this._findAccountInBilan(normalized)) {
      this.validationCache.set(cacheKey, true);
      return true;
    }

    // Vérifier dans le compte de résultat
    if (this._findAccountInResultat(normalized)) {
      this.validationCache.set(cacheKey, true);
      return true;
    }

    // Si la classe est valide mais le compte spécifique n'est pas trouvé,
    // considérer comme valide si c'est un compte standard du PCG
    // (les sous-comptes peuvent être créés librement dans certaines limites)
    const isValidStandard = this._isValidStandardAccount(normalized, classe);
    this.validationCache.set(cacheKey, isValidStandard);
    return isValidStandard;
  }

  /**
   * Trouve un compte dans la structure bilan du JSON
   * @private
   */
  _findAccountInBilan(compteNum) {
    const bilanData = this.rules.bilan;
    if (!bilanData) return false;

    // Chercher dans ACTIF
    if (bilanData.actif) {
      for (const sectionKey of Object.keys(bilanData.actif)) {
        const section = bilanData.actif[sectionKey];
        if (section.comptes && this._accountInObject(section.comptes, compteNum)) {
          return true;
        }
      }
    }

    // Chercher dans PASSIF
    if (bilanData.passif) {
      for (const sectionKey of Object.keys(bilanData.passif)) {
        const section = bilanData.passif[sectionKey];
        if (section.comptes && this._accountInObject(section.comptes, compteNum)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Trouve un compte dans la structure compte de résultat du JSON
   * @private
   */
  _findAccountInResultat(compteNum) {
    const resultatData = this.rules.compteResultat;
    if (!resultatData) return false;

    // Chercher dans Charges (classe 6)
    if (resultatData.charges?.classe6?.sousClasses) {
      for (const sousClasseKey of Object.keys(resultatData.charges.classe6.sousClasses)) {
        const sousClasseObj = resultatData.charges.classe6.sousClasses[sousClasseKey];
        if (sousClasseObj.comptes && this._accountInObject(sousClasseObj.comptes, compteNum)) {
          return true;
        }
      }
    }

    // Chercher dans Produits (classe 7)
    if (resultatData.produits?.classe7?.sousClasses) {
      for (const sousClasseKey of Object.keys(resultatData.produits.classe7.sousClasses)) {
        const sousClasseObj = resultatData.produits.classe7.sousClasses[sousClasseKey];
        if (sousClasseObj.comptes && this._accountInObject(sousClasseObj.comptes, compteNum)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Vérifie si un compte est dans un objet de comptes
   * @private
   */
  _accountInObject(comptesObj, compteNum) {
    if (!comptesObj || typeof comptesObj !== 'object') return false;

    // Recherche exacte
    if (comptesObj[compteNum]) return true;

    // Recherche par sous-classe (2 premiers chiffres)
    const sousClasse = compteNum.substring(0, 2);
    if (comptesObj[sousClasse]) return true;

    // Recherche par préfixe
    for (const key of Object.keys(comptesObj)) {
      if (key.endsWith('x')) {
        const prefix = key.slice(0, -1);
        if (compteNum.startsWith(prefix)) return true;
      }
    }

    return false;
  }

  /**
   * Vérifie si c'est un compte standard valide du PCG
   * @private
   */
  _isValidStandardAccount(compteNum, classe) {
    // Le PCG permet la création de sous-comptes dans certaines limites
    // Vérifier que le format est correct (chiffres uniquement)
    if (!/^\d+$/.test(compteNum)) return false;

    // Vérifier que la longueur est raisonnable (max 8 chiffres généralement)
    if (compteNum.length > 8) return false;

    // Vérifier que la classe existe
    const classification = this.rules.classification;
    const isValidClass = 
      classification.bilan.classes.includes(classe) ||
      classification.compteResultat.classes.includes(classe) ||
      classification.speciaux.classes.includes(classe);

    return isValidClass;
  }

  /**
   * Valide un compte dans un contexte donné
   * @param {string} compteNum - Numéro de compte
   * @param {string} context - Contexte ('BILAN' ou 'COMPTE_RESULTAT' ou null)
   * @returns {Object} Résultat de la validation
   */
  validateAccount(compteNum, context = null) {
    const normalized = this.normalizeAccount(compteNum);
    
    const result = {
      compteNum: normalized,
      isValid: true,
      exists: false,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!normalized) {
      result.isValid = false;
      result.errors.push('Numéro de compte vide ou invalide');
      return result;
    }

    // 1. Vérifier que le compte existe dans le PCG
    result.exists = this.accountExists(normalized);
    if (!result.exists) {
      result.isValid = false;
      result.errors.push(`Compte ${normalized} non reconnu dans le Plan Comptable Général`);
      
      // Suggérer des comptes similaires
      result.suggestions = this._suggestSimilarAccounts(normalized);
    }

    // 2. Vérifier la classification si un contexte est fourni
    if (context) {
      const accountType = getAccountType(normalized);
      
      if (!accountType) {
        result.isValid = false;
        result.errors.push(`Impossible de déterminer le type du compte ${normalized}`);
      } else if (context === 'BILAN' && accountType !== 'BILAN') {
        result.isValid = false;
        result.errors.push(
          `Compte ${normalized} (classe ${this.getClasse(normalized)}) appartient au COMPTE_RESULTAT, ` +
          `mais est utilisé dans le BILAN. Utilisez plutôt un compte des classes 1-5.`
        );
        result.suggestions = this._suggestBilanAccounts(normalized);
      } else if (context === 'COMPTE_RESULTAT' && accountType !== 'COMPTE_RESULTAT') {
        result.isValid = false;
        result.errors.push(
          `Compte ${normalized} (classe ${this.getClasse(normalized)}) appartient au BILAN, ` +
          `mais est utilisé dans le COMPTE_RESULTAT. Utilisez plutôt un compte des classes 6-7.`
        );
        result.suggestions = this._suggestResultatAccounts(normalized);
      }
    }

    // 3. Vérifier les comptes obsolètes (classes 67, 77 supprimées en 2025)
    const classe = this.getClasse(normalized);
    if (classe === '67' || classe === '77') {
      result.warnings.push(
        `Les comptes de la classe ${classe} (charges/produits exceptionnels) ont été supprimés au 1er janvier 2025. ` +
        `Utilisez plutôt les comptes 65, 75 ou 78, 79.`
      );
    }

    // 4. Vérifier les comptes de régularisation mal utilisés
    if (normalized.startsWith('486') || normalized.startsWith('487')) {
      const bilanPosition = getBilanPosition(normalized);
      if (context === 'BILAN' && !bilanPosition) {
        result.warnings.push(
          `Compte de régularisation ${normalized} : vérifiez qu'il est bien classé à l'ACTIF (486) ou au PASSIF (487)`
        );
      }
    }

    return result;
  }

  /**
   * Valide un ensemble de comptes (ex: données FEC)
   * @param {Array} data - Données à valider [{ compteNum, debit, credit, ... }, ...]
   * @param {string} context - Contexte ('BILAN' ou 'COMPTE_RESULTAT' ou null)
   * @returns {Object} Résultat de la validation globale
   */
  validateAccounts(data, context = null) {
    if (!data || !Array.isArray(data)) {
      return {
        isValid: false,
        errors: ['Données invalides'],
        accounts: [],
        summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          unknown: 0,
          misclassified: 0
        }
      };
    }

    const accounts = {};
    const summary = {
      total: data.length,
      valid: 0,
      invalid: 0,
      unknown: 0,
      misclassified: 0
    };

    // Grouper par compte et valider
    data.forEach(row => {
      const compteNum = this.normalizeAccount(row.compteNum);
      if (!compteNum) return;

      if (!accounts[compteNum]) {
        accounts[compteNum] = {
          compteNum,
          validation: this.validateAccount(compteNum, context),
          occurrences: 0,
          totalDebit: 0,
          totalCredit: 0
        };
      }

      accounts[compteNum].occurrences++;
      accounts[compteNum].totalDebit += row.debit || 0;
      accounts[compteNum].totalCredit += row.credit || 0;
    });

    // Compter les résultats
    Object.values(accounts).forEach(account => {
      const validation = account.validation;
      
      if (validation.isValid && validation.exists) {
        summary.valid++;
      } else {
        summary.invalid++;
        
        if (!validation.exists) {
          summary.unknown++;
        } else {
          summary.misclassified++;
        }
      }
    });

    return {
      isValid: summary.invalid === 0,
      accounts: Object.values(accounts),
      summary
    };
  }

  /**
   * Suggère des comptes similaires à un compte non reconnu
   * @private
   */
  _suggestSimilarAccounts(compteNum) {
    const suggestions = [];
    const compteLength = compteNum.length;
    const classe = this.getClasse(compteNum);

    // Chercher dans le JSON pour des comptes similaires
    // 1. Même classe, différents numéros
    const allAccounts = this._getAllKnownAccounts();
    
    for (const knownAccount of allAccounts) {
      // Calculer la similarité (distance de Levenshtein simplifiée)
      const similarity = this._calculateSimilarity(compteNum, knownAccount);
      
      if (similarity > 0.6) { // Seuil de similarité
        suggestions.push({
          compteNum: knownAccount,
          libelle: getAccountLabel(knownAccount),
          similarity: similarity,
          reason: 'Compte similaire'
        });
      }
    }

    // 2. Suggérer des comptes de la même classe
    if (classe) {
      const classeAccounts = allAccounts.filter(acc => acc.startsWith(classe));
      if (classeAccounts.length > 0) {
        classeAccounts.slice(0, 3).forEach(acc => {
          if (!suggestions.find(s => s.compteNum === acc)) {
            suggestions.push({
              compteNum: acc,
              libelle: getAccountLabel(acc),
              similarity: 0.5,
              reason: `Même classe (${classe})`
            });
          }
        });
      }
    }

    // Trier par similarité décroissante
    suggestions.sort((a, b) => b.similarity - a.similarity);
    return suggestions.slice(0, 5); // Retourner les 5 meilleures suggestions
  }

  /**
   * Suggère des comptes de bilan pour remplacer un compte de résultat
   * @private
   */
  _suggestBilanAccounts(compteNum) {
    const suggestions = [];
    const classe = this.getClasse(compteNum);

    // Si c'est une classe 6 (charge), suggérer des comptes de passif similaires
    if (classe === '6') {
      suggestions.push({
        compteNum: '65',
        libelle: getAccountLabel('65'),
        reason: 'Autres charges de gestion courante (pour provisions bilan)'
      });
      suggestions.push({
        compteNum: '68',
        libelle: getAccountLabel('68'),
        reason: 'Dotations (pour provisions bilan)'
      });
    }

    // Si c'est une classe 7 (produit), suggérer des comptes d'actif similaires
    if (classe === '7') {
      suggestions.push({
        compteNum: '71',
        libelle: getAccountLabel('71'),
        reason: 'Production stockée (pour variation stocks)'
      });
    }

    return suggestions;
  }

  /**
   * Suggère des comptes de résultat pour remplacer un compte de bilan
   * @private
   */
  _suggestResultatAccounts(compteNum) {
    const suggestions = [];
    const classe = this.getClasse(compteNum);

    // Si c'est une classe 1-5 (bilan), suggérer des comptes de résultat similaires
    if (classe === '2' || classe === '3') {
      suggestions.push({
        compteNum: '68',
        libelle: getAccountLabel('68'),
        reason: 'Dotations aux amortissements (pour immobilisations)'
      });
    }

    if (classe === '4') {
      suggestions.push({
        compteNum: '41',
        libelle: getAccountLabel('41'),
        reason: 'Clients (pour créances - utiliser dans bilan, pas résultat)'
      });
      suggestions.push({
        compteNum: '70',
        libelle: getAccountLabel('70'),
        reason: 'Ventes (pour produits)'
      });
    }

    if (classe === '5') {
      suggestions.push({
        compteNum: '66',
        libelle: getAccountLabel('66'),
        reason: 'Charges financières (pour intérêts)'
      });
      suggestions.push({
        compteNum: '76',
        libelle: getAccountLabel('76'),
        reason: 'Produits financiers'
      });
    }

    return suggestions;
  }

  /**
   * Récupère tous les comptes connus du JSON
   * @private
   */
  _getAllKnownAccounts() {
    const accounts = new Set();

    // Extraire du bilan
    if (this.rules.bilan) {
      const extractFromSection = (section) => {
        if (section.comptes) {
          Object.keys(section.comptes).forEach(acc => {
            if (!acc.includes('-') && !acc.includes('x')) {
              accounts.add(acc);
            }
          });
        }
      };

      if (this.rules.bilan.actif) {
        Object.values(this.rules.bilan.actif).forEach(extractFromSection);
      }
      if (this.rules.bilan.passif) {
        Object.values(this.rules.bilan.passif).forEach(extractFromSection);
      }
    }

    // Extraire du compte de résultat
    if (this.rules.compteResultat) {
      const extractFromSousClasses = (sousClasses) => {
        if (sousClasses) {
          Object.values(sousClasses).forEach(sousClasse => {
            if (sousClasse.comptes) {
              Object.keys(sousClasse.comptes).forEach(acc => {
                accounts.add(acc);
              });
            }
          });
        }
      };

      if (this.rules.compteResultat.charges?.classe6?.sousClasses) {
        extractFromSousClasses(this.rules.compteResultat.charges.classe6.sousClasses);
      }
      if (this.rules.compteResultat.produits?.classe7?.sousClasses) {
        extractFromSousClasses(this.rules.compteResultat.produits.classe7.sousClasses);
      }
    }

    return Array.from(accounts);
  }

  /**
   * Calcule la similarité entre deux numéros de compte
   * Utilise une distance de Levenshtein simplifiée
   * @private
   */
  _calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    // Vérifier le préfixe commun
    let commonPrefix = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
      if (str1[i] === str2[i]) {
        commonPrefix++;
      } else {
        break;
      }
    }

    // Calculer la similarité basée sur la longueur et le préfixe commun
    const lengthSimilarity = 1 - Math.abs(str1.length - str2.length) / maxLength;
    const prefixSimilarity = commonPrefix / maxLength;

    return (lengthSimilarity * 0.5 + prefixSimilarity * 0.5);
  }
}

// Export d'une instance par défaut
const accountValidator = new AccountValidator();

// Export des fonctions principales
export const validateAccount = (compteNum, context) => accountValidator.validateAccount(compteNum, context);
export const validateAccounts = (data, context) => accountValidator.validateAccounts(data, context);
export const accountExists = (compteNum) => accountValidator.accountExists(compteNum);

// Export de la classe
export default accountValidator;

