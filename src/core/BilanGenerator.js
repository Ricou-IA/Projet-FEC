import {
  getAccountType,
  getBilanPosition,
  getResultatPosition,
  getAccountLabel,
  isRegularisationAccount,
  isTVAAccount,
  isDoublePositionAccount,
  getDoublePositionInfo
} from './AccountClassifier';
import {
  calculerDoublePosition,
  calculerDoublePositionTVA,
  calculerDoublePositionBanques,
  getComptesDoublePosition,
  validerBilan
} from './BilanDoublePosition';
import reglesAffectation from '../data/regles-affectation-comptes.json';

/**
 * Générateur de Bilan selon le Plan Comptable Général (PCG) 2025
 * Utilise AccountClassifier et les règles définies dans regles-affectation-comptes.json
 */
export class BilanGenerator {
  /**
   * Génère le bilan à partir des données FEC
   * @param {Object} parseResult - Résultat du parsing FEC contenant { data: [] }
   * @returns {Object|null} Structure du bilan ou null si pas de données
   */
  static generateBilan(parseResult) {
    if (!parseResult || !parseResult.data || parseResult.data.length === 0) {
      return null;
    }

    // RÈGLE CRITIQUE : Ne JAMAIS compenser les soldes débiteurs et créditeurs
    // Utiliser le module BilanDoublePosition pour garantir le respect de cette règle
    const actif = {};
    const passif = {};
    const comptesRegulisation = {};
    
    // Filtrer les données FEC pour ne garder que les comptes de BILAN
    const fecBilan = parseResult.data.filter(row => {
      const compteNum = row.compteNum || '';
      return getAccountType(compteNum) === 'BILAN';
    });

    // 1. TRAITER LES COMPTES TVA EN PREMIER (NON COMPENSABLES)
    // RÈGLE : 4456 (TVA déductible) ≠ 4455/4457 (TVA à payer)
    const tvaResult = calculerDoublePositionTVA(fecBilan);
    
    if (tvaResult.actif[4456] > 0) {
      // TVA déductible → ACTIF
      BilanGenerator._addTVAToActif(actif, tvaResult.actif[4456], tvaResult.detail[4456]);
    }
    
    if (tvaResult.passif[4455] > 0) {
      // TVA à décaisser → PASSIF
      BilanGenerator._addTVAToPassif(passif, tvaResult.passif[4455], '4455', tvaResult.detail[4455]);
    }
    
    if (tvaResult.passif[4457] > 0) {
      // TVA collectée → PASSIF
      BilanGenerator._addTVAToPassif(passif, tvaResult.passif[4457], '4457', tvaResult.detail[4457]);
    }

    // 2. TRAITER LES COMPTES BANQUES (51) - Calcul PAR BANQUE
    // RÈGLE : Ne pas compenser entre banques différentes
    const banquesResult = calculerDoublePositionBanques(fecBilan);
    
    if (banquesResult.actif > 0) {
      // Disponibilités bancaires → ACTIF
      BilanGenerator._addDoublePositionToActif(
        actif, 
        '51', 
        banquesResult.libelles.actif, 
        banquesResult.detail.banquesActif, 
        banquesResult.actif, 
        banquesResult.libelles.rubriqueActif || 'C - Trésorerie'
      );
    }
    
    if (banquesResult.passif > 0) {
      // Découverts bancaires → PASSIF
      BilanGenerator._addDoublePositionToPassif(
        passif, 
        '51', 
        banquesResult.libelles.passif, 
        banquesResult.detail.banquesPassif, 
        banquesResult.passif, 
        banquesResult.libelles.rubriquePassif || 'Emprunts et dettes financières'
      );
    }

    // 3. TRAITER LES AUTRES COMPTES À DOUBLE POSITION
    // Exclure 44 (TVA déjà traitée séparément) et 51 (banques déjà traitées)
    const racinesDoublePosition = getComptesDoublePosition().filter(r => 
      r !== '44' && r !== '51'
    );
    
    racinesDoublePosition.forEach(racine => {
      // Exclure les comptes déjà traités du calcul
      const fecFiltre = fecBilan.filter(row => {
        const compteNum = row.compteNum || '';
        // Ne pas inclure les comptes TVA (déjà traités)
        if (isTVAAccount(compteNum)) return false;
        // Ne pas inclure les banques (déjà traitées)
        if (racine !== '51' && compteNum.startsWith('51')) return false;
        // Exclure aussi 486/487 (traités séparément)
        if (compteNum.startsWith('486') || compteNum.startsWith('487')) return false;
        return compteNum.startsWith(racine);
      });

      const result = calculerDoublePosition(fecFiltre, racine);
      
      // Ajouter à l'ACTIF si total > 0
      if (result.actif > 0) {
        BilanGenerator._addDoublePositionToActif(
          actif, 
          racine, 
          result.libelles.actif, 
          result.detail.debiteurs, 
          result.actif, 
          result.libelles.rubriqueActif
        );
      }
      
      // Ajouter au PASSIF si total > 0
      if (result.passif > 0) {
        BilanGenerator._addDoublePositionToPassif(
          passif, 
          racine, 
          result.libelles.passif, 
          result.detail.crediteurs, 
          result.passif, 
          result.libelles.rubriquePassif
        );
      }
    });

    // 4. TRAITER LES COMPTES DE RÉGULARISATION (486, 487)
    const fecRegulisation = fecBilan.filter(row => {
      const compteNum = row.compteNum || '';
      return compteNum.startsWith('486') || compteNum.startsWith('487');
    });

    // Agrégation par compte de régularisation
    const comptes486 = {};
    const comptes487 = {};

    fecRegulisation.forEach(row => {
      const compteNum = row.compteNum || '';
      
      if (compteNum.startsWith('486')) {
        if (!comptes486[compteNum]) {
          comptes486[compteNum] = {
            compteNum,
            compteLibelle: row.compteLibelle || getAccountLabel(compteNum),
            totalDebit: 0,
            totalCredit: 0
          };
        }
        comptes486[compteNum].totalDebit += row.debit || 0;
        comptes486[compteNum].totalCredit += row.credit || 0;
      } else if (compteNum.startsWith('487')) {
        if (!comptes487[compteNum]) {
          comptes487[compteNum] = {
            compteNum,
            compteLibelle: row.compteLibelle || getAccountLabel(compteNum),
            totalDebit: 0,
            totalCredit: 0
          };
        }
        comptes487[compteNum].totalDebit += row.debit || 0;
        comptes487[compteNum].totalCredit += row.credit || 0;
      }
    });

    // 486 - Charges constatées d'avance → ACTIF
    Object.values(comptes486).forEach(compte => {
      compte.solde = compte.totalDebit - compte.totalCredit;
      if (compte.solde > 0) {
        comptesRegulisation[compte.compteNum] = compte;
        BilanGenerator._addToActif(actif, compte, '486', 'regularisation');
      }
    });

    // 487 - Produits constatés d'avance → PASSIF
    Object.values(comptes487).forEach(compte => {
      compte.solde = compte.totalCredit - compte.totalDebit;
      if (compte.solde > 0) {
        comptesRegulisation[compte.compteNum] = compte;
        BilanGenerator._addToPassif(passif, compte, '487', 'regularisation');
      }
    });

    // 5. TRAITER LES AUTRES COMPTES (position fixe)
    // Exclure tous les comptes déjà traités
    const comptesTraites = new Set();
    
    // Ajouter les comptes à double position
    getComptesDoublePosition().forEach(r => {
      fecBilan.filter(row => {
        const compteNum = row.compteNum || '';
        return compteNum.startsWith(r);
      }).forEach(row => comptesTraites.add(row.compteNum));
    });
    
    // Ajouter les comptes TVA
    fecBilan.filter(row => isTVAAccount(row.compteNum)).forEach(row => 
      comptesTraites.add(row.compteNum)
    );
    
    // Ajouter les comptes de régularisation
    Object.keys(comptesRegulisation).forEach(compteNum => 
      comptesTraites.add(compteNum)
    );

    // Traiter les comptes restants
    fecBilan.filter(row => !comptesTraites.has(row.compteNum)).forEach(row => {
      const compteNum = row.compteNum || '';
      const classe = compteNum.substring(0, 1);
      const sousClasse = compteNum.substring(0, 2);

      // Agrégation par compte
      if (!comptesRegulisation[compteNum]) {
        comptesRegulisation[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || getAccountLabel(compteNum),
          totalDebit: 0,
          totalCredit: 0,
          solde: 0
        };
      }
      
      comptesRegulisation[compteNum].totalDebit += row.debit || 0;
      comptesRegulisation[compteNum].totalCredit += row.credit || 0;
    });

    // Calculer les soldes et classer
    Object.values(comptesRegulisation).forEach(compte => {
      const compteNum = compte.compteNum;
      const sousClasse = compteNum.substring(0, 2);
      
      // Ignorer si déjà traité
      if (comptesTraites.has(compteNum)) return;

      const bilanPosition = getBilanPosition(compteNum);

      if (bilanPosition === 'ACTIF') {
        compte.solde = compte.totalDebit - compte.totalCredit;
        if (compte.solde > 0) {
          BilanGenerator._addToActif(actif, compte, sousClasse);
        }
      } else if (bilanPosition === 'PASSIF') {
        compte.solde = compte.totalCredit - compte.totalDebit;
        if (compte.solde > 0) {
          BilanGenerator._addToPassif(passif, compte, sousClasse);
        }
      }
    });

    // Calculer le résultat net de l'exercice (Produits - Charges)
    let resultatNet = 0;
    parseResult.data.forEach(row => {
      const compteNum = row.compteNum || '';
      const accountType = getAccountType(compteNum);
      
      if (accountType === 'COMPTE_RESULTAT') {
        const resultatPosition = getResultatPosition(compteNum);
        if (resultatPosition === 'CHARGE') {
          // Charges : solde débiteur = charge
          resultatNet -= (row.debit || 0) - (row.credit || 0);
        } else if (resultatPosition === 'PRODUIT') {
          // Produits : solde créditeur = produit
          resultatNet += (row.credit || 0) - (row.debit || 0);
        }
      }
    });

    // Structurer selon la structure officielle du bilan PCG
    const bilanStructure = BilanGenerator._structureBilan(actif, passif, comptesRegulisation, resultatNet);
    
    // Valider le bilan (équilibre ACTIF = PASSIF, non-compensation, etc.)
    const validation = validerBilan(bilanStructure);
    bilanStructure.validation = validation;
    
    return bilanStructure;
  }

