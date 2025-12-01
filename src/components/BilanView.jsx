import React, { useState, useMemo } from 'react';
import { Scale, TrendingUp, TrendingDown, Minus, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency, formatCurrencyNoDecimals, formatPercent } from '../utils/formatters';
import reglesAffectationBilan from '../data/regles-affectation-bilan.json';

const BilanView = ({ 
  generateBilan, 
  parseResult1, 
  parseResult2,
  showBilanN, setShowBilanN,
  showBilanN1, setShowBilanN1,
  showBilanComparaison, setShowBilanComparaison,
  selectedClasse, setSelectedClasse,
  getBilanDetails
}) => {

  const bilanN = useMemo(() => generateBilan ? generateBilan(parseResult1) : null, [generateBilan, parseResult1]);
  const bilanN1 = useMemo(() => (generateBilan && parseResult2) ? generateBilan(parseResult2) : null, [generateBilan, parseResult2]);

  // --- UTILITAIRES ---
  const getSmartLibelle = (compte) => {
    if (compte.libelle && !compte.libelle.startsWith('Compte ')) return compte.libelle;
    const racine = compte.numero;
    for (const classe of Object.values(reglesAffectationBilan.libellesComptes)) {
      if (classe[racine]) return classe[racine].libelle;
    }
    return compte.libelle;
  };

  // --- FUSION ---
  const fusionnerComptes = (cN, cN1) => {
    const mN = cN?.net || 0;
    const mN1 = cN1?.net || 0;
    let libelleFinal = cN?.libelle || cN1?.libelle || '';
    const numero = cN?.numero || cN1?.numero;
    if (numero) {
        const tempObj = { numero, libelle: libelleFinal };
        libelleFinal = getSmartLibelle(tempObj);
    }
    return {
      numero: numero || '',
      libelle: libelleFinal,
      montantN: mN,
      montantN1: mN1,
      variation: mN - mN1
    };
  };

  const fusionnerGroupes = (gN, gN1) => {
    const map = new Map();
    gN?.comptes?.forEach(c => map.set(c.numero, { cN: c, cN1: null }));
    gN1?.comptes?.forEach(c => {
        if(map.has(c.numero)) map.get(c.numero).cN1 = c;
        else map.set(c.numero, { cN: null, cN1: c });
    });
    const comptes = Array.from(map.values())
        .map(({cN, cN1}) => fusionnerComptes(cN, cN1))
        .sort((a,b) => a.numero.localeCompare(b.numero));
    return { titre: gN?.titre || gN1?.titre, comptes };
  };

  const getSectionData = (sectionKey, isActif) => {
    const secN = isActif ? bilanN?.actif[sectionKey] : bilanN?.passif[sectionKey];
    const secN1 = isActif ? bilanN1?.actif[sectionKey] : bilanN1?.passif[sectionKey];
    
    if(!secN && !secN1) return null;

    const groupes = [];
    const gN = secN?.groupes?.[0];
    const gN1 = secN1?.groupes?.[0];
    if (gN || gN1) groupes.push(fusionnerGroupes(gN, gN1));

    const totalN = groupes.reduce((acc, g) => acc + g.comptes.reduce((s, c) => s + c.montantN, 0), 0);
    const totalN1 = groupes.reduce((acc, g) => acc + g.comptes.reduce((s, c) => s + c.montantN1, 0), 0);

    return {
        titre: secN?.titre || secN1?.titre || sectionKey.toUpperCase().replace('_', ' '),
        groupes,
        totalN,
        totalN1
    };
  };

  const renderVariation = (valN, valN1) => {
    const diff = valN - valN1;
    const percent = valN1 !== 0 ? (diff / Math.abs(valN1)) * 100 : 0;
    const Icon = diff > 0 ? TrendingUp : (diff < 0 ? TrendingDown : Minus);
    const color = diff > 0 ? 'text-green-600' : (diff < 0 ? 'text-red-600' : 'text-gray-400');
    return (
      <div className={`flex flex-col items-end ${color}`}>
        <span className="font-medium text-xs">{formatCurrencyNoDecimals(diff)}</span>
        <div className="flex items-center gap-1 text-[10px]">
          <Icon size={10} />
          {valN1 !== 0 ? formatPercent(percent) : '-'}
        </div>
      </div>
    );
  };

  // --- UI SECTIONS ---
  const renderSectionCard = (section, type, extraClass = "") => {
    if (!section) return <div className={`invisible ${extraClass}`}></div>;
    const isActif = type === 'actif';
    const bgHeader = isActif ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900';
    const borderClass = isActif ? 'border-blue-200' : 'border-purple-200';
    const headerText = isActif ? 'text-blue-800' : 'text-purple-800';

    return (
      <div className={`border ${borderClass} rounded-lg overflow-hidden flex flex-col bg-white ${extraClass}`}>
        <div className={`px-4 py-2 font-bold flex justify-between items-center ${bgHeader}`}>
          <span className="uppercase tracking-wide text-sm">{section.titre}</span>
        </div>
        <div className="flex-1 flex flex-col">
          {section.groupes.map((groupe, idx) => (
            <table key={idx} className="w-full text-sm flex-1">
              <tbody className="divide-y divide-gray-50">
                {groupe.comptes.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedClasse({ type, classe: c.numero })}>
                    <td className="px-4 py-2 w-16 font-mono text-gray-500 text-xs">{c.numero}</td>
                    <td className="px-4 py-2 text-gray-800 font-medium">{c.libelle}</td>
                    {showBilanN && <td className="px-4 py-2 text-right font-bold text-gray-700">{formatCurrencyNoDecimals(c.montantN)}</td>}
                    {showBilanN1 && parseResult2 && <td className="px-4 py-2 text-right font-mono text-gray-500">{formatCurrencyNoDecimals(c.montantN1)}</td>}
                    {showBilanComparaison && parseResult2 && <td className="px-4 py-2 text-right">{renderVariation(c.montantN, c.montantN1)}</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot className={`bg-gray-50 font-bold border-t ${isActif ? 'border-blue-100' : 'border-purple-100'}`}>
                <tr>
                  <td colSpan={2} className={`px-4 py-2 text-right text-xs uppercase ${headerText}`}>Total</td>
                  {showBilanN && <td className="px-4 py-2 text-right font-mono">{formatCurrencyNoDecimals(section.totalN)}</td>}
                  {showBilanN1 && parseResult2 && <td className="px-4 py-2 text-right font-mono text-gray-600">{formatCurrencyNoDecimals(section.totalN1)}</td>}
                  {showBilanComparaison && parseResult2 && <td className="px-4 py-2 text-right">{renderVariation(section.totalN, section.totalN1)}</td>}
                </tr>
              </tfoot>
            </table>
          ))}
        </div>
      </div>
    );
  };

  if (!bilanN) return null;

  // DATA
  const actImmo = getSectionData('immobilise', true);
  const actCirc = getSectionData('circulant', true);
  const actTreso = getSectionData('tresorerie', true);

  const pasCapitaux = getSectionData('capitaux', false);
  const pasDettesLT = getSectionData('dettes_lt', false);
  const pasCourant = getSectionData('passif_courant', false);
  const pasTreso = getSectionData('tresorerie_passive', false);

  // TOTAUX
  const totalActifN = bilanN.actif.total;
  const totalPassifN = bilanN.passif.total;
  const ecartN = Math.abs(totalActifN - totalPassifN);
  
  const totalActifN1 = bilanN1?.actif.total || 0;
  const totalPassifN1 = bilanN1?.passif.total || 0;
  const ecartN1 = Math.abs(totalActifN1 - totalPassifN1);
  const equilibreN1 = ecartN1 < 0.01;

  const renderTotalBox = (label, valN, valN1, bgClass) => (
    <div className={`${bgClass} text-white p-4 rounded-lg shadow flex justify-between items-center font-bold text-lg`}>
      <span>{label}</span>
      <div className="flex flex-col items-end text-sm md:text-lg">
        {showBilanN && <span className="font-mono">{formatCurrencyNoDecimals(valN)}</span>}
        {showBilanN1 && parseResult2 && <span className="font-mono text-xs opacity-80">N-1: {formatCurrencyNoDecimals(valN1)}</span>}
        {showBilanComparaison && parseResult2 && (
          <span className="font-mono text-xs opacity-80">Var: {valN - valN1 > 0 ? '+' : ''}{formatCurrencyNoDecimals(valN - valN1)}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-gray-800 flex gap-2"><Scale size={24} className="text-indigo-600"/> Bilan Synthétique</h4>
        <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded cursor-pointer"><input type="checkbox" checked={showBilanN} onChange={e => setShowBilanN(e.target.checked)} /> N</label>
            {parseResult2 && <label className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded cursor-pointer"><input type="checkbox" checked={showBilanN1} onChange={e => setShowBilanN1(e.target.checked)} /> N-1</label>}
            {parseResult2 && <label className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded cursor-pointer"><input type="checkbox" checked={showBilanComparaison} onChange={e => setShowBilanComparaison(e.target.checked)} /> Var</label>}
        </div>
      </div>

      {/* Alertes N-1 séparée */}
      {showBilanN1 && parseResult2 && (
        <div className={`mb-2 p-2 rounded text-sm flex items-center gap-2 ${equilibreN1 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {equilibreN1 ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          N-1 : {equilibreN1 ? 'Équilibré' : `Déséquilibré (Écart: ${formatCurrency(ecartN1)})`}
        </div>
      )}

      {/* Alerte N */}
      {showBilanN && (
        <div className={`mb-6 p-3 rounded flex justify-between items-center border ${ecartN < 0.01 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-center gap-2">
            {ecartN < 0.01 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span className="font-bold">{ecartN < 0.01 ? 'Bilan N Équilibré' : `Déséquilibré (Écart: ${formatCurrency(ecartN)})`}</span>
          </div>
        </div>
      )}

      {/* GRILLE PRINCIPALE */}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <h2 className="text-center font-bold text-blue-800 bg-blue-50 py-2 rounded uppercase">ACTIF</h2>
            <h2 className="text-center font-bold text-purple-800 bg-purple-50 py-2 rounded uppercase">PASSIF</h2>
        </div>

        {/* ÉTAGE 1 : Long Terme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col h-full">
                {renderSectionCard(actImmo, 'actif', 'h-full')}
            </div>
            <div className="flex flex-col gap-6 h-full">
                {renderSectionCard(pasCapitaux, 'passif')}
                {renderSectionCard(pasDettesLT, 'passif', 'flex-1')}
            </div>
        </div>

        {/* ÉTAGE 2 : Court Terme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col h-full">
                {renderSectionCard(actCirc, 'actif', 'h-full')}
            </div>
            <div className="flex flex-col h-full">
                {renderSectionCard(pasCourant, 'passif', 'h-full')}
            </div>
        </div>

        {/* ÉTAGE 3 : Trésorerie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col h-full">
                {renderSectionCard(actTreso, 'actif', 'h-full')}
            </div>
            <div className="flex flex-col h-full">
                {renderSectionCard(pasTreso, 'passif', 'h-full')}
            </div>
        </div>

        {/* PIED DE PAGE : TOTAUX */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTotalBox('TOTAL ACTIF', totalActifN, totalActifN1, 'bg-blue-600')}
            {renderTotalBox('TOTAL PASSIF', totalPassifN, totalPassifN1, 'bg-purple-600')}
        </div>
      </div>

      {/* Modale Détail */}
      {selectedClasse && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedClasse(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Détail {selectedClasse.classe}</h3>
              <button onClick={() => setSelectedClasse(null)}><XCircle className="text-gray-500" /></button>
            </div>
            <div className="overflow-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 shadow-sm">
                  <tr><th className="px-4 py-2 text-left">Compte</th><th className="px-4 py-2 text-left">Libellé</th><th className="px-4 py-2 text-right">Solde</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getBilanDetails(selectedClasse.type, selectedClasse.classe).map((acc, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-indigo-600">{acc.compteNum}</td>
                      <td className="px-4 py-2">{acc.compteLibelle}</td>
                      <td className="px-4 py-2 text-right font-bold">{formatCurrency(acc.solde)}</td>
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

export default BilanView;