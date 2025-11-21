import React from 'react';
import { BarChart3, XCircle } from 'lucide-react';
import { formatCurrency, formatCurrencyNoDecimals } from '../utils/formatters';

const BilanView = ({
  generateBilan,
  parseResult1,
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
             bilanN1?.passif?.provisions?.find(i => i.classe === item.classe) ||
             bilanN1?.passif?.dettesLongTerme?.find(i => i.classe === item.classe) ||
             bilanN1?.passif?.dettesCourtTerme?.find(i => i.classe === item.classe) ||
             bilanN1?.passif?.tresorerie?.find(i => i.classe === item.classe);
    };

    const determineType = (item) => {
      const classe = item.classe || '';
      return (classe.startsWith('2') || classe.startsWith('3') || classe.startsWith('5') || ['41', '42', '43', '45', '46', '47', '48'].includes(classe)) ? 'actif' : 'passif';
    };
    
    return (
      <>
        <tr className="bg-gray-100 font-semibold">
          <td colSpan={colSpanHeader} className="px-3 py-1 text-left text-gray-700">{label}</td>
        </tr>
        {items.map((item, idx) => {
          const itemN1 = findItemN1(item);
          const itemNet = item.net !== undefined ? item.net : (item.solde || 0);
          const itemNetN1 = itemN1 ? (itemN1.net !== undefined ? itemN1.net : (itemN1.solde || 0)) : 0;
          const itemVariation = itemN1 ? itemNet - itemNetN1 : null;
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
                <td className="px-3 py-1 text-right font-mono text-xs font-bold">
                  {formatCurrencyNoDecimals(itemNet)}
                </td>
              )}
              {showBilanN1 && parseResult2 && (
                <td className="px-3 py-1 text-right font-mono text-xs font-bold">
                  {itemN1 ? formatCurrencyNoDecimals(itemNetN1) : '-'}
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
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Net</th>
                  )}
                  {showBilanN1 && parseResult2 && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Net N-1</th>
                  )}
                  {showBilanComparaison && parseResult2 && (
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Var Net</th>
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
                  const net = item.net !== undefined ? item.net : item.solde;
                  const netN1 = itemN1?.net !== undefined ? itemN1.net : (itemN1?.solde || 0);
                  const itemVariation = itemN1 ? net - netN1 : null;

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
                        <td className="px-3 py-1 text-right font-mono text-xs font-bold">{formatCurrencyNoDecimals(net)}</td>
                      )}
                      {showBilanN1 && parseResult2 && (
                        <td className="px-3 py-1 text-right font-mono text-xs font-bold">
                          {itemN1 ? formatCurrencyNoDecimals(netN1) : '-'}
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
                  <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">I - CAPITAUX PROPRES</td>
                </tr>
                {bilanN.passif.capitauxPropres && bilanN.passif.capitauxPropres.map((item, idx) => {
                  const itemN1 = bilanN1?.passif?.capitauxPropres?.find(i => i.classe === item.classe);
                  const itemNet = item.net !== undefined ? item.net : (item.solde || 0);
                  const itemNetN1 = itemN1 ? (itemN1.net !== undefined ? itemN1.net : (itemN1.solde || 0)) : 0;
                  const itemVariation = itemN1 ? itemNet - itemNetN1 : null;

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
                        <td className="px-3 py-1 text-right font-mono text-xs">{formatCurrencyNoDecimals(itemNet)}</td>
                      )}
                      {showBilanN1 && parseResult2 && (
                        <td className="px-3 py-1 text-right font-mono text-xs">
                          {itemN1 ? formatCurrencyNoDecimals(itemNetN1) : '-'}
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

                {/* PROVISIONS */}
                {bilanN.passif.provisions && bilanN.passif.provisions.length > 0 && (
                  <>
                    <tr className="bg-purple-50 font-bold">
                      <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">I bis - PROVISIONS</td>
                    </tr>
                    {bilanN.passif.provisions.map((item, idx) => {
                      const itemN1 = bilanN1?.passif?.provisions?.find(i => i.classe === item.classe);
                      const itemNet = item.net !== undefined ? item.net : (item.solde || 0);
                      const itemNetN1 = itemN1 ? (itemN1.net !== undefined ? itemN1.net : (itemN1.solde || 0)) : 0;
                      const itemVariation = itemN1 ? itemNet - itemNetN1 : null;

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
                            <td className="px-3 py-1 text-right font-mono text-xs">{formatCurrencyNoDecimals(itemNet)}</td>
                          )}
                          {showBilanN1 && parseResult2 && (
                            <td className="px-3 py-1 text-right font-mono text-xs">
                              {itemN1 ? formatCurrencyNoDecimals(itemNetN1) : '-'}
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
                    {renderTotalRow('Total I bis - PROVISIONS', bilanN.passif.totalProvisions || 0, bilanN1?.passif?.totalProvisions || 0, 2, false)}
                  </>
                )}

                {/* DETTES FINANCIÈRES (LONG TERME) */}
                <tr className="bg-purple-50 font-bold">
                  <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">II - DETTES FINANCIÈRES</td>
                </tr>
                {bilanN.passif.dettesLongTerme && bilanN.passif.dettesLongTerme.length > 0 ? bilanN.passif.dettesLongTerme.map((item, idx) => {
                  const itemN1 = bilanN1?.passif?.dettesLongTerme?.find(i => i.classe === item.classe);
                  const itemNet = item.net !== undefined ? item.net : (item.solde || 0);
                  const itemNetN1 = itemN1 ? (itemN1.net !== undefined ? itemN1.net : (itemN1.solde || 0)) : 0;
                  const itemVariation = itemN1 ? itemNet - itemNetN1 : null;

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
                        <td className="px-3 py-1 text-right font-mono text-xs">{formatCurrencyNoDecimals(itemNet)}</td>
                      )}
                      {showBilanN1 && parseResult2 && (
                        <td className="px-3 py-1 text-right font-mono text-xs">
                          {itemN1 ? formatCurrencyNoDecimals(itemNetN1) : '-'}
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
                }) : (
                  <tr>
                    <td colSpan={colSpanHeader} className="px-3 py-1 text-gray-400 italic text-sm pl-6">Aucune dette financière</td>
                  </tr>
                )}
                {renderTotalRow('Total II - DETTES FINANCIÈRES', bilanN.passif.totalDettesLongTerme || 0, bilanN1?.passif?.totalDettesLongTerme || 0, 2, false)}

                {/* PASSIF CIRCULANT */}
                <tr className="bg-purple-50 font-bold">
                  <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">III - PASSIF CIRCULANT</td>
                </tr>
                
                {/* Dettes à court terme */}
                {bilanN.passif.dettesCourtTerme && bilanN.passif.dettesCourtTerme.length > 0 ? (
                  renderSubRubrique('A - Dettes', bilanN.passif.dettesCourtTerme, bilanN.passif.totalDettesCourtTerme || 0, bilanN1?.passif?.totalDettesCourtTerme || 0)
                ) : (
                  <>
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={colSpanHeader} className="px-3 py-1 text-left text-gray-700">A - Dettes</td>
                    </tr>
                    <tr>
                      <td colSpan={colSpanHeader} className="px-3 py-1 text-gray-400 italic text-sm pl-6">Aucune dette à court terme</td>
                    </tr>
                    {renderTotalRow('Total A - Dettes', 0, 0, 2, false)}
                  </>
                )}
                
                {/* Trésorerie passive */}
                {bilanN.passif.tresorerie && bilanN.passif.tresorerie.length > 0 && (
                  renderSubRubrique('B - Trésorerie passive', bilanN.passif.tresorerie, bilanN.passif.totalTresorerie || 0, bilanN1?.passif?.totalTresorerie || 0)
                )}
                
                {renderTotalRow('Total III - PASSIF CIRCULANT', bilanN.passif.totalPassifCirculant || 0, bilanN1?.passif?.totalPassifCirculant || 0, 2, false)}
                
                {/* Total Passif */}
                {renderTotalRow('TOTAL PASSIF', bilanN.passif.total, bilanN1?.passif?.total, 2, true)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Détail par compte pour une classe sélectionnée */}
      {selectedClasse && (selectedClasse.type === 'actif' || selectedClasse.type === 'passif') && (() => {
        // Trouver l'item correspondant à la classe sélectionnée
        let selectedItem = null;
        let selectedLibelle = '';
        
        if (selectedClasse.type === 'actif' && bilanN?.actif) {
          selectedItem = 
            bilanN.actif.immobilise?.find(a => a.classe === selectedClasse.classe) ||
            bilanN.actif.circulant?.stocks?.find(a => a.classe === selectedClasse.classe) ||
            bilanN.actif.circulant?.creances?.find(a => a.classe === selectedClasse.classe) ||
            bilanN.actif.circulant?.tresorerie?.find(a => a.classe === selectedClasse.classe) ||
            bilanN.actif.regularisation?.find(a => a.classe === selectedClasse.classe);
          
          if (selectedItem) {
            selectedLibelle = selectedItem.libelle || '';
          }
        } else if (selectedClasse.type === 'passif' && bilanN?.passif) {
          selectedItem = 
            bilanN.passif.capitauxPropres?.find(p => p.classe === selectedClasse.classe) ||
            bilanN.passif.provisions?.find(p => p.classe === selectedClasse.classe) ||
            bilanN.passif.dettesLongTerme?.find(p => p.classe === selectedClasse.classe) ||
            bilanN.passif.dettesCourtTerme?.find(p => p.classe === selectedClasse.classe) ||
            bilanN.passif.tresorerie?.find(p => p.classe === selectedClasse.classe) ||
            bilanN.passif.regularisation?.find(p => p.classe === selectedClasse.classe);
          
          if (selectedItem) {
            selectedLibelle = selectedItem.libelle || '';
          }
        }
        
        // Vérifier si c'est une classe d'immobilisation
        const isImmobilisation = ['20', '21', '22', '23', '26', '27'].includes(selectedClasse.classe);
        
        // Utiliser UNIQUEMENT les comptes de selectedItem (source unique)
        let detailComptes = selectedItem?.comptes || [];
        
        // Les comptes viennent maintenant directement de BilanGenerator avec toutes les infos
        // Structure : { compteNum, compteLibelle, totalDebit, totalCredit, solde, montant, type }
        // Pour les immobilisations : { ..., brut, amortissements, net, vetuste }
        
        // Filtrage pour les comptes à double position selon le type
        const isDoublePosition = ['41', '44', '40', '42', '43', '45', '46', '47', '48'].includes(selectedClasse.classe);
        if (isDoublePosition && detailComptes.length > 0) {
          // Les comptes ont déjà une propriété 'type' définie par BilanGenerator
          // Filtrer selon cette propriété
          detailComptes = detailComptes.filter(compte => compte.type === selectedClasse.type);
        }
        
        if (detailComptes.length === 0) {
          return (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-800">
                  Détail par compte: {selectedClasse.type === 'actif' ? 'Actif' : 'Passif'} - Classe {selectedClasse.classe}
                  {selectedLibelle && (
                    <span className="ml-2 text-gray-600">({selectedLibelle})</span>
                  )}
                </h4>
                <button
                  onClick={() => setSelectedClasse(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle size={20} />
                </button>
              </div>
              <div className="text-center text-gray-500 py-8">
                Aucun compte trouvé pour cette classe
              </div>
            </div>
          );
        }
        
        // Calculer les totaux depuis les comptes
        const totalDebit = detailComptes.reduce((sum, acc) => sum + (acc.totalDebit || 0), 0);
        const totalCredit = detailComptes.reduce((sum, acc) => sum + (acc.totalCredit || 0), 0);
        const totalSolde = detailComptes.reduce((sum, acc) => sum + (acc.solde || 0), 0);
        
        // Pour les immobilisations, les totaux sont déjà calculés
        const totalBrut = isImmobilisation ? detailComptes.reduce((sum, acc) => sum + (acc.brut || 0), 0) : 0;
        const totalAmortissements = isImmobilisation ? detailComptes.reduce((sum, acc) => sum + (acc.amortissements || 0), 0) : 0;
        const totalNet = isImmobilisation ? detailComptes.reduce((sum, acc) => sum + (acc.net || 0), 0) : totalSolde;
        const totalVetuste = isImmobilisation && totalBrut > 0 ? (totalAmortissements / totalBrut) * 100 : 0;
        
        return (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-800">
                Détail par compte: {selectedClasse.type === 'actif' ? 'Actif' : 'Passif'} - Classe {selectedClasse.classe}
                {selectedLibelle && (
                  <span className="ml-2 text-gray-600">({selectedLibelle})</span>
                )}
              </h4>
              <button
                onClick={() => setSelectedClasse(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            {/* Vérification de cohérence */}
            {selectedItem && Math.abs(totalNet - (selectedItem.net !== undefined ? selectedItem.net : selectedItem.solde || 0)) > 0.01 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                ⚠️ Attention : La somme des comptes individuels ({formatCurrency(totalNet)}) ne correspond pas exactement au {isImmobilisation ? 'net' : 'solde'} du groupe ({formatCurrency(selectedItem.net !== undefined ? selectedItem.net : selectedItem.solde || 0)}).
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                    {isImmobilisation ? (
                      <>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Brut</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Amortissements</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Net</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">% Vétusté</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Débit</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Crédit</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {detailComptes.map((account, idx) => (
                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                      <td className="px-3 py-2">{account.compteLibelle || account.compteNum}</td>
                      {isImmobilisation ? (
                        <>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatCurrency(account.brut || 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-red-600">
                            {formatCurrency(account.amortissements || 0)}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${
                            selectedClasse.type === 'actif' 
                              ? 'text-blue-600' 
                              : 'text-purple-600'
                          }`}>
                            {formatCurrency(account.net || 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                            {account.brut > 0 ? `${account.vetuste?.toFixed(2) || 0}%` : '-'}
                          </td>
                        </>
                      ) : (
                        <>
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
                            {formatCurrency(account.solde || 0)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan="2" className="px-3 py-2 text-right">Total:</td>
                    {isImmobilisation ? (
                      <>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(totalBrut)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">
                          {formatCurrency(totalAmortissements)}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${
                          selectedClasse.type === 'actif' 
                            ? 'text-blue-700' 
                            : 'text-purple-700'
                        }`}>
                          {formatCurrency(totalNet)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600">
                          {totalBrut > 0 ? `${totalVetuste.toFixed(2)}%` : '-'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(totalDebit)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(totalCredit)}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${
                          selectedClasse.type === 'actif' 
                            ? 'text-blue-700' 
                            : 'text-purple-700'
                        }`}>
                          {formatCurrency(totalSolde)}
                        </td>
                      </>
                    )}
                  </tr>
                  {selectedItem && (
                    <tr className="bg-indigo-50">
                      <td colSpan="2" className="px-3 py-2 text-right font-semibold text-indigo-800">
                        {isImmobilisation ? 'Net du groupe (affiché dans le bilan):' : 'Solde du groupe (affiché dans le bilan):'}
                      </td>
                      {isImmobilisation ? (
                        <>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${
                            selectedClasse.type === 'actif' 
                              ? 'text-blue-800' 
                              : 'text-purple-800'
                          }`}>
                            {formatCurrency(selectedItem.net !== undefined ? selectedItem.net : (selectedItem.solde || 0))}
                          </td>
                          <td className="px-3 py-2"></td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${
                            selectedClasse.type === 'actif' 
                              ? 'text-blue-800' 
                              : 'text-purple-800'
                          }`}>
                            {formatCurrency(selectedItem.solde || 0)}
                          </td>
                        </>
                      )}
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Fenêtre des comptes non affectés */}
      {bilanN?.validation?.comptesNonAffectes && bilanN.validation.comptesNonAffectes.length > 0 && (
        <div className="mt-6 p-6 bg-yellow-50 rounded-lg border-2 border-yellow-400 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
              <BarChart3 size={20} />
              Comptes non affectés ({bilanN.validation.comptesNonAffectes.length})
            </h4>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-yellow-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-yellow-900">Numéro de compte</th>
                    <th className="px-3 py-2 text-left font-semibold text-yellow-900">Libellé</th>
                    <th className="px-3 py-2 text-right font-semibold text-yellow-900">Débit</th>
                    <th className="px-3 py-2 text-right font-semibold text-yellow-900">Crédit</th>
                    <th className="px-3 py-2 text-right font-semibold text-yellow-900">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {bilanN.validation.comptesNonAffectes.map((compte, idx) => (
                    <tr key={idx} className="border-t border-yellow-200 hover:bg-yellow-50">
                      <td className="px-3 py-2 font-mono text-xs">{compte.compteNum}</td>
                      <td className="px-3 py-2">{compte.compteLibelle}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {compte.totalDebit > 0 ? formatCurrency(compte.totalDebit) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {compte.totalCredit > 0 ? formatCurrency(compte.totalCredit) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${
                        compte.solde > 0 ? 'text-blue-600' : compte.solde < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {formatCurrency(compte.solde)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-yellow-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan="2" className="px-3 py-2 text-right">Total:</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(
                        bilanN.validation.comptesNonAffectes.reduce((sum, acc) => sum + (acc.totalDebit || 0), 0)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(
                        bilanN.validation.comptesNonAffectes.reduce((sum, acc) => sum + (acc.totalCredit || 0), 0)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-yellow-900">
                      {formatCurrency(
                        bilanN.validation.comptesNonAffectes.reduce((sum, acc) => sum + (acc.solde || 0), 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="mt-4 text-sm text-yellow-700">
            <p className="font-semibold">Note :</p>
            <p>Ces comptes sont des comptes de bilan (classe 1-5) qui n'ont pas été affectés à l'actif ou au passif. 
            Cela peut être dû à un solde nul ou à un problème dans la logique d'affectation.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BilanView;