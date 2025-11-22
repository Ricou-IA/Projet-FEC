// BilanGenerator.js - Version optimisée avec constantes
import { getAccountLabel } from './AccountClassifier';
import {
  SEUILS,
  CLASSES_COMPTES,
  COMPTES_CORRECTEURS,
  STRUCTURE_BILAN,
  MAPPING_AMORTISSEMENTS,
  REGLES_CALCUL
} from '../constants/accounting-constants';

/**
 * GÉNÉRATEUR DE BILAN PCG 2025 - VERSION OPTIMISÉE
 * 
 * Améliorations apportées:
 * - Utilisation de constantes centralisées
 * - Cache pour optimiser les performances
 * - Meilleure validation des données
 * - Tracking des comptes non affectés
 * - Documentation JSDoc complète
 */

export class BilanGenerator {
  
  /**
   * Point d'entrée principal - génère le bilan complet
   * @param {Object} parseResult - Résultat du parsing FEC
   * @param {Array<{compteNum: string, compteLibelle: string, debit: number, credit: number}>} parseResult.data
   * @returns {Object|null} Bilan structuré ou null si données invalides
   */
  static generateBilan(parseResult) {
    if (!parseResult?.data?.length) return null;

    // ÉTAPE 1 : Calculer les soldes de tous les comptes (avec cache)
    const soldes = this._calculerSoldesTousComptes(parseResult.data);

    // ÉTAPE 2 : Calculer le résultat (classe 6 et 7)
    const resultat = this._calculerResultat(soldes);

    // ÉTAPE 3 : Extraire les amortissements (28x et 29x)
    const amortissements = this._extraireAmortissements(soldes);

    // ÉTAPE 4 : Affecter les comptes à l'actif ou au passif
    const { actif, passif } = this._affecterComptesAuBilan(soldes, amortissements);

    // ÉTAPE 5 : Ajouter le résultat au passif
    this._ajouterResultatAuPassif(passif, resultat);

    // ÉTAPE 6 : Structurer et calculer les totaux
    const bilan = this._structurerBilan(actif, passif);

    // ÉTAPE 7 : Valider l'équilibre et identifier les comptes non affectés
    bilan.validation = this._validerBilan(bilan, soldes, actif, passif);

    return bilan;
  }

  /**
   * ÉTAPE 1 : Calcule le solde de chaque compte (débit - crédit)
   * Optimisé avec utilisation de Map pour de meilleures performances
   * 
   * @param {Array<{compteNum: string, compteLibelle: string, debit: number, credit: number}>} fecData
   * @returns {Object<string, {compteNum: string, compteLibelle: string, debit: number, credit: number, solde: number}>}
   * @private
   */
  static _calculerSoldesTousComptes(fecData) {
    const cache = new Map();

    fecData.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!compteNum) return;

      if (!cache.has(compteNum)) {
        cache.set(compteNum, {
          compteNum,
          compteLibelle: row.compteLibelle || getAccountLabel(compteNum),
          debit: 0,
          credit: 0,
          solde: 0
        });
      }

