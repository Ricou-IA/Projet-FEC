import { getAccountType, getBilanPosition, getResultatPosition } from '../core/AccountClassifier';

/**
 * Hook pour obtenir les détails des comptes par cycle, classe de résultat ou classe de bilan
 */
export const useAccountDetails = (parseResult1, parseResult2) => {
  
  /**
   * Grouper les écritures par numéro de compte et sommer les débits/crédits pour un cycle
   */
  const getCycleDetailsByAccount = (cycleCode, cyclesResult1, cyclesResult2) => {
    if (!cyclesResult1) return { bilan: [], resultat: [] };
    
    const cycleData = cyclesResult1.dataWithCycles.filter(row => row.cycle === cycleCode);
    
    // Grouper par numéro de compte pour l'exercice N
    const groupedByAccount = {};
    
    cycleData.forEach(row => {
      const compteNum = row.compteNum || '';
      const compteLibelle = row.compteLibelle || '';
      
      if (!groupedByAccount[compteNum]) {
        groupedByAccount[compteNum] = {
          compteNum,
          compteLibelle,
          totalDebit: 0,
          totalCredit: 0,
          solde: 0,
          soldeN1: 0
        };
      }
      
      groupedByAccount[compteNum].totalDebit += row.debit || 0;
      groupedByAccount[compteNum].totalCredit += row.credit || 0;
    });
    
    // Calculer le solde N pour chaque compte
    Object.values(groupedByAccount).forEach(account => {
      account.solde = account.totalDebit - account.totalCredit;
    });

    // Traiter l'exercice N-1 si disponible
    if (cyclesResult2 && cyclesResult2.dataWithCycles) {
      const cycleDataN1 = cyclesResult2.dataWithCycles.filter(row => row.cycle === cycleCode);
      
      cycleDataN1.forEach(row => {
        const compteNum = row.compteNum || '';
        
        if (!groupedByAccount[compteNum]) {
          groupedByAccount[compteNum] = {
            compteNum,
            compteLibelle: row.compteLibelle || '',
            totalDebit: 0,
            totalCredit: 0,
            solde: 0,
            totalDebitN1: 0,
            totalCreditN1: 0,
            soldeN1: 0
          };
        }
        
        if (!groupedByAccount[compteNum].totalDebitN1) {
          groupedByAccount[compteNum].totalDebitN1 = 0;
          groupedByAccount[compteNum].totalCreditN1 = 0;
        }
        
        groupedByAccount[compteNum].totalDebitN1 += row.debit || 0;
        groupedByAccount[compteNum].totalCreditN1 += row.credit || 0;
      });
      
      // Calculer le solde N-1 pour chaque compte
      Object.values(groupedByAccount).forEach(account => {
        if (account.totalDebitN1 !== undefined && account.totalCreditN1 !== undefined) {
          account.soldeN1 = account.totalDebitN1 - account.totalCreditN1;
        }
      });
    }
    
    // Séparer les comptes de bilan (classes 1-5) et de résultat (classes 6-7)
    const bilan = [];
    const resultat = [];
    
    Object.values(groupedByAccount).forEach(account => {
      const compteNum = account.compteNum.trim();
      const accountType = getAccountType(compteNum);
      
      if (accountType === 'BILAN') {
        bilan.push(account);
      } else if (accountType === 'COMPTE_RESULTAT') {
        resultat.push(account);
      } else {
        console.warn(`Compte ${compteNum} non classé, mis dans bilan par défaut`);
        bilan.push(account);
      }
    });
    
    // Trier par numéro de compte croissant
    const sortByAccountNumber = (a, b) => {
      return a.compteNum.localeCompare(b.compteNum, undefined, { numeric: true, sensitivity: 'base' });
    };
    
    bilan.sort(sortByAccountNumber);
    resultat.sort(sortByAccountNumber);
    
    return { bilan, resultat };
  };

  /**
   * Récupérer les comptes détaillés d'une classe pour le Compte de Résultat
   */
  const getCompteResultatDetails = (type, classe) => {
    if (!parseResult1 || !parseResult1.data) return [];

    const filtered = parseResult1.data.filter(row => {
      const compteNum = row.compteNum || '';
      const deuxPremiers = compteNum.substring(0, 2);
      
      const accountType = getAccountType(compteNum);
      const resultatPosition = getResultatPosition(compteNum);
      
      if (accountType === 'RESULTAT' && 
          ((type === 'charge' && resultatPosition === 'CHARGE') || 
           (type === 'produit' && resultatPosition === 'PRODUIT'))) {
        return deuxPremiers === classe;
      }
      return false;
    });
    
    // Filtrer aussi pour N-1 si disponible
    const filteredN1 = parseResult2 && parseResult2.data ? parseResult2.data.filter(row => {
      const compteNum = row.compteNum || '';
      const deuxPremiers = compteNum.substring(0, 2);
      
      const accountType = getAccountType(compteNum);
      const resultatPosition = getResultatPosition(compteNum);
      
      if (accountType === 'RESULTAT' && 
          ((type === 'charge' && resultatPosition === 'CHARGE') || 
           (type === 'produit' && resultatPosition === 'PRODUIT'))) {
        return deuxPremiers === classe;
      }
      return false;
    }) : [];

    // Grouper par compte pour N
    const grouped = {};
    filtered.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!grouped[compteNum]) {
        grouped[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || '',
          totalDebit: 0,
          totalCredit: 0,
          solde: 0,
          totalDebitN1: 0,
          totalCreditN1: 0,
          soldeN1: 0
        };
      }
      grouped[compteNum].totalDebit += row.debit || 0;
      grouped[compteNum].totalCredit += row.credit || 0;
    });

    // Grouper par compte pour N-1
    const groupedN1 = {};
    filteredN1.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!groupedN1[compteNum]) {
        groupedN1[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || '',
          totalDebit: 0,
          totalCredit: 0,
          solde: 0
        };
      }
      groupedN1[compteNum].totalDebit += row.debit || 0;
      groupedN1[compteNum].totalCredit += row.credit || 0;
    });

    // Calculer les soldes pour N
    Object.values(grouped).forEach(account => {
      if (type === 'charge') {
        account.solde = account.totalDebit - account.totalCredit;
      } else {
        account.solde = account.totalCredit - account.totalDebit;
      }
      
      // Ajouter les données N-1 si disponibles
      const accountN1 = groupedN1[account.compteNum];
      if (accountN1) {
        account.totalDebitN1 = accountN1.totalDebit;
        account.totalCreditN1 = accountN1.totalCredit;
        if (type === 'charge') {
          account.soldeN1 = accountN1.totalDebit - accountN1.totalCredit;
        } else {
          account.soldeN1 = accountN1.totalCredit - accountN1.totalDebit;
        }
      }
    });

    // Trier par numéro de compte
    return Object.values(grouped).sort((a, b) => 
      a.compteNum.localeCompare(b.compteNum, undefined, { numeric: true, sensitivity: 'base' })
    );
  };

  /**
   * Récupérer les comptes détaillés d'une classe pour le Bilan
   */
  const getBilanDetails = (type, classe) => {
    if (!parseResult1 || !parseResult1.data) return [];

    const filtered = parseResult1.data.filter(row => {
      const compteNum = row.compteNum || '';
      const deuxPremiers = compteNum.substring(0, 2);
      
      const accountType = getAccountType(compteNum);
      const bilanPosition = getBilanPosition(compteNum);

      if (accountType === 'BILAN' && 
          ((type === 'actif' && bilanPosition === 'ACTIF') || 
           (type === 'passif' && bilanPosition === 'PASSIF'))) {
        return deuxPremiers === classe;
      }
      return false;
    });

    // Grouper par compte
    const grouped = {};
    filtered.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!grouped[compteNum]) {
        grouped[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || '',
          totalDebit: 0,
          totalCredit: 0,
          solde: 0
        };
      }
      grouped[compteNum].totalDebit += row.debit || 0;
      grouped[compteNum].totalCredit += row.credit || 0;
    });

    // Calculer les soldes
    Object.values(grouped).forEach(account => {
      if (type === 'actif') {
        account.solde = account.totalDebit - account.totalCredit;
      } else {
        account.solde = account.totalCredit - account.totalDebit;
      }
    });

    // Trier par numéro de compte
    return Object.values(grouped).sort((a, b) => 
      a.compteNum.localeCompare(b.compteNum, undefined, { numeric: true, sensitivity: 'base' })
    );
  };

  return {
    getCycleDetailsByAccount,
    getCompteResultatDetails,
    getBilanDetails
  };
};