  /**
   * Ajoute un compte TVA à l'ACTIF
   * @private
   */
  static _addTVAToActif(actif, montant, detail) {
    if (!actif.creances) {
      actif.creances = {};
    }
    
    const key = '4456_actif';
    if (!actif.creances[key]) {
      actif.creances[key] = {
        classe: '4456',
        libelle: 'TVA déductible',
        comptes: [],
        totalDebit: 0,
        totalCredit: 0,
        solde: 0,
        rubrique: 'B - Créances',
        isDoublePosition: false,
        isTVA: true
      };
    }
    
    // Convertir detail en format compatible
    const comptes = Array.isArray(detail) ? detail.map(d => ({
      compteNum: d.compte || '',
      compteLibelle: d.compteLibelle || d.compte || '',
      debit: d.debit || 0,
      credit: d.credit || 0,
      totalDebit: d.debit || 0,
      totalCredit: d.credit || 0,
      solde: (d.debit || 0) - (d.credit || 0)
    })) : [];
    
    actif.creances[key].comptes = comptes;
    actif.creances[key].totalDebit = comptes.reduce((sum, c) => sum + (c.debit || 0), 0);
    actif.creances[key].totalCredit = comptes.reduce((sum, c) => sum + (c.credit || 0), 0);
    actif.creances[key].solde = montant;
  }

