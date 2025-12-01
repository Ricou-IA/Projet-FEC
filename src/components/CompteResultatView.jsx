import React, { useMemo } from 'react';
import { BarChart3, XCircle, TrendingUp, TrendingDown, Minus, ArrowRight, Calculator } from 'lucide-react';
import { formatCurrency, formatCurrencyNoDecimals, formatPercent } from '../utils/formatters';
import reglesAffectation from '../data/regles-affectation-comptes.json';
import RevenueSankey from './RevenueSankey';

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

  // --- ADAPTATEUR DE DONNÉES ---
  const flattenData = (data) => {
    if (!data) return null;
    if (Array.isArray(data.charges)) return data;

    const chargesFlat = [];
    const produitsFlat = [];

    if (data.charges) {
      Object.keys(data.charges).forEach(key => {
        const category = data.charges[key];
        if (category && Array.isArray(category.comptes)) {
          category.comptes.forEach(compte => {
            chargesFlat.push({ ...compte, classe: compte.numero, categorie: key });
          });
        }
      });
    }

    if (data.produits) {
      Object.keys(data.produits).forEach(key => {
        const category = data.produits[key];
        if (category && Array.isArray(category.comptes)) {
          category.comptes.forEach(compte => {
            produitsFlat.push({ ...compte, classe: compte.numero, categorie: key });
          });
        }
      });
    }

    return { ...data, charges: chargesFlat, produits: produitsFlat };
  };

  const rawCompteResultatN = generateCompteResultat();
  const rawCompteResultatN1 = parseResult2 ? generateCompteResultat(parseResult2) : null;

  const compteResultatN = useMemo(() => flattenData(rawCompteResultatN), [rawCompteResultatN]);
  const compteResultatN1 = useMemo(() => flattenData(rawCompteResultatN1), [rawCompteResultatN1]);

  if (!compteResultatN) {
    return <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500 py-8">Aucune donnée disponible</div>;
  }

  // Classification
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

  const regrouperParCategorie = (items, type) => {
    if (!items || !Array.isArray(items)) return { exploitation: [], financier: [], exceptionnel: [] };
    const result = { exploitation: [], financier: [], exceptionnel: [] };

    items.forEach(item => {
      if (item.categorie) {
        if (item.categorie.includes('exploitation')) result.exploitation.push(item);
        else if (item.categorie.includes('financier') || item.categorie.includes('financiere')) result.financier.push(item);
        else if (item.categorie.includes('exceptionnel')) result.exceptionnel.push(item);
        else if (item.categorie.includes('participation')) result.exceptionnel.push(item); // Merge temporaire pour l'affichage liste
        return;
      }
      const classeStr = String(item.classe || '');
      const matchesPattern = (pattern) => pattern.endsWith('x') ? classeStr.startsWith(pattern.slice(0, -1)) : classeStr.startsWith(pattern);

      if (classification.exploitation[type].some(matchesPattern)) result.exploitation.push(item);
      else if (classification.financier[type].some(matchesPattern)) result.financier.push(item);
      else if (classification.exceptionnel[type].some(matchesPattern)) result.exceptionnel.push(item);
    });
    return result;
  };

  const chargesN = regrouperParCategorie(compteResultatN.charges, 'charges');
  const produitsN = regrouperParCategorie(compteResultatN.produits, 'produits');
  const chargesN1 = compteResultatN1 ? regrouperParCategorie(compteResultatN1.charges || [], 'charges') : null;
  const produitsN1 = compteResultatN1 ? regrouperParCategorie(compteResultatN1.produits || [], 'produits') : null;

  const calculerTotal = (items) => items?.reduce((sum, item) => sum + (item.solde || 0), 0) || 0;

  const getTotaux = (charges, produits) => ({
    charges: {
      exploitation: calculerTotal(charges?.exploitation),
      financier: calculerTotal(charges?.financier),
      exceptionnel: calculerTotal(charges?.exceptionnel)
    },
    produits: {
      exploitation: calculerTotal(produits?.exploitation),
      financier: calculerTotal(produits?.financier),
      exceptionnel: calculerTotal(produits?.exceptionnel)
    }
  });

  const totauxN = getTotaux(chargesN, produitsN);
  const totauxN1 = chargesN1 ? getTotaux(chargesN1, produitsN1) : null;

  const getResultats = (totaux) => ({
    exploitation: (totaux?.produits.exploitation || 0) - (totaux?.charges.exploitation || 0),
    financier: (totaux?.produits.financier || 0) - (totaux?.charges.financier || 0),
    exceptionnel: (totaux?.produits.exceptionnel || 0) - (totaux?.charges.exceptionnel || 0)
  });

  const resInterN = getResultats(totauxN);
  const resInterN1 = totauxN1 ? getResultats(totauxN1) : null;

  // --- CALCULS DÉTAILLÉS POUR LE BLOC FINAL ---
  // On doit extraire l'Impôt/Participation pour l'afficher séparément dans la cascade
  const getImpotParticipation = (charges) => {
    if (!charges) return 0;
    return charges.filter(c => c.categorie?.includes('participation') || c.classe?.startsWith('69')).reduce((acc, curr) => acc + (curr.solde || 0), 0);
  };

  const impotsN = getImpotParticipation(compteResultatN.charges);
  const impotsN1 = compteResultatN1 ? getImpotParticipation(compteResultatN1.charges) : 0;

  // Le résultat exceptionnel "Pur" (sans impôts si ils étaient mélangés)
  // Note: Dans regrouperParCategorie, on a mélangé participation dans exceptionnel. 
  // Donc resInterN.exceptionnel contient (ProdExcep - ChargesExcep - Impots).
  // Pour afficher "Résultat Exceptionnel" pur, on doit rajouter les impôts (qui sont des charges).
  const resExceptionnelPurN = resInterN.exceptionnel + impotsN;
  const resExceptionnelPurN1 = resInterN1 ? resInterN1.exceptionnel + impotsN1 : 0;

  const resCourantN = resInterN.exploitation + resInterN.financier;
  const resCourantN1 = resInterN1 ? resInterN1.exploitation + resInterN1.financier : 0;

  const resultatNetN = resCourantN + resExceptionnelPurN - impotsN;
  const resultatNetN1 = resCourantN1 + resExceptionnelPurN1 - impotsN1;

  // Helper pour rendu variation
  const renderVariationCell = (valN, valN1) => {
    if (!parseResult2 || valN1 === null) return <td className="px-4 py-2 text-right text-gray-400">-</td>;
    const diff = valN - valN1;
    const percent = valN1 !== 0 ? (diff / Math.abs(valN1)) : 0;
    let colorClass = 'text-gray-500';
    let Icon = Minus;
    if (diff > 0) { colorClass = 'text-green-600'; Icon = TrendingUp; }
    if (diff < 0) { colorClass = 'text-red-600'; Icon = TrendingDown; }
    return (
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <div className={`flex flex-col items-end ${colorClass}`}>
          <span className="font-medium text-xs">{formatCurrencyNoDecimals(diff)}</span>
          <div className="flex items-center gap-1 text-[10px]"><Icon size={10} />{formatPercent(percent * 100)}</div>
        </div>
      </td>
    );
  };

  // Helper pour rendu Section Liste
  const renderSectionUnified = (titre, produits, charges, produitsN1Data, chargesN1Data, resN, resN1) => {
    if ((!produits || produits.length === 0) && (!charges || charges.length === 0)) return null;
    return (
      <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-100 flex justify-between items-center">
          <h3 className="font-bold text-indigo-800">{titre}</h3>
          <div className="text-sm font-bold text-indigo-900">Résultat: {formatCurrency(resN)}</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="px-6 py-3 text-left w-20">Compte</th><th className="px-4 py-3 text-left">Libellé</th>
              {showResultatN && <th className="px-4 py-3 text-right w-32">Montant N</th>}
              {showResultatN1 && parseResult2 && <th className="px-4 py-3 text-right w-32">Montant N-1</th>}
              {showResultatComparaison && parseResult2 && <th className="px-4 py-3 text-right w-32">Variation</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {produits && produits.length > 0 && (
              <>
                <tr className="bg-green-50/50"><td colSpan="5" className="px-6 py-2 text-xs font-bold text-green-700 uppercase tracking-wider">Produits</td></tr>
                {produits.map((item, idx) => {
                  const itemN1 = produitsN1Data?.find(i => i.classe === item.classe);
                  return (
                    <tr key={`prod-${idx}`} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedClasse({ type: 'produit', classe: item.classe })}>
                      <td className="px-6 py-2 font-mono text-gray-500">{item.classe}</td>
                      <td className="px-4 py-2 text-gray-800 font-medium">{item.libelle}</td>
                      {showResultatN && <td className="px-4 py-2 text-right font-mono text-green-700">{formatCurrencyNoDecimals(item.solde)}</td>}
                      {showResultatN1 && parseResult2 && <td className="px-4 py-2 text-right font-mono text-gray-500">{itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}</td>}
                      {showResultatComparaison && renderVariationCell(item.solde, itemN1 ? itemN1.solde : 0)}
                    </tr>
                  );
                })}
              </>
            )}
            {charges && charges.length > 0 && (
              <>
                <tr className="bg-red-50/50"><td colSpan="5" className="px-6 py-2 text-xs font-bold text-red-700 uppercase tracking-wider">Charges</td></tr>
                {charges.map((item, idx) => {
                  const itemN1 = chargesN1Data?.find(i => i.classe === item.classe);
                  return (
                    <tr key={`charge-${idx}`} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedClasse({ type: 'charge', classe: item.classe })}>
                      <td className="px-6 py-2 font-mono text-gray-500">{item.classe}</td>
                      <td className="px-4 py-2 text-gray-800">{item.libelle}</td>
                      {showResultatN && <td className="px-4 py-2 text-right font-mono text-red-700">{formatCurrencyNoDecimals(item.solde)}</td>}
                      {showResultatN1 && parseResult2 && <td className="px-4 py-2 text-right font-mono text-gray-500">{itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}</td>}
                      {showResultatComparaison && renderVariationCell(item.solde, itemN1 ? itemN1.solde : 0)}
                    </tr>
                  );
                })}
              </>
            )}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
              <td className="px-6 py-3" colSpan="2">Résultat {titre.replace("Cycle d'", "")}</td>
              {showResultatN && <td className={`px-4 py-3 text-right font-mono ${resN >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrencyNoDecimals(resN)}</td>}
              {showResultatN1 && parseResult2 && <td className="px-4 py-3 text-right font-mono text-gray-600">{formatCurrencyNoDecimals(resN1)}</td>}
              {showResultatComparaison && renderVariationCell(resN, resN1)}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // --- BLOC CASCADE DE RÉSULTAT ---
  const ResultatCard = ({ label, amountN, amountN1, color = "gray", icon: Icon }) => (
    <div className={`flex flex-col p-4 rounded-lg border ${amountN >= 0 ? `bg-${color}-50 border-${color}-200` : 'bg-red-50 border-red-200'} flex-1 min-w-[200px]`}>
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${amountN >= 0 ? `text-${color}-700` : 'text-red-700'}`}>{label}</span>
        {Icon && <Icon size={16} className={amountN >= 0 ? `text-${color}-500` : 'text-red-500'} />}
      </div>
      <div className={`text-xl font-mono font-bold mb-1 ${amountN >= 0 ? `text-${color}-900` : 'text-red-900'}`}>
        {formatCurrency(amountN)}
      </div>
      {showResultatN1 && parseResult2 && (
        <div className="text-xs text-gray-500 flex justify-between items-center">
          <span>N-1: {formatCurrencyNoDecimals(amountN1)}</span>
          {amountN1 !== 0 && (
            <span className={amountN - amountN1 > 0 ? 'text-green-600' : 'text-red-600'}>
              {((amountN - amountN1) / Math.abs(amountN1) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );

  const Operator = ({ type }) => (
    <div className="flex items-center justify-center px-2 text-gray-400 font-bold text-xl">
      {type}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><BarChart3 size={20} className="text-indigo-600" />Compte de Résultat</h4>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={showResultatN} onChange={(e) => setShowResultatN(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />Exercice N</label>
          {parseResult2 && (
            <>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={showResultatN1} onChange={(e) => setShowResultatN1(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />Exercice N-1</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={showResultatComparaison} onChange={(e) => setShowResultatComparaison(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />Variations</label>
            </>
          )}
        </div>
      </div>

      {/* DIAGRAMME DE FLUX (SANKEY) */}
      <RevenueSankey data={{ produits: produitsN, charges: chargesN }} />

      {renderSectionUnified("Exploitation", produitsN.exploitation, chargesN.exploitation, produitsN1?.exploitation, chargesN1?.exploitation, resInterN.exploitation, resInterN1?.exploitation)}
      {renderSectionUnified("Financier", produitsN.financier, chargesN.financier, produitsN1?.financier, chargesN1?.financier, resInterN.financier, resInterN1?.financier)}
      {renderSectionUnified("Exceptionnel", produitsN.exceptionnel, chargesN.exceptionnel, produitsN1?.exceptionnel, chargesN1?.exceptionnel, resExceptionnelPurN, resExceptionnelPurN1)}

      {/* NOUVEAU BLOC CASCADE */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
          <Calculator size={16} /> Décomposition du Résultat
        </h3>
        <div className="flex flex-wrap gap-2 items-stretch justify-between">
          <ResultatCard label="Exploitation" amountN={resInterN.exploitation} amountN1={resInterN1?.exploitation} color="blue" />
          <Operator type="+" />
          <ResultatCard label="Financier" amountN={resInterN.financier} amountN1={resInterN1?.financier} color="blue" />
          <Operator type="=" />
          <ResultatCard label="Courant" amountN={resCourantN} amountN1={resCourantN1} color="indigo" />
          <Operator type="+" />
          <ResultatCard label="Exceptionnel" amountN={resExceptionnelPurN} amountN1={resExceptionnelPurN1} color="purple" />
          <Operator type="-" />
          <ResultatCard label="Impôts & Part." amountN={impotsN} amountN1={impotsN1} color="orange" icon={TrendingDown} />
          <Operator type="=" />
          <ResultatCard label="RÉSULTAT NET" amountN={resultatNetN} amountN1={resultatNetN1} color="green" icon={TrendingUp} />
        </div>
      </div>

      {selectedClasse && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedClasse(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <div className={`w-2 h-8 rounded ${selectedClasse.type === 'charge' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                Détail du compte racine {selectedClasse.classe}
              </h3>
              <button onClick={() => setSelectedClasse(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><XCircle size={24} className="text-gray-500" /></button>
            </div>
            <div className="overflow-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr><th className="px-6 py-3 text-left text-gray-500">Compte</th><th className="px-4 py-3 text-left text-gray-500">Libellé</th><th className="px-4 py-3 text-right text-gray-500">Débit</th><th className="px-4 py-3 text-right text-gray-500">Crédit</th><th className="px-4 py-3 text-right text-gray-500">Solde</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getCompteResultatDetails(selectedClasse.type, selectedClasse.classe).map((acc, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-indigo-600">{acc.compteNum}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{acc.compteLibelle}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrencyNoDecimals(acc.totalDebit)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrencyNoDecimals(acc.totalCredit)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">{formatCurrency(acc.solde)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompteResultatView;