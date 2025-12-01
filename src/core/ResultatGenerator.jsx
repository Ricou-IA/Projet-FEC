/**
 * GÉNÉRATEUR DE COMPTE DE RÉSULTAT PCG 2025 - VERSION 2
 * =========================================================
 * 
 * Architecture simplifiée pour générer un compte de résultat conforme
 * au Plan Comptable Général français (PCG 2025)
 * 
 * PRINCIPES DE BASE :
 * 1. Agrégation des écritures FEC par compte
 * 2. Classification en catégories (Exploitation, Financier, Exceptionnel)
 * 3. Présentation au niveau 2 positions (60, 61, 62, etc.)
 * 4. Détails optionnels au niveau 3 positions (601, 602, etc.)
 * 5. Calcul des soldes selon les règles PCG (Charges: D-C, Produits: C-D)
 */

import reglesAffectation from '../data/regles-affectation-comptes.json';

/**
 * Classe principale pour la génération du compte de résultat
 */
export class CompteResultatGeneratorV2 {
  
  /**
   * Constructeur
   */
  constructor() {
    this.comptes = {};
    this.resultats = {
      charges: {
        exploitation: [],
        financieres: [],
        exceptionnelles: [],
        participationImpots: []
      },
      produits: {
        exploitation: [],
        financiers: [],
        exceptionnels: []
      },
      totaux: {
        chargesExploitation: 0,
        produitsExploitation: 0,
        chargesFinancieres: 0,
        produitsFinanciers: 0,
        chargesExceptionnelles: 0,
        produitsExceptionnels: 0,
        participationImpots: 0
      },
      resultatsIntermediaires: {
        exploitation: 0,
        financier: 0,
        courantAvantImpots: 0,
        exceptionnel: 0,
        net: 0
      },
      chiffreAffaires: 0
    };
  }

  /**
   * Point d'entrée principal : génère le compte de résultat à partir des données FEC
   * @param {Object} parseResult - Résultat du parsing FEC {data: [...]}
   * @returns {Object} Compte de résultat structuré
   */
  generate(parseResult) {
    if (!parseResult?.data || parseResult.data.length === 0) {
      throw new Error('Aucune donnée FEC fournie');
    }

    // Étape 1 : Agrégation des écritures par compte
    this._agregerEcritures(parseResult.data);
    
    // Étape 2 : Classification et structuration
    this._classerComptes();
    
    // Étape 3 : Calcul des totaux et résultats intermédiaires
    this._calculerTotaux();
    
    // Étape 4 : Calcul du chiffre d'affaires
    this._calculerChiffreAffaires();
    
    return this._formaterResultat();
  }

  /**
   * ÉTAPE 1 : Agrège les écritures FEC par numéro de compte
   * @param {Array} ecritures - Liste des écritures FEC
   * @private
   */
  _agregerEcritures(ecritures) {
    ecritures.forEach(ecriture => {
      const compteNum = ecriture.compteNum || '';
      const classe = compteNum.charAt(0);
      
      // Ne traiter que les comptes de résultat (classes 6 et 7)
      if (classe !== '6' && classe !== '7') {
        return;
      }

      if (!this.comptes[compteNum]) {
        this.comptes[compteNum] = {
          numero: compteNum,
          libelle: ecriture.compteLibelle || this._getLibelleCompte(compteNum),
          debit: 0,
          credit: 0,
          solde: 0,
          classe: classe,
          niveau2: compteNum.substring(0, 2),
          niveau3: compteNum.substring(0, 3)
        };
      }

      this.comptes[compteNum].debit += (ecriture.debit || 0);
      this.comptes[compteNum].credit += (ecriture.credit || 0);
    });

    // Calcul des soldes selon les règles PCG
    Object.values(this.comptes).forEach(compte => {
      if (compte.classe === '6') {
        // CHARGES : solde = débit - crédit (normalement débiteur)
        compte.solde = compte.debit - compte.credit;
      } else if (compte.classe === '7') {
        // PRODUITS : solde = crédit - débit (normalement créditeur)
        compte.solde = compte.credit - compte.debit;
      }
    });
  }

  /**
   * ÉTAPE 2 : Classifie les comptes par catégorie et niveau
   * 1. Classifie chaque compte initial (niveau 3+) en Exploitation/Financier/Exceptionnel
   * 2. Réduit à 2 positions (regroupe par niveau 2)
   * 3. Affiche la somme des comptes à 2 positions
   * @private
   */
  _classerComptes() {
    // Structure pour regrouper les comptes par niveau 2 ET par catégorie
    // Note: Les catégories sont différentes pour charges et produits
    const comptesParCategorieEtNiveau2 = {
      // Catégories pour les charges
      exploitation: {},
      financieres: {},
      exceptionnelles: {},
      participationImpots: {},
      // Catégories pour les produits (noms différents)
      financiers: {},
      exceptionnels: {}
    };

    // ÉTAPE 1 : Classifier chaque compte initial selon sa catégorie
    // ÉTAPE 2 : Regrouper par niveau 2 dans la catégorie appropriée
    Object.values(this.comptes).forEach(compte => {
      // 1. CLASSIFICATION : Déterminer la catégorie selon le compte détaillé (niveau 3+)
      const categorie = this._determinerCategorie(compte.numero);
      
      if (!categorie) {
        return;
      }
      
      // 2. Déterminer si c'est une charge ou un produit
      const type = compte.classe === '6' ? 'charges' : 'produits';
      
      // 3. RÉDUCTION À 2 POSITIONS : Utiliser le niveau 2 pour le regroupement
      // Tous les comptes (601, 602, 681, 686, etc.) sont regroupés par leur niveau 2 (60, 68, etc.)
      const niveau2 = compte.niveau2;
      
      // 4. Initialiser l'entrée au niveau 2 pour cette catégorie si elle n'existe pas
      if (!comptesParCategorieEtNiveau2[categorie][niveau2]) {
        comptesParCategorieEtNiveau2[categorie][niveau2] = {
          numero: niveau2, // Toujours afficher au niveau 2
          classe: niveau2, // Alias pour compatibilité avec la vue
          libelle: this._getLibelleCompte(niveau2),
          debit: 0,
          credit: 0,
          solde: 0,
          type: type,
          categorie: categorie,
          detailsNiveau3: [] // Détails optionnels pour affichage détaillé
        };
      }

      // 5. SOMME : Cumuler les montants au niveau 2
      comptesParCategorieEtNiveau2[categorie][niveau2].debit += compte.debit;
      comptesParCategorieEtNiveau2[categorie][niveau2].credit += compte.credit;
      comptesParCategorieEtNiveau2[categorie][niveau2].solde += compte.solde;
      
      // 6. Ajouter les détails niveau 3+ (optionnel, pour affichage détaillé)
      if (compte.numero.length > 2) {
        const detailExistant = comptesParCategorieEtNiveau2[categorie][niveau2].detailsNiveau3
          .find(d => d.numero === compte.numero);
        
        if (!detailExistant) {
          comptesParCategorieEtNiveau2[categorie][niveau2].detailsNiveau3.push({
            numero: compte.numero,
            libelle: compte.libelle,
            debit: compte.debit,
            credit: compte.credit,
            solde: compte.solde
          });
        } else {
          // Si le compte existe déjà (cas rare), cumuler
          detailExistant.debit += compte.debit;
          detailExistant.credit += compte.credit;
          detailExistant.solde += compte.solde;
        }
      }
    });

    // Transférer dans la structure de résultats
    Object.keys(comptesParCategorieEtNiveau2).forEach(categorie => {
      const comptesDeCategorie = Object.values(comptesParCategorieEtNiveau2[categorie]);
      
      comptesDeCategorie.forEach(compte => {
        if (compte.type === 'charges') {
          // Vérifier que la catégorie existe pour les charges
          if (this.resultats.charges[categorie]) {
            this.resultats.charges[categorie].push(compte);
          }
        } else if (compte.type === 'produits') {
          // Pour les produits, utiliser directement la catégorie (financiers, exceptionnels, exploitation)
          if (this.resultats.produits[categorie]) {
            this.resultats.produits[categorie].push(compte);
          }
        }
      });
    });

    // Tri par numéro de compte
    Object.keys(this.resultats.charges).forEach(cat => {
      this.resultats.charges[cat].sort((a, b) => a.numero.localeCompare(b.numero));
    });
    Object.keys(this.resultats.produits).forEach(cat => {
      this.resultats.produits[cat].sort((a, b) => a.numero.localeCompare(b.numero));
    });
  }

