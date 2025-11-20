import { useMemo } from 'react';

/**
 * Hook pour générer les données mensuelles pour les comptes sélectionnés
 */
export const useMonthlyData = ({
  selectedCycleForDetail,
  cyclesResult1,
  selectedAccounts,
  parseResult1,
  cumulMode
}) => {
  const monthlyData = useMemo(() => {
    if (!selectedCycleForDetail || !cyclesResult1 || selectedAccounts.size === 0) {
      return [];
    }

    const cycleData = cyclesResult1.dataWithCycles ? cyclesResult1.dataWithCycles.filter(row => row.cycle === selectedCycleForDetail) : [];
    const monthlyDataObj = {};

    // Initialiser tous les mois de l'exercice
    if (parseResult1 && parseResult1.minDate && parseResult1.maxDate) {
      const startDate = new Date(parseResult1.minDate);
      const endDate = new Date(parseResult1.maxDate);
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyDataObj[monthKey]) {
          monthlyDataObj[monthKey] = {
            month: monthKey,
            label: currentDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
          };
          // Initialiser chaque compte sélectionné
          selectedAccounts.forEach(compteNum => {
            monthlyDataObj[monthKey][`${compteNum}_debit`] = 0;
            monthlyDataObj[monthKey][`${compteNum}_credit`] = 0;
            monthlyDataObj[monthKey][`${compteNum}_solde`] = 0;
          });
          // Initialiser le cumul si activé
          if (cumulMode) {
            monthlyDataObj[monthKey]['cumul_solde'] = 0;
          }
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Agréger les données par mois et par compte
    cycleData.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!selectedAccounts.has(compteNum)) return;

      const dateStr = row.ecritureDate;
      if (dateStr && dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const monthKey = `${year}-${month}`;

        if (monthlyDataObj[monthKey]) {
          monthlyDataObj[monthKey][`${compteNum}_debit`] = (monthlyDataObj[monthKey][`${compteNum}_debit`] || 0) + (row.debit || 0);
          monthlyDataObj[monthKey][`${compteNum}_credit`] = (monthlyDataObj[monthKey][`${compteNum}_credit`] || 0) + (row.credit || 0);
          monthlyDataObj[monthKey][`${compteNum}_solde`] = monthlyDataObj[monthKey][`${compteNum}_debit`] - monthlyDataObj[monthKey][`${compteNum}_credit`];
        }
      }
    });

    // Calculer le cumul si activé (après avoir agrégé tous les comptes)
    if (cumulMode) {
      Object.keys(monthlyDataObj).forEach(monthKey => {
        let cumulSolde = 0;
        selectedAccounts.forEach(compteNum => {
          cumulSolde += monthlyDataObj[monthKey][`${compteNum}_solde`] || 0;
        });
        monthlyDataObj[monthKey]['cumul_solde'] = cumulSolde;
      });
    }

    // Convertir en tableau et trier par mois
    return Object.values(monthlyDataObj).sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedCycleForDetail, cyclesResult1, selectedAccounts, parseResult1, cumulMode]);

  return monthlyData;
};