  /**
   * Ajoute un compte TVA au PASSIF
   * @private
   */
  static _addTVAToPassif(passif, montant, compteTVA, detail) {
    if (!passif.dettes) {
      passif.dettes = {};
    }
    
    const key = `${compteTVA}_passif`;
    if (!passif.dettes[key]) {
      passif.dettes[key] = {
        classe: compteTVA,
        libelle: compteTVA === '4455' ? 'TVA à décaisser' : 'TVA collectée',
        comptes: [],
        totalDebit: 0,
        totalCredit: 0,
        solde: 0,
        rubrique: 'Dettes fiscales et sociales',
        isDoublePosition: false,
        isTVA: true
      };
    }
    
    // Convertir detail en format compatible
    const comptes = Array.isArray(detail) ? detail.map(d => ({
      compteNum: d.compte || '',
      compteLibelle: d.compteLibelle || d.compte || '',
      debit: d.debit || 0,
      credit: d.credit || 0,
      totalDebit: d.debit || 0,
      totalCredit: d.credit || 0,
      solde: (d.credit || 0) - (d.debit || 0)
    })) : [];
    
    passif.dettes[key].comptes = comptes;
    passif.dettes[key].totalDebit = comptes.reduce((sum, c) => sum + (c.debit || 0), 0);
    passif.dettes[key].totalCredit = comptes.reduce((sum, c) => sum + (c.credit || 0), 0);
    passif.dettes[key].solde = montant;
  }

