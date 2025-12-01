import reglesAffectation from '../data/regles-affectation-comptes.json';
import reglesAffectationBilan from '../data/regles-affectation-bilan.json';
import { getAccountLabel, getFixedPosition } from './AccountClassifier';

/**
 * Module de gestion des comptes à double position pour le Bilan
 * 
 * RÈGLE CRITIQUE : Ne JAMAIS compenser les soldes débiteurs et créditeurs
 * d'un même compte racine. Présenter séparément à l'ACTIF et au PASSIF.
 * 
 * @module core/BilanDoublePosition
 */

/**
 * Calcule la position d'un compte à double position
 * Sépare les soldes débiteurs (ACTIF) et créditeurs (PASSIF) SANS compensation
 * 
 * @param {Array} fecData - Données du FEC [{compteNum, debit, credit, ...}, ...]
 * @param {String} compteRacine - Racine du compte (ex: '41', '40', '51')
 * @returns {Object} {actif: Number, passif: Number, detail: Object, libelles: Object}
 */
export function calculerDoublePosition(fecData, compteRacine) {
  if (!fecData || !Array.isArray(fecData) || !compteRacine) {
    return { actif: 0, passif: 0, detail: { debiteurs: [], crediteurs: [] }, libelles: {} };
  }

  // 1. Filtrer les écritures de cette racine
  const ecritures = fecData.filter(row => {
    const compteNum = row.compteNum || '';
    return compteNum.startsWith(compteRacine);
  });

  // 2. Calculer le solde de chaque compte individuel
  // RÈGLE : Chaque compte individuel (ex: 411CLIENTA, 411CLIENTB) doit être traité séparément
  const soldes = {};
  const comptesInfo = {}; // Pour conserver les libellés

  ecritures.forEach(row => {
    const compteNum = row.compteNum || '';
    if (!soldes[compteNum]) {
      soldes[compteNum] = 0;
      comptesInfo[compteNum] = {
        compteNum,
        compteLibelle: row.compteLibelle || compteNum,
        totalDebit: 0,
        totalCredit: 0
      };
    }
    soldes[compteNum] += (row.debit || 0) - (row.credit || 0);
    comptesInfo[compteNum].totalDebit += row.debit || 0;
    comptesInfo[compteNum].totalCredit += row.credit || 0;
  });

  // 3. Séparer débiteurs (ACTIF) et créditeurs (PASSIF) SANS compensation
  let actif = 0;
  let passif = 0;
  const detail = {
    debiteurs: [], // Soldes positifs → ACTIF
    crediteurs: [] // Soldes négatifs → PASSIF (en valeur absolue)
  };

  Object.entries(soldes).forEach(([compteNum, solde]) => {
    const info = comptesInfo[compteNum] || {};
    
    if (solde > 0) {
      // Solde débiteur → ACTIF
      actif += solde;
      detail.debiteurs.push({
        compte: compteNum,
        compteLibelle: info.compteLibelle,
        solde: solde,
        totalDebit: info.totalDebit,
        totalCredit: info.totalCredit
      });
    } else if (solde < 0) {
      // Solde créditeur → PASSIF (valeur absolue)
      const soldeAbsolu = Math.abs(solde);
      passif += soldeAbsolu;
      detail.crediteurs.push({
        compte: compteNum,
        compteLibelle: info.compteLibelle,
        solde: solde, // Conserver le signe négatif dans le détail
        soldeAbsolu: soldeAbsolu,
        totalDebit: info.totalDebit,
        totalCredit: info.totalCredit
      });
    }
    // Si solde = 0, ne rien faire (compte soldé)
  });

  // 4. Récupérer les libellés automatiquement depuis le JSON
  // D'abord, chercher dans regles-affectation-comptes.json (comptesDoublePosition)
  const comptesDoublePosition = reglesAffectation.comptesDoublePosition?.comptes || {};
  const infoCompte = comptesDoublePosition[compteRacine] || {};
  
  // Récupérer le libellé du compte depuis regles-affectation-bilan.json en priorité
  let libelleCompte = null;
  const classe = compteRacine.substring(0, 1);
  if (reglesAffectationBilan && reglesAffectationBilan.libellesComptes) {
    const classeKey = `classe${classe}`;
    const libellesClasse = reglesAffectationBilan.libellesComptes[classeKey];
    if (libellesClasse && libellesClasse[compteRacine]) {
      const compteInfo = libellesClasse[compteRacine];
      libelleCompte = typeof compteInfo === 'string' ? compteInfo : compteInfo.libelle;
    }
  }
  
  // Si pas trouvé dans regles-affectation-bilan.json, utiliser getAccountLabel
  if (!libelleCompte || libelleCompte === `Compte ${compteRacine}`) {
    libelleCompte = getAccountLabel(compteRacine);
  }
  
  // Déterminer la rubrique automatiquement selon la classe du compte
  const determinerRubrique = (compteRacine, position) => {
    const classe = compteRacine.substring(0, 1);
    const sousClasse = compteRacine.substring(0, 2);
    
    if (position === 'actif') {
      if (sousClasse === '18') return 'Comptes de liaison';
      if (classe === '4') {
        if (sousClasse === '41') return 'B - Créances';
        if (sousClasse === '45' || sousClasse === '46') return 'B - Créances';
        return 'B - Créances';
      }
      if (sousClasse === '50') return 'C - Trésorerie';
      if (sousClasse === '51') return 'C - Trésorerie';
      return 'Créances';
    } else {
      if (sousClasse === '18') return 'Comptes de liaison';
      if (classe === '4') {
        if (sousClasse === '40') return 'A - Dettes';
        if (sousClasse === '42' || sousClasse === '43') return 'A - Dettes';
        if (sousClasse === '45' || sousClasse === '46') return 'A - Dettes';
        return 'A - Dettes';
      }
      if (sousClasse === '50') return 'Emprunts et dettes financières';
      if (sousClasse === '51') return 'Emprunts et dettes financières';
      return 'Dettes';
    }
  };
  
  // Générer les libellés automatiquement
  // Priorité : 1) libellé spécifique du JSON comptesDoublePosition, 2) libellé du compte depuis regles-affectation-bilan.json
  let libelleActif = infoCompte.soldeDebiteur?.ligne;
  let libellePassif = infoCompte.soldeCrediteur?.ligne;
  
  // Si pas de libellé spécifique, utiliser le libellé du compte principal
  if (!libelleActif) {
    if (libelleCompte && libelleCompte !== `Compte ${compteRacine}`) {
      // Utiliser le libellé tel quel (ex: "Clients et comptes rattachés")
      libelleActif = libelleCompte;
    } else {
      // Fallback : générer un libellé générique
      libelleActif = `${compteRacine} - Actif`;
    }
  }
  
  if (!libellePassif) {
    if (libelleCompte && libelleCompte !== `Compte ${compteRacine}`) {
      // Utiliser le libellé tel quel (ex: "Clients et comptes rattachés" ou "Fournisseurs et comptes rattachés")
      libellePassif = libelleCompte;
    } else {
      // Fallback : générer un libellé générique
      libellePassif = `${compteRacine} - Passif`;
    }
  }
  
  const libelles = {
    actif: libelleActif,
    passif: libellePassif,
    rubriqueActif: infoCompte.soldeDebiteur?.rubrique || determinerRubrique(compteRacine, 'actif'),
    rubriquePassif: infoCompte.soldeCrediteur?.rubrique || determinerRubrique(compteRacine, 'passif')
  };

  return {
    actif,
    passif,
    detail,
    libelles
  };
}