  /**
   * ÉTAPE 3 : Calcule les totaux par catégorie et les résultats intermédiaires
   * @private
   */
  _calculerTotaux() {
    // Totaux des charges
    this.resultats.totaux.chargesExploitation = this._sommerSoldes(this.resultats.charges.exploitation);
    this.resultats.totaux.chargesFinancieres = this._sommerSoldes(this.resultats.charges.financieres);
    this.resultats.totaux.chargesExceptionnelles = this._sommerSoldes(this.resultats.charges.exceptionnelles);
    this.resultats.totaux.participationImpots = this._sommerSoldes(this.resultats.charges.participationImpots);

    // Totaux des produits
    this.resultats.totaux.produitsExploitation = this._sommerSoldes(this.resultats.produits.exploitation);
    this.resultats.totaux.produitsFinanciers = this._sommerSoldes(this.resultats.produits.financiers);
    this.resultats.totaux.produitsExceptionnels = this._sommerSoldes(this.resultats.produits.exceptionnels);

    // Résultats intermédiaires conformes PCG
    this.resultats.resultatsIntermediaires.exploitation = 
      this.resultats.totaux.produitsExploitation - this.resultats.totaux.chargesExploitation;
    
    this.resultats.resultatsIntermediaires.financier = 
      this.resultats.totaux.produitsFinanciers - this.resultats.totaux.chargesFinancieres;
    
    this.resultats.resultatsIntermediaires.courantAvantImpots = 
      this.resultats.resultatsIntermediaires.exploitation + 
      this.resultats.resultatsIntermediaires.financier;
    
    this.resultats.resultatsIntermediaires.exceptionnel = 
      this.resultats.totaux.produitsExceptionnels - this.resultats.totaux.chargesExceptionnelles;
    
    this.resultats.resultatsIntermediaires.net = 
      this.resultats.resultatsIntermediaires.courantAvantImpots + 
      this.resultats.resultatsIntermediaires.exceptionnel - 
      this.resultats.totaux.participationImpots;
  }

  /**
   * ÉTAPE 4 : Calcule le chiffre d'affaires (comptes 70x)
   * @private
   */
  _calculerChiffreAffaires() {
    // CA = 701 + 702 + 703 + 704 + 705 + 706 + 707 + 708 + 709
    // Note : 709 (RRR accordés) est déjà négatif, il se soustrait automatiquement
    const codesCA = ['701', '702', '703', '704', '705', '706', '707', '708', '709'];
    
    codesCA.forEach(code => {
      Object.values(this.comptes).forEach(compte => {
        if (compte.numero.startsWith(code)) {
          this.resultats.chiffreAffaires += compte.solde;
        }
      });
    });
  }