  /**
   * Ajoute un compte à l'ACTIF selon sa catégorie
   * @private
   */
  static _addToActif(actif, compte, sousClasse, categorie = null) {
    const classe = compte.compteNum.substring(0, 1);
    
    // Déterminer la catégorie si non spécifiée
    if (!categorie) {
      if (classe === '2') {
        categorie = 'immobilise';
      } else if (classe === '3') {
        categorie = 'stocks';
      } else if (classe === '4') {
        categorie = 'creances';
      } else if (classe === '5') {
        categorie = 'tresorerie';
      } else {
        categorie = 'autres';
      }
    }

    // Initialiser la catégorie si nécessaire
    if (!actif[categorie]) {
      actif[categorie] = {};
    }

    // Initialiser la sous-classe si nécessaire
    if (!actif[categorie][sousClasse]) {
      // Récupérer le libellé depuis le JSON selon la structure officielle
      let libelle = getAccountLabel(sousClasse) || getAccountLabel(compte.compteNum);
      
      // Si le libellé n'est pas trouvé, chercher dans la structure JSON du bilan
      if (!libelle || libelle === `Compte ${sousClasse}`) {
        const bilanData = reglesAffectation.bilan;
        if (bilanData.actif) {
          // Chercher dans les sections actif
          for (const sectionKey of Object.keys(bilanData.actif)) {
            const section = bilanData.actif[sectionKey];
            if (section.comptes && section.comptes[sousClasse]) {
              libelle = section.comptes[sousClasse];
              break;
            }
          }
        }
      }
      
      actif[categorie][sousClasse] = {
        classe: sousClasse,
        libelle: libelle || `Classe ${sousClasse}`,
        comptes: [],
        totalDebit: 0,
        totalCredit: 0,
        solde: 0
      };
    }

    // Ajouter le compte
    actif[categorie][sousClasse].comptes.push(compte);
    actif[categorie][sousClasse].totalDebit += compte.totalDebit;
    actif[categorie][sousClasse].totalCredit += compte.totalCredit;
    actif[categorie][sousClasse].solde += compte.solde;
  }

