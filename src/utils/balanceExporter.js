// XLSX est chargé depuis le CDN (voir index.html)
const XLSX = window.XLSX;

export function exportBalanceComptable(parseResult1, parseResult2) {
  if (!parseResult1 || !parseResult1.data) {
    alert('Aucune donnée disponible pour l\'export');
    return;
  }

  const balanceData = {};

  // Exercice N
  parseResult1.data.forEach(row => {
    const compteNum = row.compteNum || '';
    const compteLibelle = row.compteLibelle || '';
    if (!balanceData[compteNum]) {
      balanceData[compteNum] = {
        compte: compteNum,
        libelle: compteLibelle,
        totalDebitN: 0,
        totalCreditN: 0,
        totalDebitN1: 0,
        totalCreditN1: 0,
        soldeN1: 0,
        soldeN: 0
      };
    }
    balanceData[compteNum].totalDebitN += (row.debit || 0);
    balanceData[compteNum].totalCreditN += (row.credit || 0);
  });

  // Exercice N-1
  if (parseResult2 && parseResult2.data) {
    parseResult2.data.forEach(row => {
      const compteNum = row.compteNum || '';
      const compteLibelle = row.compteLibelle || '';
      if (!balanceData[compteNum]) {
        balanceData[compteNum] = {
          compte: compteNum,
          libelle: compteLibelle,
          totalDebitN: 0,
          totalCreditN: 0,
          totalDebitN1: 0,
          totalCreditN1: 0,
          soldeN1: 0,
          soldeN: 0
        };
      } else {
        if (balanceData[compteNum].totalDebitN1 === undefined) balanceData[compteNum].totalDebitN1 = 0;
        if (balanceData[compteNum].totalCreditN1 === undefined) balanceData[compteNum].totalCreditN1 = 0;
      }
      balanceData[compteNum].totalDebitN1 += (row.debit || 0);
      balanceData[compteNum].totalCreditN1 += (row.credit || 0);
    });
  }

  const lines = Object.values(balanceData).map(item => ({
    'Compte': item.compte,
    'Libellé': item.libelle,
    'Débit N-1': Number(item.totalDebitN1.toFixed(2)),
    'Crédit N-1': Number(item.totalCreditN1.toFixed(2)),
    'Solde N-1 (Déb - Créd)': Number((item.totalDebitN1 - item.totalCreditN1).toFixed(2)),
    'Débit N': Number(item.totalDebitN.toFixed(2)),
    'Crédit N': Number(item.totalCreditN.toFixed(2)),
    'Solde N (Déb - Créd)': Number((item.totalDebitN - item.totalCreditN).toFixed(2))
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(lines);
  XLSX.utils.book_append_sheet(wb, ws, 'Balance');
  XLSX.writeFile(wb, 'balance_comptable.xlsx');
}