  /**
   * Détermine la catégorie d'un compte (exploitation, financier, exceptionnel, participationImpots)
   * Utilise les règles définies dans regles-affectation-comptes.json
   * @param {string} compteNum - Numéro de compte (niveau 2 ou 3)
   * @returns {string|null} Nom de la catégorie
   * @private
   */
  _determinerCategorie(compteNum) {
    const categories = reglesAffectation.categories;
    if (!categories) return null;

    // Fonction helper pour vérifier si un compte correspond à un pattern
    const matchesPattern = (pattern) => {
      if (pattern.endsWith('x')) {
        // Pattern avec 'x' : "60x" signifie tous les comptes commençant par "60"
        return compteNum.startsWith(pattern.slice(0, -1));
      }
      // Pattern exact : "60" signifie le compte "60" ou tous les comptes commençant par "60"
      return compteNum.startsWith(pattern);
    };

    // Vérifier d'abord les comptes ventilés (68, 78, 79) au niveau 3
    // COMPTE 68 - VENTILÉ selon niveau 3
    if (compteNum.startsWith('68')) {
      if (compteNum.startsWith('681')) return 'exploitation';
      if (compteNum.startsWith('686')) return 'financieres';
      if (compteNum.startsWith('687')) return 'exceptionnelles';
      // Si 68 sans précision niveau 3, ne pas l'inclure (doit être ventilé)
      return null;
    }
    
    // COMPTE 78 - VENTILÉ selon niveau 3
    if (compteNum.startsWith('78')) {
      if (compteNum.startsWith('781')) return 'exploitation';
      if (compteNum.startsWith('786')) return 'financiers';
      if (compteNum.startsWith('787')) return 'exceptionnels';
      // Si 78 sans précision niveau 3, ne pas l'inclure (doit être ventilé)
      return null;
    }
    
    // COMPTE 79 - VENTILÉ selon niveau 3
    if (compteNum.startsWith('79')) {
      if (compteNum.startsWith('791')) return 'exploitation';
      if (compteNum.startsWith('796')) return 'financiers';
      if (compteNum.startsWith('797')) return 'exceptionnels';
      // Si 79 sans précision niveau 3, ne pas l'inclure (doit être ventilé)
      return null;
    }

    // Vérifier les CHARGES (classe 6)
    if (categories.exploitation?.charges) {
      for (const pattern of categories.exploitation.charges) {
        if (matchesPattern(pattern)) {
          return 'exploitation';
        }
      }
    }
    
    if (categories.financier?.charges) {
      for (const pattern of categories.financier.charges) {
        if (matchesPattern(pattern)) {
          return 'financieres';
        }
      }
    }
    
    if (categories.exceptionnel?.charges) {
      for (const pattern of categories.exceptionnel.charges) {
        if (matchesPattern(pattern)) {
          return 'exceptionnelles';
        }
      }
    }
    
    if (categories.participationImpots?.charges) {
      for (const pattern of categories.participationImpots.charges) {
        if (matchesPattern(pattern)) {
          return 'participationImpots';
        }
      }
    }

    // Vérifier les PRODUITS (classe 7)
    if (categories.exploitation?.produits) {
      for (const pattern of categories.exploitation.produits) {
        if (matchesPattern(pattern)) {
          return 'exploitation';
        }
      }
    }
    
    if (categories.financier?.produits) {
      for (const pattern of categories.financier.produits) {
        if (matchesPattern(pattern)) {
          return 'financiers';
        }
      }
    }
    
    if (categories.exceptionnel?.produits) {
      for (const pattern of categories.exceptionnel.produits) {
        if (matchesPattern(pattern)) {
          return 'exceptionnels';
        }
      }
    }

    return null;
  }

  /**
   * Récupère le libellé d'un compte depuis le fichier JSON
   * @param {string} compteNum - Numéro de compte
   * @returns {string} Libellé du compte
   * @private
   */
  _getLibelleCompte(compteNum) {
    const classe = compteNum.charAt(0);
    const classeKey = `classe${classe}`;
    
    // Recherche par longueur décroissante (3, 2 chiffres)
    for (let len = compteNum.length; len >= 2; len--) {
      const code = compteNum.substring(0, len);
      const config = reglesAffectation?.libellesComptes?.[classeKey]?.[code];
      if (config?.libelle) {
        return config.libelle;
      }
    }

    return `Compte ${compteNum}`;
  }

  /**
   * Somme les soldes d'une liste de comptes
   * @param {Array} comptes - Liste de comptes
   * @returns {number} Somme des soldes
   * @private
   */
  _sommerSoldes(comptes) {
    return comptes.reduce((sum, compte) => sum + (compte.solde || 0), 0);
  }