  /**
   * Ajoute un compte à double position à l'ACTIF
   * Utilise les libellés et rubriques du JSON comptesDoublePosition
   * @param {Object} actif - Structure actif
   * @param {String} racine - Racine du compte (ex: '41')
   * @param {String} libelle - Libellé à afficher
   * @param {Array} detailComptes - Liste des comptes individuels avec leurs soldes
   * @param {Number} total - Total des soldes débiteurs
   * @param {String} rubrique - Rubrique du bilan
   * @private
   */
  static _addDoublePositionToActif(actif, racine, libelle, detailComptes, total, rubrique = 'Créances') {
    // Déterminer la catégorie selon la rubrique du JSON
    let categorie = 'creances'; // Par défaut
    
    if (rubrique.includes('Trésorerie') || racine === '51') {
      categorie = 'tresorerie';
    } else if (rubrique.includes('régularisation') || racine === '48') {
      categorie = 'regularisation';
    }

    // Initialiser la catégorie si nécessaire
    if (!actif[categorie]) {
      actif[categorie] = {};
    }

    // Utiliser la racine comme clé, mais avec le libellé du JSON
    const key = `${racine}_actif`;
    if (!actif[categorie][key]) {
      // Convertir detailComptes en format compatible
      const comptes = Array.isArray(detailComptes) ? detailComptes.map(d => ({
        compteNum: d.compte || d.compteNum,
        compteLibelle: d.compteLibelle || d.compte,
        totalDebit: d.totalDebit || 0,
        totalCredit: d.totalCredit || 0,
        solde: d.solde || (d.totalDebit || 0) - (d.totalCredit || 0)
      })) : [];
      
      actif[categorie][key] = {
        classe: racine,
        libelle: libelle,
        comptes: comptes,
        totalDebit: comptes.reduce((sum, c) => sum + (c.totalDebit || 0), 0),
        totalCredit: comptes.reduce((sum, c) => sum + (c.totalCredit || 0), 0),
        solde: total,
        rubrique: rubrique,
        isDoublePosition: true
      };
    } else {
      // Fusionner si déjà existant
      const comptes = Array.isArray(detailComptes) ? detailComptes.map(d => ({
        compteNum: d.compte || d.compteNum,
        compteLibelle: d.compteLibelle || d.compte,
        totalDebit: d.totalDebit || 0,
        totalCredit: d.totalCredit || 0,
        solde: d.solde || (d.totalDebit || 0) - (d.totalCredit || 0)
      })) : [];
      
      actif[categorie][key].comptes.push(...comptes);
      actif[categorie][key].totalDebit += comptes.reduce((sum, c) => sum + (c.totalDebit || 0), 0);
      actif[categorie][key].totalCredit += comptes.reduce((sum, c) => sum + (c.totalCredit || 0), 0);
      actif[categorie][key].solde += total;
    }
  }

  /**
   * Ajoute un compte à double position au PASSIF
   * Utilise les libellés et rubriques du JSON comptesDoublePosition
   * @param {Object} passif - Structure passif
   * @param {String} racine - Racine du compte (ex: '41')
   * @param {String} libelle - Libellé à afficher
   * @param {Array} detailComptes - Liste des comptes individuels avec leurs soldes
   * @param {Number} total - Total des soldes créditeurs (en valeur absolue)
   * @param {String} rubrique - Rubrique du bilan
   * @private
   */
  static _addDoublePositionToPassif(passif, racine, libelle, detailComptes, total, rubrique = 'Dettes') {
    // Déterminer la catégorie selon la rubrique du JSON
    let categorie = 'dettes'; // Par défaut
    
    if (rubrique.includes('Trésorerie') || rubrique.includes('bancaire') || racine === '51') {
      categorie = 'tresorerie';
    } else if (rubrique.includes('régularisation') || racine === '48') {
      categorie = 'regularisation';
    } else if (rubrique.includes('social') || racine === '42' || racine === '43') {
      categorie = 'dettes'; // Dettes sociales
    } else if (rubrique.includes('fiscal') || racine === '44') {
      categorie = 'dettes'; // Dettes fiscales
    }

    // Initialiser la catégorie si nécessaire
    if (!passif[categorie]) {
      passif[categorie] = {};
    }

    // Utiliser la racine comme clé, mais avec le libellé du JSON
    const key = `${racine}_passif`;
    if (!passif[categorie][key]) {
      // Convertir detailComptes en format compatible
      const comptes = Array.isArray(detailComptes) ? detailComptes.map(d => ({
        compteNum: d.compte || d.compteNum,
        compteLibelle: d.compteLibelle || d.compte,
        totalDebit: d.totalDebit || 0,
        totalCredit: d.totalCredit || 0,
        solde: d.soldeAbsolu || Math.abs(d.solde) || (d.totalCredit || 0) - (d.totalDebit || 0)
      })) : [];
      
      passif[categorie][key] = {
        classe: racine,
        libelle: libelle,
        comptes: comptes,
        totalDebit: comptes.reduce((sum, c) => sum + (c.totalDebit || 0), 0),
        totalCredit: comptes.reduce((sum, c) => sum + (c.totalCredit || 0), 0),
        solde: total,
        rubrique: rubrique,
        isDoublePosition: true
      };
    } else {
      // Fusionner si déjà existant
      const comptes = Array.isArray(detailComptes) ? detailComptes.map(d => ({
        compteNum: d.compte || d.compteNum,
        compteLibelle: d.compteLibelle || d.compte,
        totalDebit: d.totalDebit || 0,
        totalCredit: d.totalCredit || 0,
        solde: d.soldeAbsolu || Math.abs(d.solde) || (d.totalCredit || 0) - (d.totalDebit || 0)
      })) : [];
      
      passif[categorie][key].comptes.push(...comptes);
      passif[categorie][key].totalDebit += comptes.reduce((sum, c) => sum + (c.totalDebit || 0), 0);
      passif[categorie][key].totalCredit += comptes.reduce((sum, c) => sum + (c.totalCredit || 0), 0);
      passif[categorie][key].solde += total;
    }
  }