/**
 * Calcule la double position pour les comptes TVA (4456, 4455, 4457)
 * RÈGLE CRITIQUE : Ne JAMAIS compenser 4456 avec 4455/4457
 * 
 * @param {Array} fecData - Données du FEC
 * @returns {Object} {actif: {4456: Number}, passif: {4455: Number, 4457: Number}, libelles: Object}
 */
export function calculerDoublePositionTVA(fecData) {
  if (!fecData || !Array.isArray(fecData)) {
    return { actif: { 4456: 0 }, passif: { 4455: 0, 4457: 0 }, libelles: {} };
  }

  const result = {
    actif: { 4456: 0 },
    passif: { 4455: 0, 4457: 0 },
    detail: {
      4456: [],
      4455: [],
      4457: []
    },
    libelles: {
      4456: "TVA déductible",
      4455: "TVA à décaisser",
      4457: "TVA collectée"
    }
  };

  // Calculer séparément pour chaque compte TVA
  // Agrégation par compte individuel (ex: 44561, 44562, etc.)
  const comptesTVA = {};
  
  fecData.forEach(row => {
    const compteNum = row.compteNum || '';
    
    if (compteNum.startsWith('4456')) {
      if (!comptesTVA[compteNum]) {
        comptesTVA[compteNum] = {
          compte: compteNum,
          compteLibelle: row.compteLibelle || compteNum,
          debit: 0,
          credit: 0,
          type: '4456'
        };
      }
      comptesTVA[compteNum].debit += row.debit || 0;
      comptesTVA[compteNum].credit += row.credit || 0;
    } else if (compteNum.startsWith('4455')) {
      if (!comptesTVA[compteNum]) {
        comptesTVA[compteNum] = {
          compte: compteNum,
          compteLibelle: row.compteLibelle || compteNum,
          debit: 0,
          credit: 0,
          type: '4455'
        };
      }
      comptesTVA[compteNum].debit += row.debit || 0;
      comptesTVA[compteNum].credit += row.credit || 0;
    } else if (compteNum.startsWith('4457')) {
      if (!comptesTVA[compteNum]) {
        comptesTVA[compteNum] = {
          compte: compteNum,
          compteLibelle: row.compteLibelle || compteNum,
          debit: 0,
          credit: 0,
          type: '4457'
        };
      }
      comptesTVA[compteNum].debit += row.debit || 0;
      comptesTVA[compteNum].credit += row.credit || 0;
    }
  });

  // Calculer les soldes et regrouper par type
  Object.values(comptesTVA).forEach(compte => {
    if (compte.type === '4456') {
      // TVA déductible : solde = débit - crédit (solde débiteur = créance)
      const solde = compte.debit - compte.credit;
      if (solde > 0) {
        result.actif[4456] = (result.actif[4456] || 0) + solde;
        result.detail[4456].push({
          compte: compte.compte,
          compteLibelle: compte.compteLibelle,
          debit: compte.debit,
          credit: compte.credit
        });
      }
    } else if (compte.type === '4455') {
      // TVA à décaisser : solde = crédit - débit (solde créditeur = dette)
      const solde = compte.credit - compte.debit;
      if (solde > 0) {
        result.passif[4455] = (result.passif[4455] || 0) + solde;
        result.detail[4455].push({
          compte: compte.compte,
          compteLibelle: compte.compteLibelle,
          debit: compte.debit,
          credit: compte.credit
        });
      }
    } else if (compte.type === '4457') {
      // TVA collectée : solde = crédit - débit (solde créditeur = dette)
      const solde = compte.credit - compte.debit;
      if (solde > 0) {
        result.passif[4457] = (result.passif[4457] || 0) + solde;
        result.detail[4457].push({
          compte: compte.compte,
          compteLibelle: compte.compteLibelle,
          debit: compte.debit,
          credit: compte.credit
        });
      }
    }
  });

  return result;
}

