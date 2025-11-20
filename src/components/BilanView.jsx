import React from 'react';
import { BarChart3, XCircle } from 'lucide-react';
import { formatCurrency, formatCurrencyNoDecimals } from '../utils/formatters';

const BilanView = ({
  generateBilan,
  parseResult2,
  showBilanN,
  setShowBilanN,
  showBilanN1,
  setShowBilanN1,
  showBilanComparaison,
  setShowBilanComparaison,
  selectedClasse,
  setSelectedClasse,
  getBilanDetails
}) => {
  const bilanN = generateBilan();
  const bilanN1 = parseResult2 ? generateBilan(parseResult2) : null;

  // Vérifications de sécurité
  if (!bilanN) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500 py-8">Aucune donnée disponible</div>
      </div>
    );
  }

  if (!bilanN.actif || !bilanN.passif) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500 py-8">Structure de données invalide</div>
      </div>
    );
  }

  // Fonction helper pour afficher une ligne de rubrique/sous-total
  const renderTotalRow = (label, totalN, totalN1, colSpan = 1, isMainTotal = false) => {
    const variation = totalN1 !== null ? totalN - totalN1 : null;
    const bgColor = isMainTotal ? (label.includes('ACTIF') ? 'bg-blue-100' : 'bg-purple-100') : 'bg-gray-50';
    const textColor = label.includes('ACTIF') ? 'text-blue-700' : 'text-purple-700';
    
    return (
      <tr className={`${bgColor} font-bold`}>
        <td colSpan={colSpan} className={`px-3 py-2 text-right ${textColor}`}>{label}</td>
        {showBilanN && (
          <td className={`px-3 py-2 text-right font-mono ${textColor}`}>
            {formatCurrencyNoDecimals(totalN)}
          </td>
        )}
        {showBilanN1 && parseResult2 && (
          <td className={`px-3 py-2 text-right font-mono ${textColor}`}>
            {totalN1 !== null ? formatCurrencyNoDecimals(totalN1) : '-'}
          </td>
        )}
        {showBilanComparaison && parseResult2 && (
          <td className={`px-3 py-2 text-right font-mono text-xs ${
            variation === null ? 'text-gray-400' : 
            (variation >= 0 ? 'text-green-600' : 'text-red-600')
          }`}>
            {variation !== null ? (
              <span className={variation >= 0 ? 'text-green-600' : 'text-red-600'}>
                {variation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(variation)}
              </span>
            ) : '-'}
          </td>
        )}
      </tr>
    );
  };

  // Fonction helper pour afficher une sous-rubrique
  const renderSubRubrique = (label, items, totalN, totalN1) => {
    if (!items || items.length === 0) return null;
    
    const findItemN1 = (item) => {
      return bilanN1?.actif?.immobilise?.find(i => i.classe === item.classe) ||
             bilanN1?.actif?.circulant?.stocks?.find(i => i.classe === item.classe) ||
             bilanN1?.actif?.circulant?.creances?.find(i => i.classe === item.classe) ||
             bilanN1?.actif?.circulant?.tresorerie?.find(i => i.classe === item.classe) ||
             bilanN1?.passif?.capitauxPropres?.find(i => i.classe === item.classe) ||
             bilanN1?.passif?.dettes?.find(i => i.classe === item.classe);
    };

    const determineType = (item) => {
      const classe = item.classe || '';
      return (classe.startsWith('2') || classe.startsWith('3') || classe.startsWith('5') || ['41', '42', '43', '45', '46', '47', '48'].includes(classe)) ? 'actif' : 'passif';
    };
    
    return (
      <>
        <tr className="bg-gray-100 font-semibold">
          <td colSpan={2 + (showBilanN ? 1 : 0) + (showBilanN1 && parseResult2 ? 1 : 0) + (showBilanComparaison && parseResult2 ? 1 : 0)} className="px-3 py-1 text-left text-gray-700">{label}</td>
        </tr>
        {items.map((item, idx) => {
          const itemN1 = findItemN1(item);
          const itemVariation = itemN1 ? item.solde - itemN1.solde : null;
          const itemType = determineType(item);

          return (
            <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-1 font-mono text-xs pl-6">{item.classe}</td>
              <td 
                className="px-3 py-1 cursor-pointer hover:text-indigo-600 hover:underline transition-colors pl-6"
                onClick={() => setSelectedClasse(selectedClasse?.type === itemType && selectedClasse?.classe === item.classe ? null : { type: itemType, classe: item.classe })}
                title="Cliquez pour voir le détail par compte"
              >
                {item.libelle}
              </td>
              {showBilanN && (
                <td className="px-3 py-1 text-right font-mono text-xs">
                  {formatCurrencyNoDecimals(item.solde)}
                </td>
              )}
              {showBilanN1 && parseResult2 && (
                <td className="px-3 py-1 text-right font-mono text-xs">
                  {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                </td>
              )}
              {showBilanComparaison && parseResult2 && (
                <td className={`px-3 py-1 text-right font-mono text-xs ${
                  itemVariation === null ? 'text-gray-400' : 
                  (itemVariation >= 0 ? 'text-green-600' : 'text-red-600')
                }`}>
                  {itemVariation !== null ? (
                    <>
                      {itemVariation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(itemVariation)}
                    </>
                  ) : '-'}
                </td>
              )}
            </tr>
          );
        })}
        {renderTotalRow(`Total ${label}`, totalN, totalN1, 2, false)}
      </>
    );
  };

  const colSpanHeader = 2 + (showBilanN ? 1 : 0) + (showBilanN1 && parseResult2 ? 1 : 0) + (showBilanComparaison && parseResult2 ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <BarChart3 size={20} />
          Bilan Comptable
        </h4>
        {/* Checkboxes pour sélectionner les colonnes à afficher */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBilanN}
              onChange={(e) => {
                if (setShowBilanN) setShowBilanN(e.target.checked);
              }}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">N</span>
          </label>
          {parseResult2 && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBilanN1}
                  onChange={(e) => {
                    if (setShowBilanN1) setShowBilanN1(e.target.checked);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">N-1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBilanComparaison}
                  onChange={(e) => {
                    if (setShowBilanComparaison) setShowBilanComparaison(e.target.checked);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Var</span>
              </label>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actif */}
        <div>
          <h5 className="font-bold text-blue-700 mb-3 text-center bg-blue-50 py-2 rounded">ACTIF</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Classe</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé</th>
                  {showBilanN && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">N</th>
                  )}
                  {showBilanN1 && parseResult2 && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">N-1</th>
                  )}
                  {showBilanComparaison && parseResult2 && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Var</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* ACTIF IMMOBILISÉ */}
                <tr className="bg-blue-50 font-bold">
                  <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-blue-800">I - ACTIF IMMOBILISÉ</td>
                </tr>
                {bilanN.actif.immobilise && bilanN.actif.immobilise.map((item, idx) => {
                  const itemN1 = bilanN1?.actif?.immobilise?.find(i => i.classe === item.classe);
                  const itemVariation = itemN1 ? item.solde - itemN1.solde : null;

                  return (
                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-1 font-mono text-xs pl-6">{item.classe}</td>
                      <td 
                        className="px-3 py-1 cursor-pointer hover:text-indigo-600 hover:underline transition-colors pl-6"
                        onClick={() => setSelectedClasse(selectedClasse?.type === 'actif' && selectedClasse?.classe === item.classe ? null : { type: 'actif', classe: item.classe })}
                        title="Cliquez pour voir le détail par compte"
                      >
                        {item.libelle}
                      </td>
                      {showBilanN && (
                        <td className="px-3 py-1 text-right font-mono text-xs">{formatCurrencyNoDecimals(item.solde)}</td>
                      )}
                      {showBilanN1 && parseResult2 && (
                        <td className="px-3 py-1 text-right font-mono text-xs">
                          {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                        </td>
                      )}
                      {showBilanComparaison && parseResult2 && (
                        <td className={`px-3 py-1 text-right font-mono text-xs ${
                          itemVariation === null ? 'text-gray-400' : 
                          (itemVariation >= 0 ? 'text-green-600' : 'text-red-600')
                        }`}>
                          {itemVariation !== null ? (itemVariation >= 0 ? '+' : '') + formatCurrencyNoDecimals(itemVariation) : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {renderTotalRow('Total I - ACTIF IMMOBILISÉ', bilanN.actif.totalImmobilise, bilanN1?.actif?.totalImmobilise, 2, false)}

                {/* ACTIF CIRCULANT */}
                <tr className="bg-blue-50 font-bold">
                  <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-blue-800">II - ACTIF CIRCULANT</td>
                </tr>
                
                {/* Stocks */}
                {renderSubRubrique('A - Stocks', bilanN.actif.circulant?.stocks, bilanN.actif.totalStocks, bilanN1?.actif?.totalStocks)}
                
                {/* Créances */}
                {renderSubRubrique('B - Créances', bilanN.actif.circulant?.creances, bilanN.actif.totalCreances, bilanN1?.actif?.totalCreances)}
                
                {/* Trésorerie */}
                {renderSubRubrique('C - Trésorerie', bilanN.actif.circulant?.tresorerie, bilanN.actif.totalTresorerie, bilanN1?.actif?.totalTresorerie)}
                
                {renderTotalRow('Total II - ACTIF CIRCULANT', bilanN.actif.totalCirculant, bilanN1?.actif?.totalCirculant, 2, false)}
                
                {/* Total Actif */}
                {renderTotalRow('TOTAL ACTIF', bilanN.actif.total, bilanN1?.actif?.total, 2, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Passif */}
        <div>
          <h5 className="font-bold text-purple-700 mb-3 text-center bg-purple-50 py-2 rounded">PASSIF</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Classe</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé</th>
                  {showBilanN && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">N</th>
                  )}
                  {showBilanN1 && parseResult2 && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">N-1</th>
                  )}
                  {showBilanComparaison && parseResult2 && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Var</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* CAPITAUX PROPRES */}
                <tr className="bg-purple-50 font-bold">
                  <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">I - CAPITAUX PROPRES / FINANCEMENT PERMANENT</td>
                </tr>
                {bilanN.passif.capitauxPropres && bilanN.passif.capitauxPropres.map((item, idx) => {
                  const itemN1 = bilanN1?.passif?.capitauxPropres?.find(i => i.classe === item.classe);
                  const itemVariation = itemN1 ? item.solde - itemN1.solde : null;

                  return (
                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-1 font-mono text-xs pl-6">{item.classe}</td>
                      <td 
                        className="px-3 py-1 cursor-pointer hover:text-indigo-600 hover:underline transition-colors pl-6"
                        onClick={() => setSelectedClasse(selectedClasse?.type === 'passif' && selectedClasse?.classe === item.classe ? null : { type: 'passif', classe: item.classe })}
                        title="Cliquez pour voir le détail par compte"
                      >
                        {item.libelle}
                      </td>
                      {showBilanN && (
                        <td className="px-3 py-1 text-right font-mono text-xs">{formatCurrencyNoDecimals(item.solde)}</td>
                      )}
                      {showBilanN1 && parseResult2 && (
                        <td className="px-3 py-1 text-right font-mono text-xs">
                          {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                        </td>
                      )}
                      {showBilanComparaison && parseResult2 && (
                        <td className={`px-3 py-1 text-right font-mono text-xs ${
                          itemVariation === null ? 'text-gray-400' : 
                          (itemVariation >= 0 ? 'text-green-600' : 'text-red-600')
                        }`}>
                          {itemVariation !== null ? (itemVariation >= 0 ? '+' : '') + formatCurrencyNoDecimals(itemVariation) : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {renderTotalRow('Total I - CAPITAUX PROPRES', bilanN.passif.totalCapitauxPropres, bilanN1?.passif?.totalCapitauxPropres, 2, false)}

                {/* PASSIF CIRCULANT */}
                <tr className="bg-purple-50 font-bold">
                  <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">II - PASSIF CIRCULANT</td>
                </tr>
                
                {/* Dettes */}
                {renderSubRubrique('A - Dettes', bilanN.passif.dettes, bilanN.passif.totalDettes, bilanN1?.passif?.totalDettes)}
                
                {renderTotalRow('Total II - PASSIF CIRCULANT', bilanN.passif.totalDettes, bilanN1?.passif?.totalDettes, 2, false)}
                
                {/* Total Passif */}
                {renderTotalRow('TOTAL PASSIF', bilanN.passif.total, bilanN1?.passif?.total, 2, true)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Détail par compte pour une classe sélectionnée */}
      {selectedClasse && (selectedClasse.type === 'actif' || selectedClasse.type === 'passif') && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-800">
              Détail par compte: {selectedClasse.type === 'actif' ? 'Actif' : 'Passif'} - Classe {selectedClasse.classe}
              {bilanN && (
                <span className="ml-2 text-gray-600">
                  ({selectedClasse.type === 'actif' 
                    ? (bilanN.actif.immobilise?.find(a => a.classe === selectedClasse.classe)?.libelle ||
                       bilanN.actif.circulant?.stocks?.find(a => a.classe === selectedClasse.classe)?.libelle ||
                       bilanN.actif.circulant?.creances?.find(a => a.classe === selectedClasse.classe)?.libelle ||
                       bilanN.actif.circulant?.tresorerie?.find(a => a.classe === selectedClasse.classe)?.libelle)
                    : (bilanN.passif.capitauxPropres?.find(p => p.classe === selectedClasse.classe)?.libelle ||
                       bilanN.passif.dettes?.find(p => p.classe === selectedClasse.classe)?.libelle)})
                </span>
              )}
            </h4>
            <button
              onClick={() => setSelectedClasse(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle size={20} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Débit</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Crédit</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde</th>
                </tr>
              </thead>
              <tbody>
                {getBilanDetails(selectedClasse.type, selectedClasse.classe).map((account, idx) => (
                  <tr key={idx} className="border-t border-gray-200 hover:bg-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                    <td className="px-3 py-2">{account.compteLibelle}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {account.totalDebit > 0 ? formatCurrency(account.totalDebit) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {account.totalCredit > 0 ? formatCurrency(account.totalCredit) : '-'}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-bold ${
                      selectedClasse.type === 'actif' 
                        ? 'text-blue-600' 
                        : 'text-purple-600'
                    }`}>
                      {formatCurrency(account.solde)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan="2" className="px-3 py-2 text-right">Total:</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(
                      getBilanDetails(selectedClasse.type, selectedClasse.classe).reduce((sum, acc) => sum + acc.totalDebit, 0)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(
                      getBilanDetails(selectedClasse.type, selectedClasse.classe).reduce((sum, acc) => sum + acc.totalCredit, 0)
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${
                    selectedClasse.type === 'actif' 
                      ? 'text-blue-700' 
                      : 'text-purple-700'
                  }`}>
                    {formatCurrency(
                      getBilanDetails(selectedClasse.type, selectedClasse.classe).reduce((sum, acc) => sum + acc.solde, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BilanView;

