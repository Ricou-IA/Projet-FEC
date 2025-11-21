export function parseFecFile(fileContent, exerciceLabel = '') {
  const lines = fileContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('Le fichier est vide ou invalide');
  }

  const headers = lines[0].split('\t');
  if (headers.length < 18) {
    throw new Error(`Le fichier ne respecte pas le minimum de 18 colonnes requis par la norme FEC. Colonnes détectées: ${headers.length}`);
  }

  const data = [];
  let totalDebit = 0;
  let totalCredit = 0;
  const dates = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    if (values.length >= 18) {
      const debit = parseFloat(values[11].replace(',', '.')) || 0;
      const credit = parseFloat(values[12].replace(',', '.')) || 0;

      totalDebit += debit;
      totalCredit += credit;

      const dateStr = values[3];
      if (dateStr && dateStr.length === 8) {
        const date = new Date(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(4, 6)) - 1,
          parseInt(dateStr.substring(6, 8))
        );
        dates.push(date);
      }

      data.push({
        journalCode: values[0],
        journalLibelle: values[1],
        ecritureNum: values[2],
        ecritureDate: values[3],
        compteNum: values[4],
        compteLibelle: values[5],
        compteAuxNum: values[6] || '', // Compte auxiliaire numéro (vide si pas d'auxiliaire)
        compteAuxLibelle: values[7] || '', // Libellé du compte auxiliaire
        pieceRef: values[8],
        ecritureLibelle: values[10],
        debit: debit,
        credit: credit
      });
    }
  }

  const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

  return {
    success: true,
    columnsCount: headers.length,
    rowsCount: data.length,
    totalDebit: totalDebit,
    totalCredit: totalCredit,
    balance: Math.abs(totalDebit - totalCredit),
    minDate: minDate,
    maxDate: maxDate,
    data: data
  };
}


