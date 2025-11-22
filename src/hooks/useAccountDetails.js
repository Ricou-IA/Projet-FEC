import { getAccountType, getBilanPosition, getResultatPosition, isDoublePositionAccount, getFixedPosition } from '../core/AccountClassifier';

/**
 * Hook pour obtenir les détails des comptes par cycle, classe de résultat ou classe de bilan
 */
export const useAccountDetails = (parseResult1, parseResult2) => {
  
  /**
   * Grouper les écritures par numéro de compte et sommer les débits/crédits pour un cycle
   * Identifie les comptes collectifs via CompteAuxNum et organise leurs auxiliaires
   */
  const getCycleDetailsByAccount = (cycleCode, cyclesResult1, cyclesResult2) => {
    if (!cyclesResult1) return { bilan: [], resultat: [] };
    
    const cycleData = cyclesResult1.dataWithCycles.filter(row => row.cycle === cycleCode);
    
    // Grouper par numéro de compte pour l'exercice N
    const groupedByAccount = {};
    // Identifier les comptes collectifs (ceux qui ont des écritures avec CompteAuxNum)
    const collectives = new Set();
    // Structure pour les auxiliaires : { collectif: { auxNum: { ... } } }
    const auxiliariesByCollective = {};
    
    cycleData.forEach(row => {
      const compteNum = row.compteNum || '';
      const compteLibelle = row.compteLibelle || '';
      const compteAuxNum = (row.compteAuxNum || '').trim();
      
      // Si le compte a un CompteAuxNum, alors compteNum est un collectif
      if (compteAuxNum) {
        collectives.add(compteNum);
        
        // Initialiser la structure pour ce collectif
        if (!auxiliariesByCollective[compteNum]) {
          auxiliariesByCollective[compteNum] = {};
        }
        
        // Initialiser l'auxiliaire
        if (!auxiliariesByCollective[compteNum][compteAuxNum]) {
          auxiliariesByCollective[compteNum][compteAuxNum] = {
            compteNum: compteNum,
            compteAuxNum: compteAuxNum,
            compteLibelle: compteLibelle,
            compteAuxLibelle: (row.compteAuxLibelle || '').trim() || compteAuxNum,
            totalDebit: 0,
            totalCredit: 0,
            solde: 0,
            soldeN1: 0
          };
        }
        
        // Ajouter les montants à l'auxiliaire
        auxiliariesByCollective[compteNum][compteAuxNum].totalDebit += row.debit || 0;
        auxiliariesByCollective[compteNum][compteAuxNum].totalCredit += row.credit || 0;
      } else {
        // Compte normal (pas d'auxiliaire)
        if (!groupedByAccount[compteNum]) {
          groupedByAccount[compteNum] = {
            compteNum,
            compteLibelle,
            totalDebit: 0,
            totalCredit: 0,
            solde: 0,
            soldeN1: 0,
            isCollective: false
          };
        }
        
        groupedByAccount[compteNum].totalDebit += row.debit || 0;
        groupedByAccount[compteNum].totalCredit += row.credit || 0;
      }
    });
    
    // Calculer les soldes pour les comptes normaux
    Object.values(groupedByAccount).forEach(account => {
      account.solde = account.totalDebit - account.totalCredit;
    });
    
    // Calculer les soldes pour les auxiliaires et les collectifs
    Object.entries(auxiliariesByCollective).forEach(([collectifNum, auxiliaries]) => {
      // Calculer les soldes des auxiliaires et les initialiser pour N-1
      Object.values(auxiliaries).forEach(aux => {
        aux.solde = aux.totalDebit - aux.totalCredit;
        aux.soldeN1 = 0; // Sera rempli plus tard si N-1 est disponible
        aux.totalDebitN1 = 0;
        aux.totalCreditN1 = 0;
      });
      
      // Filtrer les auxiliaires avec soldes nuls (temporairement, on les filtrera après avoir calculé N-1)
      
      // Le solde du collectif = somme des soldes des auxiliaires + éventuelles écritures sans auxiliaire
      // Compter toutes les écritures sans auxiliaire pour ce collectif
      let collectifTotalDebit = 0;
      let collectifTotalCredit = 0;
      const collectifRowsWithoutAux = cycleData.filter(r => r.compteNum === collectifNum && !(r.compteAuxNum || '').trim());
      collectifRowsWithoutAux.forEach(row => {
        collectifTotalDebit += row.debit || 0;
        collectifTotalCredit += row.credit || 0;
      });
      
      // Ajouter les soldes des auxiliaires
      Object.values(auxiliaries).forEach(aux => {
        collectifTotalDebit += aux.totalDebit;
        collectifTotalCredit += aux.totalCredit;
      });
      
      const collectifSolde = collectifTotalDebit - collectifTotalCredit;
      
      // Créer ou mettre à jour le compte collectif
      if (!groupedByAccount[collectifNum]) {
        // Récupérer le libellé depuis les données du cycle
        const collectifRow = cycleData.find(r => r.compteNum === collectifNum && !(r.compteAuxNum || '').trim());
        groupedByAccount[collectifNum] = {
          compteNum: collectifNum,
          compteLibelle: collectifRow?.compteLibelle || cycleData.find(r => r.compteNum === collectifNum)?.compteLibelle || collectifNum,
          totalDebit: collectifTotalDebit,
          totalCredit: collectifTotalCredit,
          solde: collectifSolde,
          soldeN1: 0,
          isCollective: true,
          auxiliaries: Object.values(auxiliaries)
        };
      } else {
        groupedByAccount[collectifNum].isCollective = true;
        groupedByAccount[collectifNum].totalDebit = collectifTotalDebit;
        groupedByAccount[collectifNum].totalCredit = collectifTotalCredit;
        groupedByAccount[collectifNum].solde = collectifSolde;
        groupedByAccount[collectifNum].auxiliaries = Object.values(auxiliaries);
      }
    });

    // Traiter l'exercice N-1 si disponible
    if (cyclesResult2 && cyclesResult2.dataWithCycles) {
      const cycleDataN1 = cyclesResult2.dataWithCycles.filter(row => row.cycle === cycleCode);
      const auxiliariesByCollectiveN1 = {};
      const collectivesN1 = new Set(); // Identifier les collectifs pour N-1
      
      cycleDataN1.forEach(row => {
        const compteNum = row.compteNum || '';
        const compteAuxNum = (row.compteAuxNum || '').trim();
        
        if (compteAuxNum) {
          // C'est un auxiliaire, donc le compte principal est un collectif
          collectivesN1.add(compteNum);
          
          // C'est un auxiliaire
          if (!auxiliariesByCollectiveN1[compteNum]) {
            auxiliariesByCollectiveN1[compteNum] = {};
          }
          
          if (!auxiliariesByCollectiveN1[compteNum][compteAuxNum]) {
            auxiliariesByCollectiveN1[compteNum][compteAuxNum] = {
              totalDebitN1: 0,
              totalCreditN1: 0,
              soldeN1: 0
            };
          }
          
          auxiliariesByCollectiveN1[compteNum][compteAuxNum].totalDebitN1 += row.debit || 0;
          auxiliariesByCollectiveN1[compteNum][compteAuxNum].totalCreditN1 += row.credit || 0;
        } else {
          // Compte normal (pas d'auxiliaire)
          // Attention : ne pas compter si c'est un collectif qui a des auxiliaires (déjà compté dans les auxiliaires)
          const isCollectiveWithAux = collectivesN1.has(compteNum);
          if (!isCollectiveWithAux) {
            // Ce n'est pas un collectif, compter normalement
            if (!groupedByAccount[compteNum]) {
              groupedByAccount[compteNum] = {
                compteNum,
                compteLibelle: row.compteLibelle || '',
                totalDebit: 0,
                totalCredit: 0,
                solde: 0,
                totalDebitN1: 0,
                totalCreditN1: 0,
                soldeN1: 0,
                isCollective: false
              };
            }
            
            if (!groupedByAccount[compteNum].totalDebitN1) {
              groupedByAccount[compteNum].totalDebitN1 = 0;
              groupedByAccount[compteNum].totalCreditN1 = 0;
            }
            
            groupedByAccount[compteNum].totalDebitN1 += row.debit || 0;
            groupedByAccount[compteNum].totalCreditN1 += row.credit || 0;
          } else {
            // C'est un collectif, compter uniquement les écritures sans auxiliaire
            if (groupedByAccount[compteNum]) {
              if (!groupedByAccount[compteNum].totalDebitN1) {
                groupedByAccount[compteNum].totalDebitN1 = 0;
                groupedByAccount[compteNum].totalCreditN1 = 0;
              }
              groupedByAccount[compteNum].totalDebitN1 += row.debit || 0;
              groupedByAccount[compteNum].totalCreditN1 += row.credit || 0;
            }
          }
        }
      });
      
      // Calculer les soldes N-1 pour les auxiliaires et mettre à jour les collectifs
      Object.entries(auxiliariesByCollectiveN1).forEach(([collectifNum, auxiliaries]) => {
        // Calculer les soldes N-1 des auxiliaires
        Object.entries(auxiliaries).forEach(([auxNum, auxData]) => {
          auxData.soldeN1 = auxData.totalDebitN1 - auxData.totalCreditN1;
          
          // Mettre à jour l'auxiliaire dans groupedByAccount si le collectif existe
          if (groupedByAccount[collectifNum] && groupedByAccount[collectifNum].auxiliaries) {
            const aux = groupedByAccount[collectifNum].auxiliaries.find(a => a.compteAuxNum === auxNum);
            if (aux) {
              aux.totalDebitN1 = auxData.totalDebitN1;
              aux.totalCreditN1 = auxData.totalCreditN1;
              aux.soldeN1 = auxData.soldeN1;
            }
          }
        });
        
        // Mettre à jour le solde N-1 du collectif
        if (groupedByAccount[collectifNum]) {
          // Initialiser totalDebitN1 et totalCreditN1 s'ils n'existent pas
          if (!groupedByAccount[collectifNum].totalDebitN1) {
            groupedByAccount[collectifNum].totalDebitN1 = 0;
          }
          if (!groupedByAccount[collectifNum].totalCreditN1) {
            groupedByAccount[collectifNum].totalCreditN1 = 0;
          }
          
          // Compter toutes les écritures sans auxiliaire pour ce collectif en N-1
          const collectifRowsWithoutAuxN1 = cycleDataN1.filter(r => r.compteNum === collectifNum && !(r.compteAuxNum || '').trim());
          collectifRowsWithoutAuxN1.forEach(row => {
            groupedByAccount[collectifNum].totalDebitN1 += row.debit || 0;
            groupedByAccount[collectifNum].totalCreditN1 += row.credit || 0;
          });
          
          // Ajouter les soldes des auxiliaires
          Object.values(auxiliaries).forEach(auxData => {
            groupedByAccount[collectifNum].totalDebitN1 += auxData.totalDebitN1;
            groupedByAccount[collectifNum].totalCreditN1 += auxData.totalCreditN1;
          });
          
          groupedByAccount[collectifNum].soldeN1 = groupedByAccount[collectifNum].totalDebitN1 - groupedByAccount[collectifNum].totalCreditN1;
        }
      });
      
      // Filtrer les auxiliaires avec soldes nuls sur N et N-1
      // Le tri sera fait dans le composant selon le choix de l'utilisateur (N ou N-1)
      Object.values(groupedByAccount).forEach(account => {
        if (account.isCollective && account.auxiliaries && account.auxiliaries.length > 0) {
          // Filtrer les auxiliaires avec soldes nuls sur N et N-1
          account.auxiliaries = account.auxiliaries.filter(aux => {
            const soldeN = aux.solde || 0;
            const soldeN1 = aux.soldeN1 || 0;
            // Garder seulement ceux qui ont un solde non nul sur N ou N-1
            return Math.abs(soldeN) > 0.01 || Math.abs(soldeN1) > 0.01;
          });
        }
      });
      
      // Calculer le solde N-1 pour les comptes normaux
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
      
      if (accountType === 'COMPTE_RESULTAT' && 
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
      
      if (accountType === 'COMPTE_RESULTAT' && 
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

    // Déterminer si la classe est à double position
    // Utiliser la même logique que BilanGenerator
    // La classe est déjà à 2 positions (ex: "51", "41", etc.)
    const comptesExclusDoublePosition = ['519', '419'];
    const estExclu = comptesExclusDoublePosition.some(prefix => classe.startsWith(prefix));
    
    const isDoublePosition = !estExclu && (
      isDoublePositionAccount(classe) || 
      (classe.substring(0, 1) === '4' && ['40', '41', '42', '43', '44', '45', '46', '47', '48'].includes(classe) && !classe.startsWith('419')) ||
      (classe === '18') ||
      ((classe === '50' || classe === '51') && !classe.startsWith('519'))
    );

    // Filtrer les comptes de cette classe
    const filtered = parseResult1.data.filter(row => {
      const compteNum = row.compteNum || '';
      const deuxPremiers = compteNum.substring(0, 2);
      
      const accountType = getAccountType(compteNum);
      
      // Ne garder que les comptes de bilan de la classe demandée
      if (accountType === 'BILAN' && deuxPremiers === classe) {
        return true;
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

    // Calculer les soldes selon la même logique que BilanGenerator
    // RÈGLE : solde = débit - crédit (calculé au niveau du compte complet du FEC)
    Object.values(grouped).forEach(account => {
      account.solde = account.totalDebit - account.totalCredit;
    });

    // Filtrer selon le type (actif ou passif) avec la même logique que BilanGenerator
    const filteredAccounts = Object.values(grouped).filter(account => {
      // Ignorer les comptes soldés (solde proche de 0) - même logique que BilanGenerator
      if (Math.abs(account.solde) < 0.01) return false;

      const compteNum = account.compteNum;
      const racineCompte = compteNum.substring(0, 3);

      // RÈGLE SPÉCIALE : Comptes 401 (Fournisseurs) et 411 (Clients)
      // → Gestion PAR COMPTE AUXILIAIRE sans compensation (comme dans BilanGenerator)
      // Chaque compte auxiliaire est affecté selon son propre solde
      if (racineCompte === '401' || racineCompte === '411') {
        if (type === 'actif') {
          // Pour l'actif : solde débiteur (positif)
          // 401 débiteur → ACTIF (avances/acomptes versés aux fournisseurs)
          // 411 débiteur → ACTIF (créances clients)
          return account.solde > 0;
        } else {
          // Pour le passif : solde créditeur (négatif)
          // 401 créditeur → PASSIF (dettes fournisseurs)
          // 411 créditeur → PASSIF (avances/acomptes reçus des clients)
          return account.solde < 0;
        }
      }

      // RÈGLE SPÉCIALE : Comptes TVA (4455, 4456, 4457) sont des comptes à double position
      // Affectation selon le solde : solde > 0 → ACTIF, solde < 0 → PASSIF
      const estCompteTVA = compteNum.startsWith('4456') || 
                           compteNum.startsWith('4455') || 
                           compteNum.startsWith('4457');
      
      if (estCompteTVA) {
        // Traitement comme comptes à double position
        if (type === 'actif') {
          return account.solde > 0; // Solde débiteur → ACTIF
        } else {
          return account.solde < 0; // Solde créditeur → PASSIF
        }
      }

      // Vérifier si c'est un compte avec position fixe (comme 519, 419)
      // Utiliser la même logique que BilanGenerator._affecterComptes
      const fixedPos = getFixedPosition(compteNum);
      
      if (fixedPos) {
        // Position fixe : utiliser la position définie
        if (type === 'actif') {
          return fixedPos.position === 'ACTIF' && account.solde > 0;
        } else {
          const soldePassif = account.totalCredit - account.totalDebit;
          return fixedPos.position === 'PASSIF' && soldePassif > 0;
        }
      } else {
        // Compte à double position ou position normale : affectation selon le solde
        // Même logique que BilanGenerator : solde > 0 → ACTIF, solde < 0 → PASSIF
        if (type === 'actif') {
          return account.solde > 0; // Solde débiteur → ACTIF
        } else {
          return account.solde < 0; // Solde créditeur → PASSIF
        }
      }
    });

    // Ajuster les soldes pour l'affichage (même logique que BilanGenerator)
    // Et ajouter la propriété 'type' pour cohérence avec BilanGenerator
    filteredAccounts.forEach(account => {
      if (type === 'passif') {
        // Pour le passif, convertir en valeur absolue (comme dans BilanGenerator)
        // Les comptes au passif ont un solde négatif, on l'affiche en positif
        account.solde = Math.abs(account.solde);
      }
      // Pour l'actif, le solde est déjà correct (débit - crédit, positif)
      
      // Ajouter la propriété 'type' pour cohérence avec la structure de BilanGenerator
      account.type = type;
      // Ajouter 'montant' pour cohérence (montant = solde après ajustement)
      account.montant = account.solde;
    });

    // Trier par numéro de compte
    return filteredAccounts.sort((a, b) => 
      a.compteNum.localeCompare(b.compteNum, undefined, { numeric: true, sensitivity: 'base' })
    );
  };

  return {
    getCycleDetailsByAccount,
    getCompteResultatDetails,
    getBilanDetails
  };
};


