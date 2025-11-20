import React, { useEffect, useMemo } from 'react';
import { TrendingUp, Download, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../utils/formatters';
import { brightenColor } from '../utils/colors';
import { useMonthlyData } from '../hooks/useMonthlyData';

const CyclesView = ({
  cyclesResult1,
  cyclesResult2,
  parseResult1,
  parseResult2,
  viewMode,
  setViewMode,
  selectedCycleForDetail,
  setSelectedCycleForDetail,
  selectedAccounts,
  setSelectedAccounts,
  cumulMode,
  setCumulMode,
  getCycleDetailsByAccount
}) => {
  // Toggle la sélection d'un compte
  const toggleAccountSelection = (compteNum) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compteNum)) {
        newSet.delete(compteNum);
      } else {
        newSet.add(compteNum);
      }
      return newSet;
    });
  };

  // Réinitialiser les sélections quand on change de cycle
  useEffect(() => {
    setSelectedAccounts(new Set());
  }, [selectedCycleForDetail, setSelectedAccounts]);

  // Générer les données mensuelles
  const monthlyData = useMonthlyData({
    selectedCycleForDetail,
    cyclesResult1,
    selectedAccounts,
    parseResult1,
    cumulMode
  });

  if (!cyclesResult1) {
    return null;
  }

  // Calculer le total pour le mode sélectionné
  const cyclesFiltered = Object.entries(cyclesResult1.statsParCycle)
    .filter(([_, stats]) => {
      if (viewMode === 'ecritures') {
        return stats.nbEcritures > 0;
      } else {
        return Math.abs(stats.solde) > 0;
      }
    });

  // Calculer le total selon le mode
  let total = 0;
  if (viewMode === 'ecritures') {
    total = cyclesFiltered.reduce((sum, [_, stats]) => sum + stats.nbEcritures, 0);
  } else {
    total = cyclesFiltered.reduce((sum, [_, stats]) => sum + Math.abs(stats.solde), 0);
  }

  // Trier selon le mode
  const sortedCycles = cyclesFiltered.sort(([_, a], [__, b]) => {
    if (viewMode === 'ecritures') {
      return b.nbEcritures - a.nbEcritures;
    } else {
      return Math.abs(b.solde) - Math.abs(a.solde);
    }
  });

  // Fonction d'export Excel
  const handleExportExcel = () => {
    const accountsData = getCycleDetailsByAccount(selectedCycleForDetail, cyclesResult1, cyclesResult2);
    const cycleName = cyclesResult1.statsParCycle[selectedCycleForDetail]?.nom || 'Cycle';
    
    const wb = XLSX.utils.book_new();
    
    // Préparer les données pour l'onglet BILAN
    const bilanData = [];
    if (accountsData.bilan.length > 0) {
      const sectionHeader = parseResult2
        ? ['COMPTES DE BILAN (Classes 1 à 5)', '', '', '']
        : ['COMPTES DE BILAN (Classes 1 à 5)', '', ''];
      bilanData.push(sectionHeader);
      bilanData.push([]);
      
      const headerBilan = parseResult2 
        ? ['Numéro de compte', 'Libellé du compte', 'Solde N-1', 'Solde N']
        : ['Numéro de compte', 'Libellé du compte', 'Solde N'];
      bilanData.push(headerBilan);
      
      accountsData.bilan.forEach(account => {
        if (parseResult2) {
          bilanData.push([
            account.compteNum,
            account.compteLibelle,
            account.soldeN1 || 0,
            account.solde || 0
          ]);
        } else {
          bilanData.push([
            account.compteNum,
            account.compteLibelle,
            account.solde || 0
          ]);
        }
      });
      
      const bilanSoldeN1 = accountsData.bilan.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0);
      const bilanSolde = accountsData.bilan.reduce((sum, acc) => sum + acc.solde, 0);
      bilanData.push([]);
      if (parseResult2) {
        bilanData.push(['Sous-total Bilan', '', bilanSoldeN1, bilanSolde]);
      } else {
        bilanData.push(['Sous-total Bilan', '', bilanSolde]);
      }
    }
    
    // Préparer les données pour l'onglet RÉSULTAT
    const resultatData = [];
    if (accountsData.resultat.length > 0) {
      const sectionHeader = parseResult2
        ? ['COMPTES DE RÉSULTAT (Classes 6 et 7)', '', '', '']
        : ['COMPTES DE RÉSULTAT (Classes 6 et 7)', '', ''];
      resultatData.push(sectionHeader);
      resultatData.push([]);
      
      const headerResultat = parseResult2 
        ? ['Numéro de compte', 'Libellé du compte', 'Solde N-1', 'Solde N']
        : ['Numéro de compte', 'Libellé du compte', 'Solde N'];
      resultatData.push(headerResultat);
      
      accountsData.resultat.forEach(account => {
        if (parseResult2) {
          resultatData.push([
            account.compteNum,
            account.compteLibelle,
            account.soldeN1 || 0,
            account.solde || 0
          ]);
        } else {
          resultatData.push([
            account.compteNum,
            account.compteLibelle,
            account.solde || 0
          ]);
        }
      });
      
      const resultatSoldeN1 = accountsData.resultat.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0);
      const resultatSolde = accountsData.resultat.reduce((sum, acc) => sum + acc.solde, 0);
      resultatData.push([]);
      if (parseResult2) {
        resultatData.push(['Sous-total Résultat', '', resultatSoldeN1, resultatSolde]);
      } else {
        resultatData.push(['Sous-total Résultat', '', resultatSolde]);
      }
    }
    
    const calculateColumnWidth = (data, colIndex) => {
      let maxLength = 10;
      data.forEach((row) => {
        if (row && row[colIndex] !== undefined && row[colIndex] !== null) {
          const cellValue = String(row[colIndex]);
          const length = cellValue.length;
          if (length > maxLength) {
            maxLength = length;
          }
        }
      });
      return Math.min(Math.max(maxLength + 2, 10), 60);
    };
    
    const applyNumberFormat = (ws, startRow, endRow, colIndex) => {
      for (let R = startRow; R <= endRow; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: R });
        if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
          ws[cellAddress].z = '# ##0,00';
        }
      }
    };
    
    // Créer les feuilles Excel
    if (bilanData.length > 0) {
      const wsBilan = XLSX.utils.aoa_to_sheet(bilanData);
      
      const colWidths = [];
      const numCols = parseResult2 ? 4 : 3;
      for (let col = 0; col < numCols; col++) {
        colWidths.push({ wch: calculateColumnWidth(bilanData, col) });
      }
      
      if (parseResult2) {
        const soldeWidth = Math.max(colWidths[2].wch, colWidths[3].wch);
        colWidths[2].wch = soldeWidth;
        colWidths[3].wch = soldeWidth;
      }
      
      wsBilan['!cols'] = colWidths;
      
      if (wsBilan['A1']) {
        const sectionRange = parseResult2 ? XLSX.utils.decode_range('A1:D1') : XLSX.utils.decode_range('A1:C1');
        for (let C = sectionRange.s.c; C <= sectionRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
          if (!wsBilan[cellAddress]) continue;
          wsBilan[cellAddress].s = {
            font: { bold: true, color: { rgb: '1F4E78' }, sz: 12 },
            fill: { fgColor: { rgb: 'D9E1F2' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
      
      if (wsBilan['A3']) {
        const headerRange = parseResult2 ? XLSX.utils.decode_range('A3:D3') : XLSX.utils.decode_range('A3:C3');
        for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: 2 });
          if (!wsBilan[cellAddress]) continue;
          wsBilan[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
      
      const lastDataRow = bilanData.length - 1;
      if (parseResult2) {
        applyNumberFormat(wsBilan, 3, lastDataRow, 2);
        applyNumberFormat(wsBilan, 3, lastDataRow, 3);
      } else {
        applyNumberFormat(wsBilan, 3, lastDataRow, 2);
      }
      
      XLSX.utils.book_append_sheet(wb, wsBilan, 'Bilan');
    }
    
    if (resultatData.length > 0) {
      const wsResultat = XLSX.utils.aoa_to_sheet(resultatData);
      
      const colWidths = [];
      const numCols = parseResult2 ? 4 : 3;
      for (let col = 0; col < numCols; col++) {
        colWidths.push({ wch: calculateColumnWidth(resultatData, col) });
      }
      
      if (parseResult2) {
        const soldeWidth = Math.max(colWidths[2].wch, colWidths[3].wch);
        colWidths[2].wch = soldeWidth;
        colWidths[3].wch = soldeWidth;
      }
      
      wsResultat['!cols'] = colWidths;
      
      if (wsResultat['A1']) {
        const sectionRange = parseResult2 ? XLSX.utils.decode_range('A1:D1') : XLSX.utils.decode_range('A1:C1');
        for (let C = sectionRange.s.c; C <= sectionRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
          if (!wsResultat[cellAddress]) continue;
          wsResultat[cellAddress].s = {
            font: { bold: true, color: { rgb: '385723' }, sz: 12 },
            fill: { fgColor: { rgb: 'E2EFDA' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
      
      if (wsResultat['A3']) {
        const headerRange = parseResult2 ? XLSX.utils.decode_range('A3:D3') : XLSX.utils.decode_range('A3:C3');
        for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: 2 });
          if (!wsResultat[cellAddress]) continue;
          wsResultat[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '70AD47' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
      
      const lastDataRow = resultatData.length - 1;
      if (parseResult2) {
        applyNumberFormat(wsResultat, 3, lastDataRow, 2);
        applyNumberFormat(wsResultat, 3, lastDataRow, 3);
      } else {
        applyNumberFormat(wsResultat, 3, lastDataRow, 2);
      }
      
      XLSX.utils.book_append_sheet(wb, wsResultat, 'Compte de Résultat');
    }
    
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Detail_${cycleName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp size={20} />
          Répartition par cycle
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('ecritures')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'ecritures'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Par écriture
          </button>
          <button
            onClick={() => setViewMode('solde')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'solde'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Par solde
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600">
          {viewMode === 'ecritures' ? (
            <>📊 <strong>Mode "Par écriture"</strong> : Poids de chaque cycle par rapport au total d'écritures</>
          ) : (
            <>💰 <strong>Mode "Par solde"</strong> : Poids de chaque cycle par rapport au total du bilan (somme des valeurs absolues des soldes)</>
          )}
          {' • '}
          <span className="text-indigo-600">💡 Cliquez sur un nom de cycle pour voir le détail par compte</span>
        </p>
      </div>

      <div className="space-y-3">
        {sortedCycles.map(([cycleCode, stats]) => {
          const stats2 = cyclesResult2?.statsParCycle?.[cycleCode];
          
          let percentage = 0;
          let displayValue = '';
          let evolutionValue = null;

          if (viewMode === 'ecritures') {
            percentage = total > 0 ? (stats.nbEcritures / total) * 100 : 0;
            const nbEcrituresFormatted = stats.nbEcritures.toLocaleString('fr-FR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            });
            displayValue = `${nbEcrituresFormatted} écritures`;
            if (stats2) {
              const evolution = ((stats.nbEcritures - stats2.nbEcritures) / stats2.nbEcritures) * 100;
              evolutionValue = {
                value: stats2.nbEcritures,
                evolution: evolution
              };
            }
          } else {
            const soldeAbs = Math.abs(stats.solde);
            percentage = total > 0 ? (soldeAbs / total) * 100 : 0;
            displayValue = formatCurrency(stats.solde);
            if (stats2) {
              const evolution = stats2.solde !== 0 ? ((stats.solde - stats2.solde) / Math.abs(stats2.solde)) * 100 : 0;
              evolutionValue = {
                value: stats2.solde,
                evolution: evolution
              };
            }
          }

          const isSelected = selectedCycleForDetail === cycleCode;
          const barColor = isSelected ? brightenColor(stats.color, 0.25) : stats.color;

          return (
            <div key={cycleCode} className="flex items-center gap-3">
              <div 
                className={`w-48 text-sm flex-shrink-0 truncate cursor-pointer hover:text-indigo-600 hover:underline transition-colors ${
                  isSelected ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                }`}
                onClick={() => setSelectedCycleForDetail(selectedCycleForDetail === cycleCode ? null : cycleCode)}
                title="Cliquez pour voir le détail par compte"
              >
                {stats.nom}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden relative min-w-0">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                    minWidth: percentage > 0 ? '2px' : '0',
                  }}
                >
                  {percentage > 5 && (
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
                {percentage <= 5 && percentage > 0 && (
                  <span 
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-bold whitespace-nowrap"
                    style={{ color: barColor }}
                  >
                    {percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="w-40 text-sm font-semibold text-gray-800 text-right flex-shrink-0 font-mono tabular-nums">
                {displayValue}
                {evolutionValue && (
                  <div className={`text-xs mt-0.5 ${evolutionValue.evolution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {evolutionValue.evolution >= 0 ? '↑' : '↓'} {Math.abs(evolutionValue.evolution).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail par compte du cycle sélectionné */}
      {selectedCycleForDetail && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-800">
              Détail par compte: {cyclesResult1.statsParCycle[selectedCycleForDetail]?.nom}
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                title="Exporter en Excel (XLSX) avec 2 onglets"
              >
                <Download size={18} />
                Export XLS
              </button>
              <button
                onClick={() => setSelectedCycleForDetail(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {(() => {
              const accountsData = getCycleDetailsByAccount(selectedCycleForDetail, cyclesResult1, cyclesResult2);
              const allAccounts = [...accountsData.bilan, ...accountsData.resultat];
              
              return (
                <div className="space-y-6">
                  {/* Section Comptes de Bilan */}
                  {accountsData.bilan.length > 0 && (
                    <div>
                      <div className="bg-blue-50 px-3 py-2 mb-2 rounded-t-lg">
                        <h5 className="font-bold text-blue-800">📊 COMPTES DE BILAN (Classes 1 à 5)</h5>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700 w-12">
                              <input
                                type="checkbox"
                                checked={accountsData.bilan.length > 0 && accountsData.bilan.every(acc => selectedAccounts.has(acc.compteNum))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSet = new Set(selectedAccounts);
                                    accountsData.bilan.forEach(acc => newSet.add(acc.compteNum));
                                    setSelectedAccounts(newSet);
                                  } else {
                                    const newSet = new Set(selectedAccounts);
                                    accountsData.bilan.forEach(acc => newSet.delete(acc.compteNum));
                                    setSelectedAccounts(newSet);
                                  }
                                }}
                                className="w-4 h-4"
                              />
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                            {parseResult2 && (
                              <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>
                            )}
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountsData.bilan.map((account, idx) => (
                            <tr key={`bilan-${idx}`} className="border-t border-gray-200 hover:bg-gray-100">
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedAccounts.has(account.compteNum)}
                                  onChange={() => toggleAccountSelection(account.compteNum)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                              <td className="px-3 py-2">{account.compteLibelle}</td>
                              {parseResult2 && (
                                <td className={`px-3 py-2 text-right font-mono ${
                                  (account.soldeN1 || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(account.soldeN1 || 0)}
                                </td>
                              )}
                              <td className={`px-3 py-2 text-right font-mono font-bold ${
                                account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(account.solde)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-100 font-bold">
                          <tr>
                            <td colSpan={parseResult2 ? "3" : "3"} className="px-3 py-2 text-right">Sous-total Bilan:</td>
                            {parseResult2 && (
                              <td className={`px-3 py-2 text-right font-mono ${
                                accountsData.bilan.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(accountsData.bilan.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0))}
                              </td>
                            )}
                            <td className={`px-3 py-2 text-right font-mono ${
                              accountsData.bilan.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(accountsData.bilan.reduce((sum, acc) => sum + acc.solde, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  
                  {/* Section Comptes de Résultat */}
                  {accountsData.resultat.length > 0 && (
                    <div>
                      <div className="bg-green-50 px-3 py-2 mb-2 rounded-t-lg">
                        <h5 className="font-bold text-green-800">📈 COMPTES DE RÉSULTAT (Classes 6 et 7)</h5>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700 w-12">
                              <input
                                type="checkbox"
                                checked={accountsData.resultat.length > 0 && accountsData.resultat.every(acc => selectedAccounts.has(acc.compteNum))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSet = new Set(selectedAccounts);
                                    accountsData.resultat.forEach(acc => newSet.add(acc.compteNum));
                                    setSelectedAccounts(newSet);
                                  } else {
                                    const newSet = new Set(selectedAccounts);
                                    accountsData.resultat.forEach(acc => newSet.delete(acc.compteNum));
                                    setSelectedAccounts(newSet);
                                  }
                                }}
                                className="w-4 h-4"
                              />
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                            {parseResult2 && (
                              <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>
                            )}
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountsData.resultat.map((account, idx) => (
                            <tr key={`resultat-${idx}`} className="border-t border-gray-200 hover:bg-gray-100">
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedAccounts.has(account.compteNum)}
                                  onChange={() => toggleAccountSelection(account.compteNum)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                              <td className="px-3 py-2">{account.compteLibelle}</td>
                              {parseResult2 && (
                                <td className={`px-3 py-2 text-right font-mono ${
                                  (account.soldeN1 || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(account.soldeN1 || 0)}
                                </td>
                              )}
                              <td className={`px-3 py-2 text-right font-mono font-bold ${
                                account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(account.solde)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-green-100 font-bold">
                          <tr>
                            <td colSpan={parseResult2 ? "3" : "3"} className="px-3 py-2 text-right">Sous-total Résultat:</td>
                            {parseResult2 && (
                              <td className={`px-3 py-2 text-right font-mono ${
                                accountsData.resultat.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(accountsData.resultat.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0))}
                              </td>
                            )}
                            <td className={`px-3 py-2 text-right font-mono ${
                              accountsData.resultat.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(accountsData.resultat.reduce((sum, acc) => sum + acc.solde, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  
                  {/* Total Général */}
                  <div>
                    <table className="w-full text-sm">
                      <tfoot className="bg-gray-100 font-bold">
                        <tr>
                          <td colSpan={parseResult2 ? "3" : "3"} className="px-3 py-2 text-right">TOTAL GÉNÉRAL:</td>
                          {parseResult2 && (
                            <td className={`px-3 py-2 text-right font-mono ${
                              allAccounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(
                                allAccounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0)
                              )}
                            </td>
                          )}
                          <td className={`px-3 py-2 text-right font-mono ${
                            cyclesResult1.statsParCycle[selectedCycleForDetail]?.solde >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(cyclesResult1.statsParCycle[selectedCycleForDetail]?.solde || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Graphique mensuel de saisonnalité */}
          {selectedAccounts.size > 0 && monthlyData.length > 0 && (
            <div className="mt-6 p-6 bg-white rounded-lg border-2 border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Analyse de saisonnalité - Évolution mensuelle
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCumulMode(!cumulMode)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      cumulMode
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cumul
                  </button>
                  <button
                    onClick={() => setSelectedAccounts(new Set())}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Désélectionner tout
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Comptes sélectionnés ({selectedAccounts.size}) :
                </p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                        const accountsData = getCycleDetailsByAccount(selectedCycleForDetail, cyclesResult1, cyclesResult2);
                        const allAccounts = [...accountsData.bilan, ...accountsData.resultat];
                        return Array.from(selectedAccounts).map(compteNum => {
                          const account = allAccounts.find(acc => acc.compteNum === compteNum);
                          return account ? (
                            <span
                              key={compteNum}
                              className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium flex items-center gap-2"
                            >
                              {account.compteNum} - {account.compteLibelle}
                              <button
                                onClick={() => toggleAccountSelection(compteNum)}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                <XCircle size={14} />
                              </button>
                            </span>
                          ) : null;
                        });
                      })()}
                    </div>
                  </div>

                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="label" 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                          tickFormatter={(value) => {
                            if (Math.abs(value) >= 1000000) {
                              return `${(value / 1000000).toFixed(1)}M€`;
                            } else if (Math.abs(value) >= 1000) {
                              return `${(value / 1000).toFixed(0)}k€`;
                            }
                            return `${value.toFixed(0)}€`;
                          }}
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            const formattedValue = formatCurrency(value);
                            if (name === 'cumul_solde') {
                              return [formattedValue, 'Cumul (Solde total)'];
                            }
                            const accountInfo = name.split('_');
                            const compteNum = accountInfo[0];
                            const accountsDataLocal = getCycleDetailsByAccount(selectedCycleForDetail, cyclesResult1, cyclesResult2);
                            const allAccountsLocal = [...accountsDataLocal.bilan, ...accountsDataLocal.resultat];
                            const account = allAccountsLocal.find(acc => acc.compteNum === compteNum);
                            return [
                              formattedValue,
                              `${account?.compteLibelle || compteNum} (Solde)`
                            ];
                          }}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          formatter={(value) => {
                            if (value === 'cumul_solde') {
                              return 'Cumul (Solde total)';
                            }
                            const accountInfo = value.split('_');
                            const compteNum = accountInfo[0];
                            const accountsDataLocal = getCycleDetailsByAccount(selectedCycleForDetail, cyclesResult1, cyclesResult2);
                            const allAccountsLocal = [...accountsDataLocal.bilan, ...accountsDataLocal.resultat];
                            const account = allAccountsLocal.find(acc => acc.compteNum === compteNum);
                            return `${account?.compteLibelle || compteNum}`;
                          }}
                        />
                    {cumulMode && (
                      <Line
                        key="cumul_solde"
                        type="monotone"
                        dataKey="cumul_solde"
                        stroke="#1e40af"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                        name="cumul_solde"
                      />
                    )}
                    {Array.from(selectedAccounts).map((compteNum, idx) => {
                      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                      const pastelColors = ['#93c5fd', '#fca5a5', '#86efac', '#fde047', '#c4b5fd', '#f9a8d4', '#67e8f9', '#bef264'];
                      const color = cumulMode ? pastelColors[idx % pastelColors.length] : colors[idx % colors.length];
                      const strokeWidth = cumulMode ? 1.5 : 2;
                      return (
                        <Line
                          key={`${compteNum}_solde`}
                          type="monotone"
                          dataKey={`${compteNum}_solde`}
                          stroke={color}
                          strokeWidth={strokeWidth}
                          strokeOpacity={cumulMode ? 0.6 : 1}
                          dot={{ r: cumulMode ? 3 : 4 }}
                          activeDot={{ r: cumulMode ? 5 : 6 }}
                          name={`${compteNum}_solde`}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">
                  💡 <strong>Analyse de saisonnalité</strong> : Cette courbe montre l'évolution mensuelle du solde des comptes sélectionnés sur l'exercice. 
                  Les pics et creux permettent d'identifier les périodes de forte activité ou de saisonnalité.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CyclesView;

