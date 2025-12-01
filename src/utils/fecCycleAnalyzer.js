import cyclesDefinition from '../data/cycles-definition.json';
import comptePriorities from '../data/compte-priorities.json';

export function findCycleForCompte(compteNum, journalCode = '') {
  if (!compteNum) return 'OPERATIONS_DIVERSES';

  const compte = String(compteNum).trim();

  for (const prefix of Object.keys(comptePriorities).sort((a, b) => b.length - a.length)) {
    if (compte.startsWith(prefix)) {
      return comptePriorities[prefix];
    }
  }

  for (const [cycleCode, cycleInfo] of Object.entries(cyclesDefinition)) {
    for (const prefix of cycleInfo.comptesPrincipaux.sort((a, b) => b.length - a.length)) {
      if (compte.startsWith(prefix)) {
        return cycleCode;
      }
    }
  }

  if (journalCode) {
    const journal = String(journalCode).toUpperCase().trim();
    for (const [cycleCode, cycleInfo] of Object.entries(cyclesDefinition)) {
      if (cycleInfo.journaux.some(j => String(j).toUpperCase() === journal)) {
        return cycleCode;
      }
    }
  }

  return 'OPERATIONS_DIVERSES';
}

export function analyzeFec(data) {
  const dataWithCycles = data.map(row => {
    const cycle = findCycleForCompte(row.compteNum, row.journalCode);
    const info = cyclesDefinition[cycle];
    return {
      ...row,
      cycle,
      cycleNom: info?.nom || 'Inconnu',
      cycleColor: info?.color || '#CCCCCC'
    };
  });

  const statsParCycle = {};

  // CORRECTION : Calculer le nombre total réel d'écritures (somme des counts)
  // On utilise (row.count || 1) pour gérer le cas où les données ne seraient pas agrégées
  const totalEcrituresReelles = data.reduce((acc, row) => acc + (row.count || 1), 0);

  for (const [cycleCode, cycleInfo] of Object.entries(cyclesDefinition)) {
    const dataCycle = dataWithCycles.filter(row => row.cycle === cycleCode);

    // CORRECTION : Sommer les 'count' au lieu de compter simplement les lignes
    const nbEcritures = dataCycle.reduce((sum, row) => sum + (row.count || 1), 0);
    
    const totalDebit = dataCycle.reduce((sum, row) => sum + (row.debit || 0), 0);
    const totalCredit = dataCycle.reduce((sum, row) => sum + (row.credit || 0), 0);

    const comptesUniques = new Set(dataCycle.map(row => row.compteNum)).size;
    const journauxUniques = new Set(dataCycle.map(row => row.journalCode)).size;

    statsParCycle[cycleCode] = {
      nom: cycleInfo.nom,
      description: cycleInfo.description,
      color: cycleInfo.color,
      nbEcritures,
      // CORRECTION : Utiliser le total réel pour le pourcentage
      pourcentageEcritures: totalEcrituresReelles > 0 ? (nbEcritures / totalEcrituresReelles * 100) : 0,
      totalDebit,
      totalCredit,
      solde: totalDebit - totalCredit,
      comptesUniques,
      journauxUniques
    };
  }

  return {
    dataWithCycles,
    statsParCycle
  };
}