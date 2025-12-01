import React, { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { formatCurrency, formatPercent, formatCurrencyNoDecimals } from '../utils/formatters';

const SIGView = ({ generateSIG, parseResult1, parseResult2 }) => {
  // Gestion de l'affichage des colonnes
  const [showN, setShowN] = useState(true);
  const [showN1, setShowN1] = useState(!!parseResult2);
  const [showVar, setShowVar] = useState(false);

  const sigN = generateSIG(parseResult1);
  const sigN1 = parseResult2 ? generateSIG(parseResult2) : null;

  if (!sigN) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
        Aucune donnée SIG disponible.
      </div>
    );
  }

  // Récupération du CA pour les ratios
  const caN = sigN.details.chiffreAffaires || 1;
  const caN1 = sigN1 ? (sigN1.details.chiffreAffaires || 1) : 1;

  // Liste des indicateurs à afficher
  const indicateurs = [
    { key: 'margeCommerciale', label: 'Marge Commerciale', color: 'text-blue-700', bg: 'bg-blue-50' },
    { key: 'productionExercice', label: 'Production de l\'exercice', color: 'text-gray-700' },
    { key: 'valeurAjoutee', label: 'Valeur Ajoutée (VA)', color: 'text-indigo-700', bg: 'bg-indigo-50', bold: true },
    { key: 'ebe', label: 'Excédent Brut d\'Exploitation (EBE)', color: 'text-green-700', bg: 'bg-green-50', bold: true, size: 'text-lg' },
    { key: 'resultatExploitation', label: 'Résultat d\'Exploitation', color: 'text-gray-700' },
    { key: 'rcai', label: 'Résultat Courant (RCAI)', color: 'text-gray-700' },
    { key: 'resultatExceptionnel', label: 'Résultat Exceptionnel', color: 'text-gray-600', italic: true },
    { key: 'resultatNet', label: 'RÉSULTAT NET COMPTABLE', color: 'text-purple-800', bg: 'bg-purple-100', bold: true, size: 'text-xl' },
  ];

  // Helper pour afficher la variation
  const renderVariation = (valN, valN1) => {
    const diff = valN - valN1;
    const percent = valN1 !== 0 ? (diff / Math.abs(valN1)) : 0;
    
    let Icon = Minus;
    let colorClass = 'text-gray-400';
    
    if (diff > 0) { Icon = TrendingUp; colorClass = 'text-green-600'; }
    if (diff < 0) { Icon = TrendingDown; colorClass = 'text-red-600'; }

    return (
      <div className={`flex flex-col items-end ${colorClass}`}>
        <span className="font-medium text-xs">{formatCurrencyNoDecimals(diff)}</span>
        <div className="flex items-center gap-1 text-[10px]">
          <Icon size={12} />
          {valN1 !== 0 ? formatPercent(percent * 100) : '-'}
        </div>
      </div>
    );
  };

  // Calcul des ratios pour les cartes du bas
  const ratios = {
    margeN: (sigN.margeCommerciale / (sigN.details.ventesMarchandises || 1)) * 100,
    margeN1: sigN1 ? (sigN1.margeCommerciale / (sigN1.details.ventesMarchandises || 1)) * 100 : 0,
    
    ebeN: (sigN.ebe / caN) * 100,
    ebeN1: sigN1 ? (sigN1.ebe / caN1) * 100 : 0,
    
    netN: (sigN.resultatNet / caN) * 100,
    netN1: sigN1 ? (sigN1.resultatNet / caN1) * 100 : 0
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Activity size={20} className="text-indigo-600" />
          Soldes Intermédiaires de Gestion (SIG)
        </h4>
        
        {/* BARRE D'OUTILS (CHECKBOXES) */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm select-none hover:text-indigo-600 transition-colors">
            <input 
              type="checkbox" 
              checked={showN} 
              onChange={(e) => setShowN(e.target.checked)} 
              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
            />
            Exercice N
          </label>
          
          {sigN1 && (
            <>
              <label className="flex items-center gap-2 cursor-pointer text-sm select-none hover:text-indigo-600 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showN1} 
                  onChange={(e) => setShowN1(e.target.checked)} 
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                />
                Exercice N-1
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer text-sm select-none hover:text-indigo-600 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showVar} 
                  onChange={(e) => setShowVar(e.target.checked)} 
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                />
                Variation
              </label>
            </>
          )}
        </div>
      </div>

      {/* TABLEAU PRINCIPAL */}
      <div className="overflow-hidden border border-gray-200 rounded-lg mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">Indicateur</th>
              
              {/* Colonnes N */}
              {showN && (
                <>
                  <th className="px-4 py-3 text-right w-32">Montant N</th>
                  <th className="px-4 py-3 text-right w-20 text-gray-400">% CA</th>
                </>
              )}
              
              {/* Colonnes N-1 */}
              {showN1 && sigN1 && (
                <>
                  <th className="px-4 py-3 text-right w-32 border-l border-gray-200">Montant N-1</th>
                  <th className="px-4 py-3 text-right w-20 text-gray-400">% CA</th>
                </>
              )}

              {/* Colonne Variation */}
              {showVar && sigN1 && (
                <th className="px-4 py-3 text-right w-32 border-l border-gray-200">Variation</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {indicateurs.map((ind, idx) => {
              const valN = sigN[ind.key] || 0;
              const valN1 = sigN1 ? (sigN1[ind.key] || 0) : 0;
              const ratioN = (valN / caN) * 100;
              const ratioN1 = sigN1 ? (valN1 / caN1) * 100 : 0;

              return (
                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${ind.bg || ''}`}>
                  <td className={`px-4 py-3 ${ind.color} ${ind.bold ? 'font-bold' : ''} ${ind.italic ? 'italic' : ''} ${ind.size || ''}`}>
                    {ind.label}
                  </td>
                  
                  {/* Données N */}
                  {showN && (
                    <>
                      <td className={`px-4 py-3 text-right font-mono ${ind.bold ? 'font-bold' : ''} ${ind.size || ''}`}>
                        {formatCurrencyNoDecimals(valN)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                        {formatPercent(ratioN)}
                      </td>
                    </>
                  )}

                  {/* Données N-1 */}
                  {showN1 && sigN1 && (
                    <>
                      <td className="px-4 py-3 text-right font-mono border-l border-gray-200 text-gray-600">
                        {formatCurrencyNoDecimals(valN1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">
                        {formatPercent(ratioN1)}
                      </td>
                    </>
                  )}

                  {/* Données Variation */}
                  {showVar && sigN1 && (
                    <td className="px-4 py-3 text-right border-l border-gray-200">
                      {renderVariation(valN, valN1)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CARTES KPI (Comparatif) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Taux de Marge */}
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <div className="flex justify-between items-start">
            <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">Taux Marge Comm.</p>
            {showN1 && sigN1 && (
              <span className="text-base text-indigo-400 bg-white px-3 py-1 rounded-full border border-indigo-100">
                N-1: {formatPercent(ratios.margeN1)}
              </span>
            )}
          </div>
          {showN && (
            <p className="text-2xl font-bold text-indigo-900 mt-1">
              {formatPercent(ratios.margeN)}
            </p>
          )}
        </div>

        {/* Rentabilité EBE */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex justify-between items-start">
            <p className="text-xs text-green-600 font-semibold uppercase mb-1">Rentabilité EBE / CA</p>
            {showN1 && sigN1 && (
              <span className="text-base text-green-600 bg-white px-3 py-1 rounded-full border border-green-100">
                N-1: {formatPercent(ratios.ebeN1)}
              </span>
            )}
          </div>
          {showN && (
            <p className="text-2xl font-bold text-green-900 mt-1">
              {formatPercent(ratios.ebeN)}
            </p>
          )}
        </div>

        {/* Rentabilité Nette */}
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div className="flex justify-between items-start">
            <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Rentabilité Nette / CA</p>
            {showN1 && sigN1 && (
              <span className="text-base text-purple-400 bg-white px-3 py-1 rounded-full border border-purple-100">
                N-1: {formatPercent(ratios.netN1)}
              </span>
            )}
          </div>
          {showN && (
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {formatPercent(ratios.netN)}
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default SIGView;