/**
 * Calcule la double position pour les comptes banques (51)
 * RÈGLE CRITIQUE : Calculer PAR BANQUE, ne pas compenser entre banques
 * 
 * @param {Array} fecData - Données du FEC
 * @returns {Object} {actif: Number, passif: Number, detail: Object, libelles: Object}
 */
export function calculerDoublePositionBanques(fecData) {
  if (!fecData || !Array.isArray(fecData)) {
    return { actif: 0, passif: 0, detail: { banquesActif: [], banquesPassif: [] }, libelles: {} };
  }

  // 1. Filtrer les écritures des comptes 51x, en excluant ceux avec position fixe
  // Les comptes avec position fixe (comme 519 = passif) doivent être traités séparément
  const ecritures = fecData.filter(row => {
    const compteNum = row.compteNum || '';
    if (!compteNum.startsWith('51')) return false;
    
    // Exclure les comptes avec position fixe définie dans le JSON
    const fixedPos = getFixedPosition(compteNum);
    return !fixedPos; // Ne garder que ceux sans position fixe
  });

  // 2. Calculer le solde de chaque compte bancaire individuel
  // RÈGLE : Chaque compte bancaire (512BNP, 512SG, etc.) doit être traité séparément
  const banques = {};
  const banquesInfo = {};

  ecritures.forEach(row => {
    const compteNum = row.compteNum || '';
    if (!banques[compteNum]) {
      banques[compteNum] = 0;
      banquesInfo[compteNum] = {
        compteNum,
        compteLibelle: row.compteLibelle || compteNum,
        totalDebit: 0,
        totalCredit: 0
      };
    }
    banques[compteNum] += (row.debit || 0) - (row.credit || 0);
    banquesInfo[compteNum].totalDebit += row.debit || 0;
    banquesInfo[compteNum].totalCredit += row.credit || 0;
  });

  // 3. Séparer débiteurs (ACTIF) et créditeurs (PASSIF) SANS compensation
  let actif = 0;
  let passif = 0;
  const detail = {
    banquesActif: [], // Soldes positifs → disponibilités
    banquesPassif: [] // Soldes négatifs → découverts (valeur absolue)
  };

  Object.entries(banques).forEach(([compteNum, solde]) => {
    const info = banquesInfo[compteNum] || {};
    
    if (solde > 0) {
      // Solde débiteur → ACTIF (disponibilités)
      actif += solde;
      detail.banquesActif.push({
        compte: compteNum,
        compteLibelle: info.compteLibelle,
        solde: solde,
        totalDebit: info.totalDebit,
        totalCredit: info.totalCredit
      });
    } else if (solde < 0) {
      // Solde créditeur → PASSIF (découvert)
      const soldeAbsolu = Math.abs(solde);
      passif += soldeAbsolu;
      detail.banquesPassif.push({
        compte: compteNum,
        compteLibelle: info.compteLibelle,
        solde: solde, // Conserver le signe négatif
        soldeAbsolu: soldeAbsolu,
        totalDebit: info.totalDebit,
        totalCredit: info.totalCredit
      });
    }
  });

  // 4. Récupérer les libellés depuis le JSON
  const comptesDoublePosition = reglesAffectation.comptesDoublePosition?.comptes || {};
  const infoBanque = comptesDoublePosition['51'] || {};
  
  const libelles = {
    actif: infoBanque.soldeDebiteur?.ligne || 'Banques',
    passif: infoBanque.soldeCrediteur?.ligne || 'Concours bancaires courants',
    rubriqueActif: infoBanque.soldeDebiteur?.rubrique || 'C - Trésorerie',
    rubriquePassif: infoBanque.soldeCrediteur?.rubrique || 'Emprunts et dettes financières'
  };

  return {
    actif,
    passif,
    detail,
    libelles
  };
}