  /**
   * Ajoute un compte au PASSIF selon sa catégorie
   * @private
   */
  static _addToPassif(passif, compte, sousClasse, categorie = null) {
    const classe = compte.compteNum.substring(0, 1);
    
    // Déterminer la catégorie si non spécifiée
    if (!categorie) {
      if (classe === '1') {
        if (sousClasse === '15') {
          categorie = 'provisions';
        } else if (sousClasse === '16' || sousClasse === '17') {
          // Emprunts et dettes assimilées (16, 17) = dettes
          categorie = 'dettes';
        } else {
          categorie = 'capitauxPropres';
        }
      } else if (classe === '4') {
        categorie = 'dettes';
      } else if (classe === '5') {
        categorie = 'tresorerie';
      } else {
        categorie = 'autres';
      }
    }

    // Initialiser la catégorie si nécessaire
    if (!passif[categorie]) {
      passif[categorie] = {};
    }

    // Initialiser la sous-classe si nécessaire
    if (!passif[categorie][sousClasse]) {
      // Récupérer le libellé depuis le JSON selon la structure officielle
      let libelle = getAccountLabel(sousClasse) || getAccountLabel(compte.compteNum);
      
      // Si le libellé n'est pas trouvé, chercher dans la structure JSON du bilan
      if (!libelle || libelle === `Compte ${sousClasse}`) {
        const bilanData = reglesAffectation.bilan;
        if (bilanData.passif) {
          // Chercher dans les sections passif
          for (const sectionKey of Object.keys(bilanData.passif)) {
            const section = bilanData.passif[sectionKey];
            if (section.comptes && section.comptes[sousClasse]) {
              libelle = section.comptes[sousClasse];
              break;
            }
          }
        }
      }
      
      passif[categorie][sousClasse] = {
        classe: sousClasse,
        libelle: libelle || `Classe ${sousClasse}`,
        comptes: [],
        totalDebit: 0,
        totalCredit: 0,
        solde: 0
      };
    }

    // Ajouter le compte
    passif[categorie][sousClasse].comptes.push(compte);
    passif[categorie][sousClasse].totalDebit += compte.totalDebit;
    passif[categorie][sousClasse].totalCredit += compte.totalCredit;
    passif[categorie][sousClasse].solde += compte.solde;
  }

