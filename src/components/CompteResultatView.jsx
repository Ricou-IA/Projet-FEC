import React from 'react';
import { BarChart3, XCircle } from 'lucide-react';
import { formatCurrency, formatCurrencyNoDecimals } from '../utils/formatters';
import reglesAffectation from '../data/regles-affectation-comptes.json';

const CompteResultatView = ({
  generateCompteResultat,
  parseResult2,
  showResultatN,
  setShowResultatN,
  showResultatN1,
  setShowResultatN1,
  showResultatComparaison,
  setShowResultatComparaison,
  selectedClasse,
  setSelectedClasse,
  getCompteResultatDetails
}) => {
  const compteResultatN = generateCompteResultat();
  const compteResultatN1 = parseResult2 ? generateCompteResultat(parseResult2) : null;

  // Debug: log pour voir ce qui est retourné
  console.log('CompteResultatView - compteResultatN:', compteResultatN);
  console.log('CompteResultatView - charges:', compteResultatN?.charges);
  console.log('CompteResultatView - produits:', compteResultatN?.produits);

  // Vérifications de sécurité
  if (!compteResultatN) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500 py-8">
          <p className="mb-2">Aucune donnée disponible</p>
          <p className="text-sm text-gray-400">
            Le générateur de compte de résultat a retourné null. 
            Vérifiez que votre fichier FEC contient des comptes de classe 6 (charges) et 7 (produits).
          </p>
        </div>
      </div>
    );
  }

  if (!compteResultatN.charges || !Array.isArray(compteResultatN.charges)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500 py-8">
          <p className="mb-2">Structure de données invalide - Charges</p>
          <p className="text-sm text-gray-400">
            Charges: {compteResultatN.charges ? typeof compteResultatN.charges : 'undefined'}
            {compteResultatN.charges && !Array.isArray(compteResultatN.charges) && 
              ` (type: ${typeof compteResultatN.charges})`}
          </p>
          <pre className="text-xs mt-2 text-left bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(compteResultatN, null, 2).substring(0, 500)}
          </pre>
        </div>
      </div>
    );
  }

  if (!compteResultatN.produits || !Array.isArray(compteResultatN.produits)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500 py-8">
          <p className="mb-2">Structure de données invalide - Produits</p>
          <p className="text-sm text-gray-400">
            Produits: {compteResultatN.produits ? typeof compteResultatN.produits : 'undefined'}
            {compteResultatN.produits && !Array.isArray(compteResultatN.produits) && 
              ` (type: ${typeof compteResultatN.produits})`}
          </p>
        </div>
      </div>
    );
  }

  // Utiliser les règles du JSON pour la classification
  const classification = {
    exploitation: {
      charges: reglesAffectation.categories.exploitation.charges || [],
      produits: reglesAffectation.categories.exploitation.produits || []
    },
    financier: {
      charges: reglesAffectation.categories.financier.charges || [],
      produits: reglesAffectation.categories.financier.produits || []
    },
    exceptionnel: {
      charges: reglesAffectation.categories.exceptionnel.charges || [],
      produits: reglesAffectation.categories.exceptionnel.produits || []
    }
  };

  // Fonction pour regrouper par catégorie
  const regrouperParCategorie = (items, type) => {
    if (!items || !Array.isArray(items)) {
      return {
        exploitation: [],
        financier: [],
        exceptionnel: []
      };
    }

    const result = {
      exploitation: [],
      financier: [],
      exceptionnel: []
    };

    const mapCategorieDirecte = (cat) => {
      if (!cat) return null;
      if (cat === 'exploitation') return 'exploitation';
      if (cat === 'financier' || cat === 'financiers' || cat === 'financieres') return 'financier';
      if (cat === 'exceptionnel' || cat === 'exceptionnels' || cat === 'exceptionnelles') return 'exceptionnel';
      return null;
    };

    items.forEach(item => {
      const classe = item.classe;
      const classeStr = String(classe || '');

      // Si la catégorie est déjà fournie par le générateur, l'utiliser en priorité
      const categorieDirecte = mapCategorieDirecte(item.categorie);
      if (categorieDirecte && result[categorieDirecte]) {
        result[categorieDirecte].push(item);
        return;
      }
      
      // Fonction helper pour vérifier si un compte correspond à un pattern
      const matchesPattern = (pattern) => {
        if (pattern.endsWith('x')) {
          return classeStr.startsWith(pattern.slice(0, -1));
        }
        return classeStr.startsWith(pattern);
      };
      
      const matchExploitation = classification.exploitation[type] && 
        classification.exploitation[type].some(pattern => matchesPattern(pattern));
      const matchFinancier = classification.financier[type] && 
        classification.financier[type].some(pattern => matchesPattern(pattern));
      const matchExceptionnel = classification.exceptionnel[type] && 
        classification.exceptionnel[type].some(pattern => matchesPattern(pattern));
      
      if (matchExploitation) {
        result.exploitation.push(item);
      } else if (matchFinancier) {
        result.financier.push(item);
      } else if (matchExceptionnel) {
        result.exceptionnel.push(item);
      }
    });

    return result;
  };

  const chargesN = regrouperParCategorie(compteResultatN.charges, 'charges');
  const produitsN = regrouperParCategorie(compteResultatN.produits, 'produits');
  const chargesN1 = compteResultatN1 ? regrouperParCategorie(compteResultatN1.charges || [], 'charges') : null;
  const produitsN1 = compteResultatN1 ? regrouperParCategorie(compteResultatN1.produits || [], 'produits') : null;

  // Calculer les totaux par catégorie
  const calculerTotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.solde || 0), 0);
  };

  const totauxChargesN = {
    exploitation: calculerTotal(chargesN.exploitation),
    financier: calculerTotal(chargesN.financier),
    exceptionnel: calculerTotal(chargesN.exceptionnel)
  };

  const totauxProduitsN = {
    exploitation: calculerTotal(produitsN.exploitation),
    financier: calculerTotal(produitsN.financier),
    exceptionnel: calculerTotal(produitsN.exceptionnel)
  };

  const totauxChargesN1 = chargesN1 ? {
    exploitation: calculerTotal(chargesN1.exploitation),
    financier: calculerTotal(chargesN1.financier),
    exceptionnel: calculerTotal(chargesN1.exceptionnel)
  } : null;

  const totauxProduitsN1 = produitsN1 ? {
    exploitation: calculerTotal(produitsN1.exploitation),
    financier: calculerTotal(produitsN1.financier),
    exceptionnel: calculerTotal(produitsN1.exceptionnel)
  } : null;

  // Calculer les résultats par catégorie
  const resultatsN = {
    exploitation: totauxProduitsN.exploitation - totauxChargesN.exploitation,
    financier: totauxProduitsN.financier - totauxChargesN.financier,
    exceptionnel: totauxProduitsN.exceptionnel - totauxChargesN.exceptionnel
  };

  const resultatsN1 = totauxProduitsN1 ? {
    exploitation: totauxProduitsN1.exploitation - totauxChargesN1.exploitation,
    financier: totauxProduitsN1.financier - totauxChargesN1.financier,
    exceptionnel: totauxProduitsN1.exceptionnel - totauxChargesN1.exceptionnel
  } : null;

  // Synthèse Résultat avant impôts et impôts (compte 695)
  const resultatAvantImpotN = resultatsN.exploitation + resultatsN.financier + resultatsN.exceptionnel;
  const resultatAvantImpotN1 = resultatsN1 
    ? resultatsN1.exploitation + resultatsN1.financier + resultatsN1.exceptionnel
    : null;

  const getChargeImpots = (compteResultat) => {
    if (!compteResultat?.charges) return 0;
    const chargeImpot = compteResultat.charges.find(item => String(item.classe || '').startsWith('69'));
    return chargeImpot?.solde || 0;
  };

  const chargeImpotsN = getChargeImpots(compteResultatN);
  const chargeImpotsN1 = compteResultatN1 ? getChargeImpots(compteResultatN1) : null;

  const resultatNetN = resultatAvantImpotN - chargeImpotsN;
  const resultatNetN1 = (resultatAvantImpotN1 !== null && chargeImpotsN1 !== null)
    ? resultatAvantImpotN1 - chargeImpotsN1
    : null;

  // Fonction pour afficher une section de catégorie avec total
  const renderCategorieSection = (titre, items, itemsN1, couleur, type, totalN, totalN1) => {
    if (!items || items.length === 0) {
      if (!itemsN1 || itemsN1.length === 0) {
        return null;
      }
    }

    const variation = totalN1 !== null ? totalN - totalN1 : null;
    const variationPercent = totalN1 !== null && totalN1 !== 0 
      ? ((totalN - totalN1) / Math.abs(totalN1)) * 100 
      : null;

    return (
      <div className="flex flex-col h-full">
        <div className={`${couleur} px-3 py-2 mb-2 rounded font-bold text-sm`}>
          {titre}
        </div>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700">Classe</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700">Libellé</th>
                  {showResultatN && (
                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N</th>
                  )}
                  {showResultatN1 && parseResult2 && (
                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N-1</th>
                  )}
                  {showResultatComparaison && parseResult2 && (
                    <th className="px-2 py-1 text-right font-semibold text-gray-700">Var</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const itemN1 = itemsN1?.find(i => i.classe === item.classe);
                  const itemVariation = itemN1 ? item.solde - itemN1.solde : null;
                  const itemVariationPercent = itemN1 && itemN1.solde !== 0 
                    ? ((item.solde - itemN1.solde) / Math.abs(itemN1.solde)) * 100 
                    : null;

                  return (
                    <tr 
                      key={idx} 
                      className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedClasse(selectedClasse?.type === type && selectedClasse?.classe === item.classe ? null : { type, classe: item.classe })}
                      title="Cliquez pour voir le détail des comptes"
                    >
                      <td className="px-2 py-1 font-mono text-xs">{item.classe}</td>
                      <td className="px-2 py-1 hover:text-indigo-600 transition-colors text-xs">
                        {item.libelle}
                      </td>
                      {showResultatN && (
                        <td className={`px-2 py-1 text-right font-mono text-xs font-bold ${
                          type === 'charge' ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {formatCurrencyNoDecimals(item.solde)}
                        </td>
                      )}
                      {showResultatN1 && parseResult2 && (
                        <td className={`px-2 py-1 text-right font-mono text-xs ${
                          type === 'charge' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                        </td>
                      )}
                      {showResultatComparaison && parseResult2 && (
                        <td className={`px-2 py-1 text-right font-mono text-xs ${
                          itemVariation === null ? 'text-gray-400' : 
                          (type === 'charge' ? (itemVariation >= 0 ? 'text-red-600' : 'text-green-600') : 
                           (itemVariation >= 0 ? 'text-green-600' : 'text-red-600'))
                        }`}>
                          {itemVariation !== null ? (
                            <>
                              {itemVariation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(itemVariation)}
                              {itemVariationPercent !== null && (
                                <span className="ml-1">
                                  ({itemVariationPercent >= 0 ? '+' : ''}{itemVariationPercent.toFixed(1)}%)
                                </span>
                              )}
                            </>
                          ) : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Total aligné en bas */}
          <div className={`${couleur.replace('50', '100')} font-bold mt-auto`}>
            <table className="w-full text-xs">
              <tfoot>
                <tr>
                  <td colSpan={showResultatN ? (showResultatN1 && parseResult2 ? (showResultatComparaison && parseResult2 ? 5 : 4) : 3) : 2} className="px-2 py-2 text-right text-xs">
                    Total {titre}:
                  </td>
                  {showResultatN && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      type === 'charge' ? 'text-red-800' : 'text-green-800'
                    }`}>
                      {formatCurrencyNoDecimals(totalN)}
                    </td>
                  )}
                  {showResultatN1 && parseResult2 && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      type === 'charge' ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {formatCurrencyNoDecimals(totalN1 || 0)}
                    </td>
                  )}
                  {showResultatComparaison && parseResult2 && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      variation === null ? 'text-gray-400' : 
                      (type === 'charge' ? (variation >= 0 ? 'text-red-600' : 'text-green-600') : 
                       (variation >= 0 ? 'text-green-600' : 'text-red-600'))
                    }`}>
                      {variation !== null ? (
                        <>
                          {variation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(variation)}
                          {variationPercent !== null && (
                            <span className="ml-1">
                              ({variationPercent >= 0 ? '+' : ''}{variationPercent.toFixed(1)}%)
                            </span>
                          )}
                        </>
                      ) : '-'}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Fonction pour rendre une section de résultat
  const renderResultatSection = (titre, couleur, totalProduitsN, totalChargesN, totalProduitsN1, totalChargesN1, resultatN, resultatN1) => {
    return (
      <div className="flex flex-col h-full">
        <div className={`${couleur} px-3 py-2 mb-2 rounded font-bold text-sm`}>
          {titre}
        </div>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700">Libellé</th>
                  {showResultatN && (
                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N</th>
                  )}
                  {showResultatN1 && parseResult2 && (
                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N-1</th>
                  )}
                  {showResultatComparaison && parseResult2 && (
                    <th className="px-2 py-1 text-right font-semibold text-gray-700">Var</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-2 text-xs">Produits</td>
                  {showResultatN && (
                    <td className="px-2 py-2 text-right font-mono text-xs text-green-700">
                      {formatCurrencyNoDecimals(totalProduitsN)}
                    </td>
                  )}
                  {showResultatN1 && parseResult2 && (
                    <td className="px-2 py-2 text-right font-mono text-xs text-green-600">
                      {formatCurrencyNoDecimals(totalProduitsN1 || 0)}
                    </td>
                  )}
                  {showResultatComparaison && parseResult2 && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      ((totalProduitsN - (totalProduitsN1 || 0)) >= 0) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {((totalProduitsN - (totalProduitsN1 || 0)) >= 0) ? '+' : ''}
                      {formatCurrencyNoDecimals(totalProduitsN - (totalProduitsN1 || 0))}
                    </td>
                  )}
                </tr>
                <tr>
                  <td className="px-2 py-2 text-xs">Charges</td>
                  {showResultatN && (
                    <td className="px-2 py-2 text-right font-mono text-xs text-red-700">
                      {formatCurrencyNoDecimals(totalChargesN)}
                    </td>
                  )}
                  {showResultatN1 && parseResult2 && (
                    <td className="px-2 py-2 text-right font-mono text-xs text-red-600">
                      {formatCurrencyNoDecimals(totalChargesN1 || 0)}
                    </td>
                  )}
                  {showResultatComparaison && parseResult2 && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      ((totalChargesN - (totalChargesN1 || 0)) >= 0) ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {((totalChargesN - (totalChargesN1 || 0)) >= 0) ? '+' : ''}
                      {formatCurrencyNoDecimals(totalChargesN - (totalChargesN1 || 0))}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
          {/* Résultat aligné en bas */}
          <div className={`${couleur.replace('50', '100')} font-bold mt-auto`}>
            <table className="w-full text-xs">
              <tfoot>
                <tr>
                  <td className="px-2 py-2 text-right text-xs">Résultat:</td>
                  {showResultatN && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      resultatN >= 0 ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {formatCurrencyNoDecimals(resultatN)}
                    </td>
                  )}
                  {showResultatN1 && parseResult2 && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      (resultatN1 || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatCurrencyNoDecimals(resultatN1 || 0)}
                    </td>
                  )}
                  {showResultatComparaison && parseResult2 && (
                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                      ((resultatN - (resultatN1 || 0)) >= 0) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {((resultatN - (resultatN1 || 0)) >= 0) ? '+' : ''}
                      {formatCurrencyNoDecimals(resultatN - (resultatN1 || 0))}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Vérifier s'il y a des données à afficher
  const hasExploitationData = (chargesN.exploitation && chargesN.exploitation.length > 0) || 
                            (produitsN.exploitation && produitsN.exploitation.length > 0) ||
                            (chargesN1?.exploitation && chargesN1.exploitation.length > 0) ||
                            (produitsN1?.exploitation && produitsN1.exploitation.length > 0);
  
  const hasFinancierData = (chargesN.financier && chargesN.financier.length > 0) || 
                          (produitsN.financier && produitsN.financier.length > 0) ||
                          (chargesN1?.financier && chargesN1.financier.length > 0) ||
                          (produitsN1?.financier && produitsN1.financier.length > 0);
  
  const hasExceptionnelData = (chargesN.exceptionnel && chargesN.exceptionnel.length > 0) || 
                             (produitsN.exceptionnel && produitsN.exceptionnel.length > 0) ||
                             (chargesN1?.exceptionnel && chargesN1.exceptionnel.length > 0) ||
                             (produitsN1?.exceptionnel && produitsN1.exceptionnel.length > 0);

  // Si aucune donnée, afficher un message avec plus de détails
  if (!hasExploitationData && !hasFinancierData && !hasExceptionnelData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500 py-8">
          <p className="mb-2">Aucune donnée de compte de résultat trouvée.</p>
          <p className="text-sm">Vérifiez que votre fichier FEC contient des comptes de classe 6 (charges) et 7 (produits).</p>
          <p className="text-xs mt-2 text-gray-400">
            Charges trouvées: {compteResultatN.charges?.length || 0}, Produits trouvées: {compteResultatN.produits?.length || 0}
          </p>
          {compteResultatN.charges && compteResultatN.charges.length > 0 && (
            <div className="mt-4 text-left bg-gray-100 p-3 rounded text-xs">
              <p className="font-semibold mb-1">Exemples de charges trouvées:</p>
              <ul className="list-disc list-inside">
                {compteResultatN.charges.slice(0, 5).map((c, i) => (
                  <li key={i}>{c.classe} - {c.libelle} ({c.solde?.toFixed(2) || 0} €)</li>
                ))}
              </ul>
            </div>
          )}
          {compteResultatN.produits && compteResultatN.produits.length > 0 && (
            <div className="mt-4 text-left bg-gray-100 p-3 rounded text-xs">
              <p className="font-semibold mb-1">Exemples de produits trouvés:</p>
              <ul className="list-disc list-inside">
                {compteResultatN.produits.slice(0, 5).map((p, i) => (
                  <li key={i}>{p.classe} - {p.libelle} ({p.solde?.toFixed(2) || 0} €)</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <BarChart3 size={20} />
          Compte de Résultat
        </h4>
        {/* Checkboxes pour sélectionner les colonnes à afficher */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showResultatN}
              onChange={(e) => {
                if (setShowResultatN) setShowResultatN(e.target.checked);
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
                  checked={showResultatN1}
                  onChange={(e) => {
                    if (setShowResultatN1) setShowResultatN1(e.target.checked);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">N-1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResultatComparaison}
                  onChange={(e) => {
                    if (setShowResultatComparaison) setShowResultatComparaison(e.target.checked);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Comparaison</span>
              </label>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* En-têtes des colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <h5 className="font-bold text-red-700 mb-3 text-center bg-red-50 py-2 rounded">CHARGES</h5>
          </div>
          <div>
            <h5 className="font-bold text-green-700 mb-3 text-center bg-green-50 py-2 rounded">PRODUITS</h5>
          </div>
          <div>
            <h5 className="font-bold text-indigo-700 mb-3 text-center bg-indigo-50 py-2 rounded">RÉSULTATS</h5>
          </div>
        </div>

        {/* Pavé Exploitation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="flex flex-col">
            {renderCategorieSection('Exploitation', chargesN.exploitation, chargesN1?.exploitation, 'bg-blue-50', 'charge', totauxChargesN.exploitation, totauxChargesN1?.exploitation)}
          </div>
          <div className="flex flex-col">
            {renderCategorieSection('Exploitation', produitsN.exploitation, produitsN1?.exploitation, 'bg-blue-50', 'produit', totauxProduitsN.exploitation, totauxProduitsN1?.exploitation)}
          </div>
          <div className="flex flex-col">
            {renderResultatSection(
              'Résultat d\'Exploitation',
              'bg-blue-50',
              totauxProduitsN.exploitation,
              totauxChargesN.exploitation,
              totauxProduitsN1?.exploitation,
              totauxChargesN1?.exploitation,
              resultatsN.exploitation,
              resultatsN1?.exploitation
            )}
          </div>
        </div>

        {/* Pavé Financier */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="flex flex-col">
            {renderCategorieSection('Financier', chargesN.financier, chargesN1?.financier, 'bg-purple-50', 'charge', totauxChargesN.financier, totauxChargesN1?.financier)}
          </div>
          <div className="flex flex-col">
            {renderCategorieSection('Financier', produitsN.financier, produitsN1?.financier, 'bg-purple-50', 'produit', totauxProduitsN.financier, totauxProduitsN1?.financier)}
          </div>
          <div className="flex flex-col">
            {renderResultatSection(
              'Résultat Financier',
              'bg-purple-50',
              totauxProduitsN.financier,
              totauxChargesN.financier,
              totauxProduitsN1?.financier,
              totauxChargesN1?.financier,
              resultatsN.financier,
              resultatsN1?.financier
            )}
          </div>
        </div>

        {/* Pavé Exceptionnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="flex flex-col">
            {renderCategorieSection('Exceptionnel', chargesN.exceptionnel, chargesN1?.exceptionnel, 'bg-orange-50', 'charge', totauxChargesN.exceptionnel, totauxChargesN1?.exceptionnel)}
          </div>
          <div className="flex flex-col">
            {renderCategorieSection('Exceptionnel', produitsN.exceptionnel, produitsN1?.exceptionnel, 'bg-orange-50', 'produit', totauxProduitsN.exceptionnel, totauxProduitsN1?.exceptionnel)}
          </div>
          <div className="flex flex-col">
            {renderResultatSection(
              'Résultat Exceptionnel',
              'bg-orange-50',
              totauxProduitsN.exceptionnel,
              totauxChargesN.exceptionnel,
              totauxProduitsN1?.exceptionnel,
              totauxChargesN1?.exceptionnel,
              resultatsN.exceptionnel,
              resultatsN1?.exceptionnel
            )}
          </div>
        </div>

        {/* Résultat Avant Impôt / Impôt / Résultat Net - en pleine largeur */}
        <div className="mt-6 p-3 bg-indigo-100 rounded-lg border-2 border-indigo-300">
          <div className="font-bold text-sm mb-2">Résultat Avant Impôt · Impôt (695) · Résultat Net</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Résultat Avant Impôt</div>
              {showResultatN && (
                <div className={`text-lg font-bold font-mono ${
                  resultatAvantImpotN >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  N: {formatCurrencyNoDecimals(resultatAvantImpotN)}
                </div>
              )}
              {showResultatN1 && parseResult2 && (
                <div className={`text-base font-bold font-mono ${
                  (resultatAvantImpotN1 || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  N-1: {formatCurrencyNoDecimals(resultatAvantImpotN1 || 0)}
                </div>
              )}
              {showResultatComparaison && parseResult2 && (
                <div className={`text-sm font-bold font-mono ${
                  (resultatAvantImpotN - (resultatAvantImpotN1 || 0)) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  Variation: {formatCurrencyNoDecimals(resultatAvantImpotN - (resultatAvantImpotN1 || 0))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Impôt (Compte 695)</div>
              {showResultatN && (
                <div className="text-lg font-bold font-mono text-red-700">
                  N: {formatCurrencyNoDecimals(chargeImpotsN)}
                </div>
              )}
              {showResultatN1 && parseResult2 && (
                <div className="text-base font-bold font-mono text-red-600">
                  N-1: {formatCurrencyNoDecimals(chargeImpotsN1 || 0)}
                </div>
              )}
              {showResultatComparaison && parseResult2 && (
                <div className={`text-sm font-bold font-mono ${
                  (chargeImpotsN - (chargeImpotsN1 || 0)) <= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  Variation: {formatCurrencyNoDecimals(chargeImpotsN - (chargeImpotsN1 || 0))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Résultat Net</div>
              {showResultatN && (
                <div className={`text-lg font-bold font-mono ${
                  resultatNetN >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  N: {formatCurrencyNoDecimals(resultatNetN)}
                </div>
              )}
              {showResultatN1 && parseResult2 && (
                <div className={`text-base font-bold font-mono ${
                  (resultatNetN1 || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  N-1: {formatCurrencyNoDecimals(resultatNetN1 || 0)}
                </div>
              )}
              {showResultatComparaison && parseResult2 && (
                <div className={`text-sm font-bold font-mono ${
                  (resultatNetN - (resultatNetN1 || 0)) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  Variation: {formatCurrencyNoDecimals(resultatNetN - (resultatNetN1 || 0))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Détail par compte pour une classe sélectionnée */}
      {selectedClasse && (selectedClasse.type === 'charge' || selectedClasse.type === 'produit') && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-800">
              Détail par compte: {selectedClasse.type === 'charge' ? 'Charges' : 'Produits'} - Classe {selectedClasse.classe}
              {compteResultatN && (
                <span className="ml-2 text-gray-600">
                  ({selectedClasse.type === 'charge' 
                    ? compteResultatN.charges.find(c => c.classe === selectedClasse.classe)?.libelle
                    : compteResultatN.produits.find(p => p.classe === selectedClasse.classe)?.libelle})
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
            {(() => {
              const accounts = getCompteResultatDetails(selectedClasse.type, selectedClasse.classe);
              const singleExercice = (showResultatN && !showResultatN1) || (!showResultatN && showResultatN1 && parseResult2);
              const showN = showResultatN;
              const showN1 = showResultatN1 && parseResult2;
              const showComparaison = showResultatComparaison && parseResult2;
              
              return (
                <table className="w-full text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                      {singleExercice ? (
                        <>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Débit</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Crédit</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde</th>
                        </>
                      ) : (
                        <>
                          {showN && (
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>
                          )}
                          {showN1 && (
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>
                          )}
                          {showComparaison && (
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Var</th>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account, idx) => {
                      const variation = showN1 && account.soldeN1 !== undefined ? account.solde - account.soldeN1 : null;
                      const variationPercent = showN1 && account.soldeN1 !== undefined && account.soldeN1 !== 0 
                        ? ((account.solde - account.soldeN1) / Math.abs(account.soldeN1)) * 100 
                        : null;
                      
                      return (
                        <tr key={idx} className="border-t border-gray-200 hover:bg-gray-100">
                          <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                          <td className="px-3 py-2">{account.compteLibelle}</td>
                          {singleExercice ? (
                            <>
                              <td className="px-3 py-2 text-right font-mono">
                                {account.totalDebit > 0 ? formatCurrency(account.totalDebit) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {account.totalCredit > 0 ? formatCurrency(account.totalCredit) : '-'}
                              </td>
                              <td className={`px-3 py-2 text-right font-mono font-bold ${
                                selectedClasse.type === 'charge' 
                                  ? 'text-red-600' 
                                  : account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(account.solde)}
                              </td>
                            </>
                          ) : (
                            <>
                              {showN && (
                                <td className={`px-3 py-2 text-right font-mono font-bold ${
                                  selectedClasse.type === 'charge' 
                                    ? 'text-red-600' 
                                    : account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(account.solde)}
                                </td>
                              )}
                              {showN1 && (
                                <td className={`px-3 py-2 text-right font-mono ${
                                  selectedClasse.type === 'charge' 
                                    ? 'text-red-500' 
                                    : (account.soldeN1 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {account.soldeN1 !== undefined ? formatCurrency(account.soldeN1) : '-'}
                                </td>
                              )}
                              {showComparaison && (
                                <td className={`px-3 py-2 text-right font-mono ${
                                  variation === null ? 'text-gray-400' : 
                                  (selectedClasse.type === 'charge' 
                                    ? (variation >= 0 ? 'text-red-600' : 'text-green-600') 
                                    : (variation >= 0 ? 'text-green-600' : 'text-red-600'))
                                }`}>
                                  {variation !== null ? (
                                    <>
                                      {variation >= 0 ? '+' : ''}{formatCurrency(variation)}
                                      {variationPercent !== null && (
                                        <span className="ml-1">
                                          ({variationPercent >= 0 ? '+' : ''}{variationPercent.toFixed(1)}%)
                                        </span>
                                      )}
                                    </>
                                  ) : '-'}
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan="2" className="px-3 py-2 text-right">Total:</td>
                      {singleExercice ? (
                        <>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatCurrency(
                              accounts.reduce((sum, acc) => sum + acc.totalDebit, 0)
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatCurrency(
                              accounts.reduce((sum, acc) => sum + acc.totalCredit, 0)
                            )}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono ${
                            selectedClasse.type === 'charge' 
                              ? 'text-red-700' 
                              : accounts.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {formatCurrency(
                              accounts.reduce((sum, acc) => sum + acc.solde, 0)
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          {showN && (
                            <td className={`px-3 py-2 text-right font-mono ${
                              selectedClasse.type === 'charge' 
                                ? 'text-red-700' 
                                : accounts.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(
                                accounts.reduce((sum, acc) => sum + acc.solde, 0)
                              )}
                            </td>
                          )}
                          {showN1 && (
                            <td className={`px-3 py-2 text-right font-mono ${
                              selectedClasse.type === 'charge' 
                                ? 'text-red-600' 
                                : accounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(
                                accounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0)
                              )}
                            </td>
                          )}
                          {showComparaison && (
                            <td className={`px-3 py-2 text-right font-mono ${
                              accounts.reduce((sum, acc) => sum + acc.solde - (acc.soldeN1 || 0), 0) >= 0 
                                ? (selectedClasse.type === 'charge' ? 'text-red-600' : 'text-green-600')
                                : (selectedClasse.type === 'charge' ? 'text-green-600' : 'text-red-600')
                            }`}>
                              {accounts.reduce((sum, acc) => sum + acc.solde - (acc.soldeN1 || 0), 0) >= 0 ? '+' : ''}
                              {formatCurrency(
                                accounts.reduce((sum, acc) => sum + acc.solde - (acc.soldeN1 || 0), 0)
                              )}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompteResultatView;

