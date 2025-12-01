import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { TrendingUp, Download, XCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { brightenColor } from '../utils/colors';
import { useMonthlyData } from '../hooks/useMonthlyData';

// XLSX est chargé depuis le CDN (voir index.html)
const XLSX = window.XLSX;

// Composant optimisé pour l'affichage d'une ligne de compte
const AccountRow = React.memo(({
  rowData,
  selectedAccounts,
  toggleAccountSelection,
  toggleCollectiveExpansion,
  showN,
  showN1,
  parseResult2
}) => {
  const { account, sectionType, isAuxiliary, hasAuxiliaries, isExpanded, auxiliariesCount = 0 } = rowData;

  const handleCheckboxChange = useCallback(() => {
    toggleAccountSelection(account.compteNum);
  }, [toggleAccountSelection, account.compteNum]);

  const handleExpandClick = useCallback(() => {
    if (hasAuxiliaries) {
      toggleCollectiveExpansion(account.compteNum);
    }
  }, [hasAuxiliaries, toggleCollectiveExpansion, account.compteNum]);

  return (
    <tr
      className={`border-t border-gray-200 hover:bg-gray-100 ${isAuxiliary ? 'bg-gray-50' : ''}`}
    >
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={selectedAccounts.has(account.compteNum)}
          onChange={handleCheckboxChange}
          className="w-4 h-4 cursor-pointer"
        />
      </td>
      <td
        className={`px-3 py-2 font-mono text-xs ${hasAuxiliaries ? 'cursor-pointer hover:text-indigo-600' : ''} ${isAuxiliary ? 'pl-8' : ''}`}
        onClick={handleExpandClick}
      >
        <div className="flex items-center gap-1">
          {hasAuxiliaries && (
            <span className="inline-flex items-center">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {isAuxiliary && !hasAuxiliaries && <span className="text-gray-300 mr-1">└</span>}
          <span className={hasAuxiliaries ? 'font-semibold text-indigo-700' : ''}>
            {account.compteNum}
          </span>
          {hasAuxiliaries && auxiliariesCount > 0 && (
            <span className="text-xs text-gray-500 ml-1">
              ({auxiliariesCount} auxiliaire{auxiliariesCount > 1 ? 's' : ''})
            </span>
          )}
        </div>
      </td>
      <td className={`px-3 py-2 ${hasAuxiliaries ? 'font-semibold' : ''}`}>
        {account.compteLibelle}
      </td>
      {showN1 && parseResult2 && (
        <td className={`px-3 py-2 text-right font-mono ${(account.soldeN1 || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
          {formatCurrency(account.soldeN1 || 0)}
        </td>
      )}
      {showN && (
        <td className={`px-3 py-2 text-right font-mono ${!isAuxiliary ? 'font-bold' : ''} ${account.solde >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
          {formatCurrency(account.solde)}
        </td>
      )}
    </tr>
  );
});

const CyclesView = ({
  cyclesResult1, // Exercice N
  cyclesResult2, // Exercice N-1
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
  // --- ÉTATS LOCAUX POUR LES COCHES ---
  const [showN, setShowN] = useState(true);
  const [showN1, setShowN1] = useState(!!cyclesResult2); // Activé par défaut si N-1 existe

  const [expandedCollectives, setExpandedCollectives] = useState(new Set());
  const [sortAuxiliariesBy, setSortAuxiliariesBy] = useState('N');

  // Toggle la sélection d'un compte
  const toggleAccountSelection = useCallback((compteNum) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compteNum)) {
        newSet.delete(compteNum);
      } else {
        newSet.add(compteNum);
      }
      return newSet;
    });
  }, [setSelectedAccounts]);

  const toggleCollectiveExpansion = useCallback((compteNum) => {
    setExpandedCollectives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compteNum)) {
        newSet.delete(compteNum);
      } else {
        newSet.add(compteNum);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    setSelectedAccounts(new Set());
    setExpandedCollectives(new Set());
  }, [selectedCycleForDetail, setSelectedAccounts]);

  // Générer les données mensuelles (uniquement si on affiche des courbes)
  const monthlyData = useMonthlyData({
    selectedCycleForDetail,
    cyclesResult1,
    selectedAccounts,
    parseResult1,
    cumulMode
  });

  // --- LOGIQUE DE SÉLECTION DES DONNÉES ---
  // Déterminer quel jeu de données est le "principal" (celui qui définit les barres et le tri)
  const primaryResult = showN ? cyclesResult1 : (showN1 ? cyclesResult2 : null);
  const isComparison = showN && showN1 && cyclesResult2;

  // --- CALCULS (Sécurisés : ne s'exécutent que si primaryResult existe) ---
  const { sortedCycles, total } = useMemo(() => {
    if (!primaryResult) return { sortedCycles: [], total: 0 };

    const cyclesFiltered = Object.entries(primaryResult.statsParCycle)
      .filter(([_, stats]) => {
        if (viewMode === 'ecritures') {
          return stats.nbEcritures > 0;
        } else {
          return Math.abs(stats.solde) > 0;
        }
      });

    let calculatedTotal = 0;
    if (viewMode === 'ecritures') {
      calculatedTotal = cyclesFiltered.reduce((sum, [_, stats]) => sum + stats.nbEcritures, 0);
    } else {
      calculatedTotal = cyclesFiltered.reduce((sum, [_, stats]) => sum + Math.abs(stats.solde), 0);
    }

    const sorted = cyclesFiltered.sort(([_, a], [__, b]) => {
      if (viewMode === 'ecritures') {
        return b.nbEcritures - a.nbEcritures;
      } else {
        return Math.abs(b.solde) - Math.abs(a.solde);
      }
    });

    return { sortedCycles: sorted, total: calculatedTotal };
  }, [primaryResult, viewMode]);

  // --- EXPORT EXCEL ---
  const handleExportExcel = useCallback(() => {
    if (!primaryResult) return;
    const accountsData = getCycleDetailsByAccount(selectedCycleForDetail, cyclesResult1, cyclesResult2);
    const cycleName = cyclesResult1.statsParCycle[selectedCycleForDetail]?.nom || 'Cycle';
    const wb = XLSX.utils.book_new();

    const sheetData = [];
    sheetData.push(['Compte', 'Libellé', 'Solde N', parseResult2 ? 'Solde N-1' : '']);
    [...accountsData.bilan, ...accountsData.resultat].forEach(acc => {
      sheetData.push([acc.compteNum, acc.compteLibelle, acc.solde, acc.soldeN1 || 0]);
    });
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Détail");
    XLSX.writeFile(wb, `Cycle_${cycleName}.xlsx`);
  }, [primaryResult, getCycleDetailsByAccount, selectedCycleForDetail, cyclesResult1, cyclesResult2, parseResult2]);

  // --- PRÉPARATION DES DONNÉES DU TABLEAU (MEMOISÉ) ---
  const { organizedBilan, organizedResultat, accountsData } = useMemo(() => {
    if (!selectedCycleForDetail) return { organizedBilan: [], organizedResultat: [], accountsData: null };

    const data = getCycleDetailsByAccount(selectedCycleForDetail, cyclesResult1, cyclesResult2);

    const sortAuxiliariesByPeriod = (accounts) => {
      return accounts.map(account => {
        if (account.isCollective && account.auxiliaries && account.auxiliaries.length > 0) {
          const sortedAccount = { ...account, auxiliaries: [...account.auxiliaries] };
          const collectifSolde = sortAuxiliariesBy === 'N1'
            ? (sortedAccount.soldeN1 || 0)
            : (sortedAccount.solde || 0);

          sortedAccount.auxiliaries.sort((a, b) => {
            const soldeA = sortAuxiliariesBy === 'N1' ? (a.soldeN1 || 0) : (a.solde || 0);
            const soldeB = sortAuxiliariesBy === 'N1' ? (b.soldeN1 || 0) : (b.solde || 0);

            if (collectifSolde < 0) return soldeA - soldeB;
            else return soldeB - soldeA;
          });

          return sortedAccount;
        }
        return account;
      });
    };

    return {
      organizedBilan: sortAuxiliariesByPeriod(data.bilan),
      organizedResultat: sortAuxiliariesByPeriod(data.resultat),
      accountsData: data
    };
  }, [selectedCycleForDetail, cyclesResult1, cyclesResult2, getCycleDetailsByAccount, sortAuxiliariesBy]);

  // Génération des lignes à afficher (Memoized)
  const generateAccountRows = useCallback((organizedAccounts, sectionType) => {
    const rows = [];
    organizedAccounts.forEach((account, idx) => {
      const isExpanded = expandedCollectives.has(account.compteNum);
      const hasAuxiliaries = account.isCollective && account.auxiliaries && account.auxiliaries.length > 0;

      rows.push({
        account: {
          ...account,
          compteNum: account.compteNum,
          compteLibelle: account.compteLibelle,
          solde: account.solde,
          soldeN1: account.soldeN1 || 0
        },
        idx,
        sectionType,
        isAuxiliary: false,
        hasAuxiliaries,
        isExpanded,
        isCollective: account.isCollective || false,
        auxiliariesCount: hasAuxiliaries ? account.auxiliaries.length : 0
      });

      if (hasAuxiliaries && isExpanded && account.auxiliaries) {
        account.auxiliaries.forEach((aux, auxIdx) => {
          rows.push({
            account: {
              compteNum: aux.compteAuxNum || aux.compteNum,
              compteLibelle: aux.compteAuxLibelle || aux.compteLibelle || aux.compteAuxNum,
              solde: aux.solde || 0,
              soldeN1: aux.soldeN1 || 0
            },
            idx: `${idx}-aux-${auxIdx}`,
            sectionType,
            isAuxiliary: true,
            hasAuxiliaries: false,
            isExpanded: false,
            isCollective: false
          });
        });
      }
    });
    return rows;
  }, [expandedCollectives]);

  if (!cyclesResult1) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* --- EN-TÊTE (Toujours visible) --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp size={20} />
          Répartition par cycle
        </h4>

        <div className="flex flex-wrap items-center gap-4">
          {/* CHECKBOXES EXERCICES */}
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={showN}
                onChange={(e) => setShowN(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className={`font-medium ${showN ? 'text-gray-900' : 'text-gray-500'}`}>
                Exercice N
              </span>
            </label>

            {cyclesResult2 && (
              <>
                <div className="w-px h-4 bg-gray-300"></div>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={showN1}
                    onChange={(e) => setShowN1(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className={`font-medium ${showN1 ? 'text-gray-900' : 'text-gray-500'}`}>
                    Exercice N-1
                  </span>
                </label>
              </>
            )}
          </div>

          {/* BOUTONS MODE */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('ecritures')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'ecritures'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Par écriture
            </button>
            <button
              onClick={() => setViewMode('solde')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === 'solde'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Par solde
            </button>
          </div>
        </div>
      </div>

      {/* --- CONTENU CONDITIONNEL --- */}
      {!primaryResult ? (
        // CAS : Rien n'est coché (Message d'aide)
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            Veuillez sélectionner au moins un exercice (N ou N-1) ci-dessus pour afficher l'analyse.
          </p>
        </div>
      ) : (
        // CAS : Données affichées
        <>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              {viewMode === 'ecritures' ? (
                <>📊 <strong>Mode "Par écriture"</strong> : Poids de chaque cycle par rapport au total d'écritures</>
              ) : (
                <>💰 <strong>Mode "Par solde"</strong> : Poids de chaque cycle par rapport au total du bilan</>
              )}
              {' • '}
              <span className="text-indigo-600">💡 Cliquez sur un nom de cycle pour voir le détail par compte</span>
              {!showN && showN1 && <span className="ml-2 font-bold text-orange-600"> (Affichage des données N-1)</span>}
            </p>
          </div>

          <div className="space-y-3">
            {sortedCycles.map(([cycleCode, stats]) => {
              const statsComparison = isComparison ? cyclesResult2?.statsParCycle?.[cycleCode] : null;

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

                if (statsComparison) {
                  const evolution = ((stats.nbEcritures - statsComparison.nbEcritures) / statsComparison.nbEcritures) * 100;
                  evolutionValue = {
                    value: statsComparison.nbEcritures,
                    evolution: evolution,
                    label: 'N-1'
                  };
                }
              } else {
                const soldeAbs = Math.abs(stats.solde);
                percentage = total > 0 ? (soldeAbs / total) * 100 : 0;
                displayValue = formatCurrency(stats.solde);

                if (statsComparison) {
                  const evolution = statsComparison.solde !== 0 ? ((stats.solde - statsComparison.solde) / Math.abs(statsComparison.solde)) * 100 : 0;
                  evolutionValue = {
                    value: statsComparison.solde,
                    evolution: evolution,
                    label: 'N-1'
                  };
                }
              }

              const isSelected = selectedCycleForDetail === cycleCode;
              const barColor = isSelected ? brightenColor(stats.color, 0.25) : stats.color;

              return (
                <div key={cycleCode} className="flex items-center gap-3 py-1">

                  {/* 1. COLONNE NOM : Largeur augmentée (w-72) pour afficher le nom entier */}
                  <div
                    className={`w-72 text-sm flex-shrink-0 truncate cursor-pointer hover:text-indigo-600 hover:underline transition-colors ${isSelected ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                      }`}
                    onClick={() => setSelectedCycleForDetail(selectedCycleForDetail === cycleCode ? null : cycleCode)}
                    title="Cliquez pour voir le détail par compte"
                  >
                    {stats.nom}
                  </div>

                  {/* 2. BARRE DE PROGRESSION : Largeur limitée (max-w-lg) */}
                  <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden relative min-w-0 max-w-lg">
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

                  {/* 3. VALEURS & VARIATION : Hauteur fixe pour alignement vertical constant */}
                  <div className="w-40 text-right flex-shrink-0 font-mono tabular-nums flex flex-col justify-center h-10">
                    <div className="text-sm font-semibold text-gray-800 leading-none mb-1">
                      {displayValue}
                    </div>

                    {/* Cette div garde sa place même si invisible pour assurer l'espacement constant */}
                    <div className={`text-xs leading-none flex justify-end items-center gap-1 ${evolutionValue ? '' : 'invisible'}`}>
                      {evolutionValue && (
                        <>
                          <span className="text-gray-400 font-normal text-[10px] mr-1">
                            (N-1: {viewMode === 'ecritures' ? evolutionValue.value : formatCurrency(evolutionValue.value)})
                          </span>
                          <span className={evolutionValue.evolution >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {evolutionValue.evolution >= 0 ? '↑' : '↓'} {Math.abs(evolutionValue.evolution).toFixed(1)}%
                          </span>
                        </>
                      )}
                      {!evolutionValue && <span>&nbsp;</span>}
                    </div>
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
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
                    <span className="text-xs text-gray-600 px-2">Tri Auxiliaire sur</span>
                    {parseResult2 && (
                      <button
                        onClick={() => setSortAuxiliariesBy('N1')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${sortAuxiliariesBy === 'N1'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        N-1
                      </button>
                    )}
                    <button
                      onClick={() => setSortAuxiliariesBy('N')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${sortAuxiliariesBy === 'N'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      N
                    </button>
                  </div>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
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
                {/* Section Comptes de Bilan */}
                {organizedBilan.length > 0 && (
                  <div>
                    <div className="bg-blue-50 px-3 py-2 mb-2 rounded-t-lg">
                      <h5 className="font-bold text-blue-800">📊 COMPTES DE BILAN</h5>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="w-12"></th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Compte</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé</th>
                          {showN1 && parseResult2 && <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>}
                          {showN && <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {generateAccountRows(organizedBilan, 'bilan').map(rowData => (
                          <AccountRow
                            key={`${rowData.sectionType}-${rowData.account.compteNum}-${rowData.idx}`}
                            rowData={rowData}
                            selectedAccounts={selectedAccounts}
                            toggleAccountSelection={toggleAccountSelection}
                            toggleCollectiveExpansion={toggleCollectiveExpansion}
                            showN={showN}
                            showN1={showN1}
                            parseResult2={parseResult2}
                          />
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-100 font-bold">
                        <tr>
                          <td colSpan="3" className="px-3 py-2 text-right">Sous-total Bilan:</td>
                          {showN1 && parseResult2 && (
                            <td className="px-3 py-2 text-right font-mono">
                              {formatCurrency(accountsData.bilan.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0))}
                            </td>
                          )}
                          {showN && (
                            <td className="px-3 py-2 text-right font-mono">
                              {formatCurrency(accountsData.bilan.reduce((sum, acc) => sum + acc.solde, 0))}
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Section Comptes de Résultat */}
                {organizedResultat.length > 0 && (
                  <div>
                    <div className="bg-green-50 px-3 py-2 mb-2 rounded-t-lg">
                      <h5 className="font-bold text-green-800">📈 COMPTES DE RÉSULTAT</h5>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="w-12"></th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Compte</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé</th>
                          {showN1 && parseResult2 && <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>}
                          {showN && <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {generateAccountRows(organizedResultat, 'resultat').map(rowData => (
                          <AccountRow
                            key={`${rowData.sectionType}-${rowData.account.compteNum}-${rowData.idx}`}
                            rowData={rowData}
                            selectedAccounts={selectedAccounts}
                            toggleAccountSelection={toggleAccountSelection}
                            toggleCollectiveExpansion={toggleCollectiveExpansion}
                            showN={showN}
                            showN1={showN1}
                            parseResult2={parseResult2}
                          />
                        ))}
                      </tbody>
                      <tfoot className="bg-green-100 font-bold">
                        <tr>
                          <td colSpan="3" className="px-3 py-2 text-right">Sous-total Résultat:</td>
                          {showN1 && parseResult2 && (
                            <td className="px-3 py-2 text-right font-mono">
                              {formatCurrency(accountsData.resultat.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0))}
                            </td>
                          )}
                          {showN && (
                            <td className="px-3 py-2 text-right font-mono">
                              {formatCurrency(accountsData.resultat.reduce((sum, acc) => sum + acc.solde, 0))}
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Graphique mensuel */}
              {selectedAccounts.size > 0 && showN && monthlyData.length > 0 && (
                <div className="mt-6 p-6 bg-white rounded-lg border-2 border-indigo-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-800">
                      Analyse de saisonnalité (Exercice N)
                    </h4>
                    <button
                      onClick={() => setCumulMode(!cumulMode)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${cumulMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Cumul
                    </button>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {cumulMode && <Line type="monotone" dataKey="cumul_solde" stroke="#1e40af" strokeWidth={3} dot={false} />}
                        {Array.from(selectedAccounts).map((acc, i) => (
                          <Line key={acc} type="monotone" dataKey={`${acc}_solde`} stroke={`hsl(${i * 40}, 70%, 50%)`} dot={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CyclesView;