  /**
   * Structure le bilan selon la structure officielle du PCG
   * @private
   */
  static _structureBilan(actif, passif, comptesRegulisation, resultatNet) {
    // Structurer l'ACTIF
    const actifImmobilise = BilanGenerator._flattenCategories(actif.immobilise || {});
    const stocks = BilanGenerator._flattenCategories(actif.stocks || {});
    const creances = BilanGenerator._flattenCategories(actif.creances || {});
    const tresorerie = BilanGenerator._flattenCategories(actif.tresorerie || {});
    const regularisationActif = BilanGenerator._flattenCategories(actif.regularisation || {});

    // Calculer les sous-totaux ACTIF
    const totalActifImmobilise = BilanGenerator._calculateTotal(actifImmobilise);
    const totalStocks = BilanGenerator._calculateTotal(stocks);
    const totalCreances = BilanGenerator._calculateTotal(creances);
    const totalTresorerie = BilanGenerator._calculateTotal(tresorerie);
    const totalRegularisationActif = BilanGenerator._calculateTotal(regularisationActif);
    const totalActifCirculant = totalStocks + totalCreances + totalTresorerie;
    const totalActif = totalActifImmobilise + totalActifCirculant + totalRegularisationActif;

    // Structurer le PASSIF selon la structure officielle du PCG
    const capitauxPropres = BilanGenerator._flattenCategories(passif.capitauxPropres || {});
    const provisions = BilanGenerator._flattenCategories(passif.provisions || {});
    
    // Séparer les dettes classe 4 des dettes financières (16, 17)
    const toutesDettes = BilanGenerator._flattenCategories(passif.dettes || {});
    const dettes = toutesDettes.filter(item => !item.classe.startsWith('16') && !item.classe.startsWith('17'));
    const dettesFinancieresLT = toutesDettes.filter(item => item.classe.startsWith('16') || item.classe.startsWith('17'));
    
    const tresoreriePassif = BilanGenerator._flattenCategories(passif.tresorerie || {});
    const regularisationPassif = BilanGenerator._flattenCategories(passif.regularisation || {});

    // Ajouter le résultat net aux capitaux propres (compte 12)
    // Utiliser le libellé du JSON
    const libelleResultat = getAccountLabel('12') || 
                           (reglesAffectation.bilan?.passif?.classe1?.comptes?.['12']) ||
                           'Résultat de l\'exercice';
    
    let resultatExiste = capitauxPropres.find(item => item.classe === '12');
    if (!resultatExiste && resultatNet !== 0) {
      capitauxPropres.push({
        classe: '12',
        libelle: libelleResultat,
        comptes: [],
        totalDebit: 0,
        totalCredit: 0,
        solde: resultatNet
      });
      capitauxPropres.sort((a, b) => a.classe.localeCompare(b.classe));
    } else if (resultatExiste) {
      resultatExiste.solde += resultatNet;
    }

    // Calculer les sous-totaux PASSIF selon la structure PCG
    const totalCapitauxPropres = BilanGenerator._calculateTotal(capitauxPropres);
    const totalProvisions = BilanGenerator._calculateTotal(provisions);
    
    // Calculer toutes les dettes (classe 4 + 16/17 + trésorerie passif)
    const totalDettes = BilanGenerator._calculateTotal(dettes);
    const totalDettesFinancieresLT = BilanGenerator._calculateTotal(dettesFinancieresLT);
    const totalTresoreriePassif = BilanGenerator._calculateTotal(tresoreriePassif);
    const totalRegularisationPassif = BilanGenerator._calculateTotal(regularisationPassif);
    const totalPassif = totalCapitauxPropres + totalProvisions + totalDettes + 
                       totalDettesFinancieresLT + totalTresoreriePassif + totalRegularisationPassif;

    return {
      actif: {
        immobilise: actifImmobilise,
        circulant: {
          stocks: stocks,
          creances: creances,
          tresorerie: tresorerie
        },
        regularisation: regularisationActif,
        totalImmobilise: totalActifImmobilise,
        totalStocks: totalStocks,
        totalCreances: totalCreances,
        totalTresorerie: totalTresorerie,
        totalCirculant: totalActifCirculant,
        totalRegularisation: totalRegularisationActif,
        total: totalActif
      },
      passif: {
        capitauxPropres: capitauxPropres,
        provisions: provisions,
        dettes: dettes,
        dettesFinancieres: dettesFinancieresLT,
        tresorerie: tresoreriePassif,
        regularisation: regularisationPassif,
        totalCapitauxPropres: totalCapitauxPropres,
        totalProvisions: totalProvisions,
        totalDettes: totalDettes,
        totalDettesFinancieres: totalDettesFinancieresLT,
        totalTresorerie: totalTresoreriePassif,
        totalRegularisation: totalRegularisationPassif,
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
   * Aplatit les catégories en liste triée
   * @private
   */
  static _flattenCategories(categories) {
    return Object.values(categories).sort((a, b) => 
      a.classe.localeCompare(b.classe)
    );
  }

  /**
   * Calcule le total d'une liste de sous-classes
   * @private
   */
  static _calculateTotal(items) {
    return items.reduce((sum, item) => sum + (item.solde || 0), 0);
  }
}

// Export de la fonction principale pour compatibilité
export const generateBilan = (parseResult) => BilanGenerator.generateBilan(parseResult);