      const compte = cache.get(compteNum);
      compte.debit += row.debit || 0;
      compte.credit += row.credit || 0;
    });

    // Calculer le solde final (débit - crédit)
    cache.forEach(compte => {
      compte.solde = compte.debit - compte.credit;
    });

    return Object.fromEntries(cache);
  }

  /**
   * ÉTAPE 2 : Calcule le résultat (Produits - Charges)
   * @param {Object} soldes - Soldes de tous les comptes
   * @returns {number} Résultat net (positif = bénéfice, négatif = perte)
   * @private
   */
  static _calculerResultat(soldes) {
    let produits = 0;  // Classe 7
    let charges = 0;   // Classe 6

    Object.values(soldes).forEach(compte => {
      const classe = compte.compteNum[0];

      if (classe === CLASSES_COMPTES.PRODUITS) {
        // Produits : solde créditeur normal → credit - debit
        produits += REGLES_CALCUL.PRODUITS(compte.debit, compte.credit);
      } else if (classe === CLASSES_COMPTES.CHARGES) {
        // Charges : solde débiteur normal → debit - credit
        charges += REGLES_CALCUL.CHARGES(compte.debit, compte.credit);
      }
    });

    return produits - charges;
  }

  /**
   * ÉTAPE 3 : Extrait les amortissements (28x et 29x)
   * @param {Object} soldes - Soldes de tous les comptes
   * @returns {Object<string, number>} Montants d'amortissements par classe d'immobilisation
   * @private
   */
  static _extraireAmortissements(soldes) {
    const amortissements = {
      '20': 0, '21': 0, '22': 0, '23': 0, '26': 0, '27': 0
    };

    Object.values(soldes).forEach(compte => {
      const compteNum = compte.compteNum;
      
      // Les amortissements ont un solde créditeur → on prend la valeur absolue du crédit net
      const montantAmortissement = Math.max(0, compte.credit - compte.debit);

      // Utiliser le mapping des constantes
      const prefixe = compteNum.substring(0, 3);
      const classeImmob = MAPPING_AMORTISSEMENTS[prefixe];
      
      if (classeImmob && amortissements[classeImmob] !== undefined) {
        amortissements[classeImmob] += montantAmortissement;
      }
    });

    return amortissements;
  }

  /**
   * ÉTAPE 4 : Affecte chaque compte à l'actif ou au passif selon les règles PCG
   * @param {Object} soldes - Soldes de tous les comptes
   * @param {Object} amortissements - Amortissements par classe
   * @returns {{actif: Object, passif: Object}}
   * @private
   */
  static _affecterComptesAuBilan(soldes, amortissements) {
    const actif = {};
    const passif = {};

    Object.values(soldes).forEach(compte => {
      const compteNum = compte.compteNum;
      const classe = compteNum[0];
      const sousClasse = compteNum.substring(0, 2);
      const racineCompte = compteNum.substring(0, 3);
      const solde = compte.solde;

      // Ignorer les comptes soldés (< seuil)
      if (Math.abs(solde) < SEUILS.SOLDE_NUL) return;

      // Exclure les comptes déjà traités
      if (CLASSES_COMPTES.RESULTAT.includes(classe)) return; // Résultat
      if (compteNum.startsWith('28') || compteNum.startsWith('29')) return; // Amortissements

      // AFFECTATION PAR CLASSE
      if (classe === CLASSES_COMPTES.CAPITAUX) {
        // Classe 1 : Capitaux propres - généralement PASSIF
        // EXCEPTIONS : Comptes correcteurs à l'ACTIF
        const isCorrecteurActif = COMPTES_CORRECTEURS.ACTIF.some(c => compteNum.startsWith(c));
        
        if (isCorrecteurActif) {
          // Compte correcteur : va à l'ACTIF
          if (solde > 0) {
            this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
          }
        } else {
          // Compte normal : va au PASSIF en valeur absolue
          this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
        }
        
      } else if (classe === CLASSES_COMPTES.IMMOBILISATIONS) {
        // Classe 2 : Toujours ACTIF (immobilisations)
        if (solde > 0) {
          this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
        }
        
      } else if (classe === CLASSES_COMPTES.STOCKS) {
        // Classe 3 : Toujours ACTIF (stocks)
        if (solde > 0) {
          this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
        }
        
      } else if (classe === CLASSES_COMPTES.TIERS) {
        // Classe 4 : DÉCOMPENSATION selon type de compte
        
        // CAS SPÉCIAL : Comptes 401 (Fournisseurs) et 411 (Clients)
        // → Gestion PAR COMPTE AUXILIAIRE sans compensation
        if (racineCompte === '401' || racineCompte === '411') {
          if (solde > 0) {
            this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
          } else if (solde < 0) {
            this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
          }
        } else {
          // AUTRES COMPTES DE CLASSE 4 : Gestion par solde global
          if (solde > 0) {
            this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
          } else if (solde < 0) {
            this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
          }
        }
        
      } else if (classe === CLASSES_COMPTES.FINANCIER) {
        // Classe 5 : Selon le solde (banques, caisse, etc.)
        if (solde > 0) {
          this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
        } else if (solde < 0) {
          this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
        }
      }
    });

    // Appliquer les amortissements aux immobilisations
    this._appliquerAmortissements(actif, amortissements);

    // Enrichir chaque compte d'immobilisation avec ses amortissements individuels
    this._enrichirImmobilisationsAvecAmortissements(actif, soldes);

    return { actif, passif };
  }

  /**
   * Ajoute un compte à un groupe (regroupement par sous-classe = 2 chiffres)
   * @param {Object} structure - Structure actif ou passif
   * @param {string} sousClasse - Sous-classe à 2 chiffres
   * @param {Object} compte - Compte à ajouter
   * @param {number} montant - Montant à ajouter
   * @param {string} type - 'actif' ou 'passif'
   * @private
   */
  static _ajouterAuGroupe(structure, sousClasse, compte, montant, type = 'actif') {
    if (!structure[sousClasse]) {
      structure[sousClasse] = {
        sousClasse,
        libelle: getAccountLabel(sousClasse) || `Classe ${sousClasse}`,
        comptes: [],
        brut: 0,
        amortissements: 0,
        net: 0
      };
    }

    structure[sousClasse].comptes.push({
      compteNum: compte.compteNum,
      compteLibelle: compte.compteLibelle,
      totalDebit: compte.debit || 0,
      totalCredit: compte.credit || 0,
      solde: compte.solde || 0,
      montant: montant,
      type: type
    });

    structure[sousClasse].brut += montant;
    structure[sousClasse].net += montant;
  }

  /**
   * Applique les amortissements aux immobilisations
   * @param {Object} actif - Structure de l'actif
   * @param {Object} amortissements - Amortissements par classe
   * @private
   */
  static _appliquerAmortissements(actif, amortissements) {
    Object.keys(amortissements).forEach(sousClasse => {
      if (actif[sousClasse] && amortissements[sousClasse] > 0) {
        actif[sousClasse].amortissements = amortissements[sousClasse];
        actif[sousClasse].net = actif[sousClasse].brut - amortissements[sousClasse];
      }
    });
  }

  /**
   * Calcule les amortissements détaillés pour chaque compte d'immobilisation
   * @param {Object} soldesComptes - Soldes de tous les comptes
   * @returns {Object<string, number>} Amortissements par compte
   * @private
   */
  static _calculerAmortissementsDetailles(soldesComptes) {
    const amortissementsParCompte = {};

    Object.values(soldesComptes).forEach(compte => {
      const compteNum = compte.compteNum || '';
      
      if (!compteNum.startsWith('28') && !compteNum.startsWith('29')) return;

      const montantAmortissement = Math.max(0, compte.credit - compte.debit);
      if (montantAmortissement < SEUILS.SOLDE_NUL) return;

      const prefixeComplet = compteNum.substring(0, 3);
      const classeImmob = MAPPING_AMORTISSEMENTS[prefixeComplet];
      
      if (!classeImmob) return;

      const suffixe = compteNum.substring(2);
      const compteImmobAttendu = classeImmob + suffixe + '0';
      
      if (!amortissementsParCompte[compteImmobAttendu]) {
        amortissementsParCompte[compteImmobAttendu] = 0;
      }
      amortissementsParCompte[compteImmobAttendu] += montantAmortissement;
    });

    return amortissementsParCompte;
  }

  /**
   * Enrichit les comptes d'immobilisations avec leurs amortissements individuels
   * @param {Object} actif - Structure de l'actif
   * @param {Object} soldesComptes - Soldes de tous les comptes
   * @private
   */
  static _enrichirImmobilisationsAvecAmortissements(actif, soldesComptes) {
    const amortissementsParCompte = this._calculerAmortissementsDetailles(soldesComptes);

    ['20', '21', '22', '23', '26', '27'].forEach(sousClasse => {
      if (!actif[sousClasse] || !actif[sousClasse].comptes) return;

      actif[sousClasse].comptes = actif[sousClasse].comptes.map(compte => {
        const compteNum = compte.compteNum || '';
        const brut = compte.montant || 0;
        const amortissements = amortissementsParCompte[compteNum] || 0;
        const net = brut - amortissements;
        const vetuste = brut > 0 ? Math.min(100, (amortissements / brut) * 100) : 0;

        return {
          ...compte,
          brut,
          amortissements,
          net,
          vetuste
        };
      });
    });
  }

  /**
   * ÉTAPE 5 : Ajoute le résultat au passif (compte 12)
   * @param {Object} passif - Structure du passif
   * @param {number} resultat - Résultat net
   * @private
   */
  static _ajouterResultatAuPassif(passif, resultat) {
    const sousClasse = '12';

    if (!passif[sousClasse]) {
      passif[sousClasse] = {
        sousClasse,
        libelle: 'Résultat de l\'exercice',
        comptes: [],
        brut: 0,
        amortissements: 0,
        net: 0
      };
    }

    passif[sousClasse].comptes.push({
      compteNum: '12',
      compteLibelle: resultat >= 0 ? 'Résultat de l\'exercice (bénéfice)' : 'Résultat de l\'exercice (perte)',
      totalDebit: 0,
      totalCredit: 0,
      solde: resultat,
      montant: resultat,
      type: 'passif'
    });

    passif[sousClasse].brut = resultat;
    passif[sousClasse].net = resultat;
  }

  /**
   * ÉTAPE 6 : Structure le bilan selon le format PCG
   * @param {Object} actifBrut - Actif brut
   * @param {Object} passifBrut - Passif brut
   * @returns {Object} Bilan structuré
   * @private
   */
  static _structurerBilan(actifBrut, passifBrut) {
    // Utiliser les constantes pour la structure
    const immobilisations = this._extraireParClasses(actifBrut, 
      Object.values(STRUCTURE_BILAN.ACTIF.IMMOBILISE).flat());
    const stocks = this._extraireParClasses(actifBrut, 
      STRUCTURE_BILAN.ACTIF.CIRCULANT.STOCKS);
    const creances = this._extraireParClasses(actifBrut, 
      STRUCTURE_BILAN.ACTIF.CIRCULANT.CREANCES);
    const tresorerieActif = this._extraireParClasses(actifBrut, 
      STRUCTURE_BILAN.ACTIF.CIRCULANT.TRESORERIE);

    const capitauxPropres = this._extraireParClasses(passifBrut, 
      STRUCTURE_BILAN.PASSIF.CAPITAUX_PROPRES);
    const provisions = this._extraireParClasses(passifBrut, 
      STRUCTURE_BILAN.PASSIF.PROVISIONS);
    const dettesLongTerme = this._extraireParClasses(passifBrut, 
      STRUCTURE_BILAN.PASSIF.DETTES_LONG_TERME);
    const dettesCourtTerme = this._extraireParClasses(passifBrut, 
      STRUCTURE_BILAN.PASSIF.DETTES_COURT_TERME);
    const tresoreriePassif = this._extraireParClasses(passifBrut, 
      STRUCTURE_BILAN.PASSIF.TRESORERIE);

    // Calculer les totaux
    const totalImmobilisations = this._calculerTotal(immobilisations);
    const totalStocks = this._calculerTotal(stocks);
    const totalCreances = this._calculerTotal(creances);
    const totalTresorerieActif = this._calculerTotal(tresorerieActif);
    const totalActifCirculant = totalStocks + totalCreances + totalTresorerieActif;
    const totalActif = totalImmobilisations + totalActifCirculant;

    const totalCapitauxPropres = this._calculerTotal(capitauxPropres);
    const totalProvisions = this._calculerTotal(provisions);
    const totalDettesLongTerme = this._calculerTotal(dettesLongTerme);
    const totalDettesCourtTerme = this._calculerTotal(dettesCourtTerme);
    const totalTresoreriePassif = this._calculerTotal(tresoreriePassif);
    const totalPassifCirculant = totalDettesCourtTerme + totalTresoreriePassif;
    const totalPassif = totalCapitauxPropres + totalProvisions + totalDettesLongTerme + totalPassifCirculant;

    return {
      actif: {
        immobilise: immobilisations,
        circulant: {
          stocks,
          creances,
          tresorerie: tresorerieActif
        },
        totalImmobilise: totalImmobilisations,
        totalStocks,
        totalCreances,
        totalTresorerie: totalTresorerieActif,
        totalCirculant: totalActifCirculant,
        total: totalActif
      },
      passif: {
        capitauxPropres,
        provisions,
        dettesLongTerme,
        dettesCourtTerme,
        tresorerie: tresoreriePassif,
        totalCapitauxPropres,
        totalProvisions,
        totalDettesLongTerme,
        totalDettesCourtTerme,
        totalTresorerie: totalTresoreriePassif,
        totalPassifCirculant,
        total: totalPassif
      },
      equilibre: {
        totalActif,
        totalPassif,
        ecart: totalActif - totalPassif
      }
    };
  }

  /**
   * Extrait les éléments d'une liste de sous-classes
   * @param {Object} structure - Structure actif ou passif
   * @param {Array<string>} sousClasses - Liste des sous-classes
   * @returns {Array} Éléments extraits
   * @private
   */
  static _extraireParClasses(structure, sousClasses) {
    return Object.values(structure)
      .filter(item => sousClasses.includes(item.sousClasse))
      .sort((a, b) => a.sousClasse.localeCompare(b.sousClasse))
      .map(item => ({
        classe: item.sousClasse,
        libelle: item.libelle,
        brut: item.brut || 0,
        amortissements: item.amortissements || 0,
        net: item.net || 0,
        comptes: item.comptes || []
      }));
  }

  /**
   * Calcule le total d'une catégorie
   * @param {Array} items - Items à totaliser
   * @returns {number} Total
   * @private
   */
  static _calculerTotal(items) {
    return items.reduce((sum, item) => sum + (item.net || 0), 0);
  }

  /**
   * Vérifie si un compte est présent dans le bilan
   * @param {string} compteNum - Numéro de compte
   * @param {Object} bilan - Bilan structuré
   * @returns {boolean} True si le compte est dans le bilan
   * @private
   */
  static _compteEstDansBilan(compteNum, bilan) {
    // Vérifier dans l'actif
    const toutesLesCategories = [
      ...bilan.actif.immobilise,
      ...bilan.actif.circulant.stocks,
      ...bilan.actif.circulant.creances,
      ...bilan.actif.circulant.tresorerie,
      ...bilan.passif.capitauxPropres,
      ...bilan.passif.provisions,
      ...bilan.passif.dettesLongTerme,
      ...bilan.passif.dettesCourtTerme,
      ...bilan.passif.tresorerie
    ];

    return toutesLesCategories.some(categorie => 
      categorie.comptes && categorie.comptes.some(compte => 
        compte.compteNum === compteNum
      )
    );
  }

  /**
   * ÉTAPE 7 : Valide l'équilibre du bilan et identifie les comptes non affectés
   * @param {Object} bilan - Bilan structuré
   * @param {Object} soldes - Soldes de tous les comptes
   * @param {Object} actif - Structure de l'actif
   * @param {Object} passif - Structure du passif
   * @returns {Object} Résultat de la validation
   * @private
   */
  static _validerBilan(bilan, soldes, actif, passif) {
    const errors = [];
    const warnings = [];
    const comptesNonAffectes = [];

    const totalActif = bilan.actif.total;
    const totalPassif = bilan.passif.total;
    const ecart = Math.abs(totalActif - totalPassif);

    // Vérifier l'équilibre
    if (ecart > SEUILS.EQUILIBRE_BILAN) {
      errors.push(
        `Bilan non équilibré : Actif = ${totalActif.toFixed(2)}€, ` +
        `Passif = ${totalPassif.toFixed(2)}€, Écart = ${ecart.toFixed(2)}€`
      );
    }

    // Avertissements si passif négatif (perte)
    if (totalPassif < 0) {
      warnings.push('Capitaux propres négatifs : situation financière critique');
    }

    // Identifier les comptes de bilan (classe 1-5) non affectés
    Object.values(soldes).forEach(compte => {
      const classe = compte.compteNum[0];
      if (CLASSES_COMPTES.BILAN.includes(classe)) {
        const estDansBilan = this._compteEstDansBilan(compte.compteNum, bilan);
        if (!estDansBilan && Math.abs(compte.solde) > SEUILS.SOLDE_NUL) {
          comptesNonAffectes.push({
            compteNum: compte.compteNum,
            compteLibelle: compte.compteLibelle,
            totalDebit: compte.debit,
            totalCredit: compte.credit,
            solde: compte.solde
          });
        }
      }
    });

    if (comptesNonAffectes.length > 0) {
      warnings.push(
        `${comptesNonAffectes.length} compte(s) de bilan non affecté(s). ` +
        `Vérifiez la logique d'affectation.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      equilibre: ecart <= SEUILS.EQUILIBRE_BILAN,
      comptesNonAffectes
    };
  }
}

// Export de la fonction principale
export const generateBilan = (parseResult) => BilanGenerator.generateBilan(parseResult);