/**
 * Récupère la liste des racines de comptes à double position depuis le JSON
 * @returns {Array} Liste des racines (ex: ['40', '41', '42', ...])
 */
export function getComptesDoublePosition() {
  const comptesDoublePosition = reglesAffectation.comptesDoublePosition?.comptes || {};
  return Object.keys(comptesDoublePosition);
}

/**
 * Valide que le bilan respecte les règles de non-compensation
 * @param {Object} bilan - Structure du bilan généré
 * @returns {Object} {isValid: boolean, errors: Array, warnings: Array}
 */
export function validerBilan(bilan) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!bilan) {
    result.isValid = false;
    result.errors.push('Bilan manquant');
    return result;
  }

  // Test 1 : Total ACTIF = Total PASSIF
  const totalActif = bilan.actif?.total || 0;
  const totalPassif = bilan.passif?.total || 0;
  const ecart = Math.abs(totalActif - totalPassif);

  if (ecart > 0.01) {
    result.isValid = false;
    result.errors.push(
      `❌ ERREUR : ACTIF (${totalActif.toLocaleString('fr-FR')} €) ≠ PASSIF (${totalPassif.toLocaleString('fr-FR')} €). ` +
      `Écart : ${ecart.toLocaleString('fr-FR')} €`
    );
  }

  // Test 2 : Vérifier que TVA déductible et TVA à payer sont séparées
  const tvaActif = bilan.actif?.creances && 
    Object.values(bilan.actif.creances).some(item => 
      (item.classe === '4456' || item.compteNum?.startsWith('4456') || item.isTVA) && 
      item.solde > 0
    );
  
  const tvaPassif = bilan.passif?.dettes && 
    Object.values(bilan.passif.dettes).some(item => 
      ((item.classe === '4455' || item.classe === '4457') || 
       item.compteNum?.startsWith('4455') || item.compteNum?.startsWith('4457') || 
       item.isTVA) && 
      item.solde > 0
    );

  if (tvaActif && tvaPassif) {
    result.warnings.push('✅ TVA correctement séparée (4456 à l\'ACTIF, 4455/4457 au PASSIF)');
  }

  // Test 3 : Comptes à double position
  const comptesDoubles = getComptesDoublePosition();
  comptesDoubles.forEach(racine => {
    // Vérifier si le compte apparaît à la fois à l'ACTIF et au PASSIF
    // Chercher dans toutes les catégories d'actif
    let lignesActif = [];
    if (bilan.actif) {
      Object.values(bilan.actif).forEach(categorie => {
        if (categorie && typeof categorie === 'object') {
          Object.values(categorie).forEach(item => {
            if (item && typeof item === 'object' && item.classe) {
              if (item.classe === racine || item.classe?.startsWith(racine + '_actif') || item.isDoublePosition) {
                lignesActif.push(item);
              }
            }
          });
        }
      });
    }
    
    // Chercher dans toutes les catégories de passif
    let lignesPassif = [];
    if (bilan.passif) {
      Object.values(bilan.passif).forEach(categorie => {
        if (categorie && typeof categorie === 'object') {
          Object.values(categorie).forEach(item => {
            if (item && typeof item === 'object' && item.classe) {
              if (item.classe === racine || item.classe?.startsWith(racine + '_passif') || item.isDoublePosition) {
                lignesPassif.push(item);
              }
            }
          });
        }
      });
    }

    if (lignesActif.length > 0 && lignesPassif.length > 0) {
      const totalActif = lignesActif.reduce((s, i) => s + (i.solde || 0), 0);
      const totalPassif = lignesPassif.reduce((s, i) => s + (i.solde || 0), 0);
      result.warnings.push(
        `✅ Compte ${racine} bien présenté en double position ` +
        `(ACTIF: ${totalActif.toLocaleString('fr-FR')} €, ` +
        `PASSIF: ${totalPassif.toLocaleString('fr-FR')} €)`
      );
    } else if (lignesActif.length === 0 && lignesPassif.length === 0) {
      // Avertissement si le compte devrait apparaître mais n'apparaît pas
      result.warnings.push(`⚠️ Compte ${racine} (double position) n'apparaît ni à l'ACTIF ni au PASSIF`);
    }
  });

  return result;
}