  /**
   * Formate un montant pour l'affichage
   * @param {number} montant - Montant à formater
   * @returns {string} Montant formaté
   * @private
   */
  _formatMontant(montant) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(montant);
  }

  /**
   * Formate le résultat final pour export/affichage
   * @returns {Object} Résultat structuré
   * @private
   */
  _formaterResultat() {
    return {
      formatHierarchique: true, // Compatibilité avec l'ancien code
      metadata: {
        dateGeneration: new Date().toISOString(),
        nombreEcritures: Object.keys(this.comptes).length,
        conformePCG2025: true
      },
      chiffreAffaires: this.resultats.chiffreAffaires,
      charges: {
        exploitation: {
          titre: 'CHARGES D\'EXPLOITATION',
          comptes: this.resultats.charges.exploitation,
          total: this.resultats.totaux.chargesExploitation
        },
        financieres: {
          titre: 'CHARGES FINANCIÈRES',
          comptes: this.resultats.charges.financieres,
          total: this.resultats.totaux.chargesFinancieres
        },
        exceptionnelles: {
          titre: 'CHARGES EXCEPTIONNELLES',
          comptes: this.resultats.charges.exceptionnelles,
          total: this.resultats.totaux.chargesExceptionnelles
        },
        participationImpots: {
          titre: 'PARTICIPATION ET IMPÔTS SUR LES BÉNÉFICES',
          comptes: this.resultats.charges.participationImpots,
          total: this.resultats.totaux.participationImpots
        }
      },
      produits: {
        exploitation: {
          titre: 'PRODUITS D\'EXPLOITATION',
          comptes: this.resultats.produits.exploitation,
          total: this.resultats.totaux.produitsExploitation
        },
        financiers: {
          titre: 'PRODUITS FINANCIERS',
          comptes: this.resultats.produits.financiers,
          total: this.resultats.totaux.produitsFinanciers
        },
        exceptionnels: {
          titre: 'PRODUITS EXCEPTIONNELS',
          comptes: this.resultats.produits.exceptionnels,
          total: this.resultats.totaux.produitsExceptionnels
        }
      },
      resultatsIntermediaires: {
        exploitation: {
          libelle: 'RÉSULTAT D\'EXPLOITATION',
          montant: this.resultats.resultatsIntermediaires.exploitation,
          formule: 'Produits d\'exploitation - Charges d\'exploitation'
        },
        financier: {
          libelle: 'RÉSULTAT FINANCIER',
          montant: this.resultats.resultatsIntermediaires.financier,
          formule: 'Produits financiers - Charges financières'
        },
        courantAvantImpots: {
          libelle: 'RÉSULTAT COURANT AVANT IMPÔTS',
          montant: this.resultats.resultatsIntermediaires.courantAvantImpots,
          formule: 'Résultat d\'exploitation + Résultat financier'
        },
        exceptionnel: {
          libelle: 'RÉSULTAT EXCEPTIONNEL',
          montant: this.resultats.resultatsIntermediaires.exceptionnel,
          formule: 'Produits exceptionnels - Charges exceptionnelles'
        },
        net: {
          libelle: 'RÉSULTAT NET DE L\'EXERCICE',
          montant: this.resultats.resultatsIntermediaires.net,
          formule: 'Résultat courant + Résultat exceptionnel - Participation et impôts',
          type: this.resultats.resultatsIntermediaires.net >= 0 ? 'BÉNÉFICE' : 'PERTE'
        }
      },
      validation: {
        totalCharges: this.resultats.totaux.chargesExploitation + 
                      this.resultats.totaux.chargesFinancieres + 
                      this.resultats.totaux.chargesExceptionnelles + 
                      this.resultats.totaux.participationImpots,
        totalProduits: this.resultats.totaux.produitsExploitation + 
                       this.resultats.totaux.produitsFinanciers + 
                       this.resultats.totaux.produitsExceptionnels,
        ecart: Math.abs(
          (this.resultats.totaux.produitsExploitation + 
           this.resultats.totaux.produitsFinanciers + 
           this.resultats.totaux.produitsExceptionnels) - 
          (this.resultats.totaux.chargesExploitation + 
           this.resultats.totaux.chargesFinancieres + 
           this.resultats.totaux.chargesExceptionnelles + 
           this.resultats.totaux.participationImpots) - 
          this.resultats.resultatsIntermediaires.net
        ),
        equilibre: true
      }
    };
  }
}

/**
 * Fonction d'export principale (compatible avec l'ancien code)
 * @param {Object} parseResult - Résultat du parsing FEC
 * @returns {Object} Compte de résultat
 */
export function generateCompteResultat(parseResult) {
  const generator = new CompteResultatGeneratorV2();
  return generator.generate(parseResult);
}

/**
 * Classe wrapper pour compatibilité avec l'ancien code
 * Utilise CompteResultatGeneratorV2 en interne
 */
export class ResultatGenerator {
  /**
   * Génère le compte de résultat (méthode statique pour compatibilité)
   * @param {Object} parseResult - Résultat du parsing FEC
   * @returns {Object} Compte de résultat
   */
  static generateCompteResultat(parseResult) {
    const generator = new CompteResultatGeneratorV2();
    return generator.generate(parseResult);
  }
}

export default CompteResultatGeneratorV2;