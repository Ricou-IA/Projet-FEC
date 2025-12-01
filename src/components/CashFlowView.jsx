import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  XCircle,
  Info
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '../utils/formatters';
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine, 
  LabelList 
} from 'recharts';

/**
 * CONFIGURATION DU DÉTAIL
 */
const DETAIL_MAP = {
  // P&L
  'resultatNet': { label: 'Résultat Net', prefixes: ['6', '7'] },
  'dotations': { label: 'Dotations aux amortissements', prefixes: ['68'] },
  'reprises': { label: 'Reprises sur amortissements', prefixes: ['78'] },
  'plusMoinsValue': { label: 'Plus/Moins values de cession (675/775)', prefixes: ['675', '775'] },

  // BILAN - BFR
  'varStocks': { label: 'Variation Stocks', prefixes: ['3'] },
  'varClients': { label: 'Variation Clients', prefixes: ['41'] },
  'varFournisseurs': { label: 'Variation Fournisseurs', prefixes: ['40'] },
  'varSocialFiscal': { label: 'Variation Social/Fiscal', prefixes: ['42', '43', '44'] },
  'varAutresBFR': { label: 'Autres éléments BFR', prefixes: ['45', '46', '47', '48'] },

  // BILAN - INVEST (DÉTAILLÉ)
  'investIncorp': { label: 'Immo. Incorporelles (20)', prefixes: ['20'] },
  'investCorp': { label: 'Immo. Corporelles (21, 23)', prefixes: ['21', '23'] },
  'investFi': { label: 'Immo. Financières (26, 27)', prefixes: ['26', '27'] },
  'investVNC': { label: 'VNC des éléments cédés (675)', prefixes: ['675'] },
  'prixCession': { label: 'Prix de Cession encaissé (775)', prefixes: ['775'] },

  // BILAN - FI
  'varCapital': { label: 'Variation Capital', prefixes: ['101', '104', '108'] },
  'varEmprunts': { label: 'Variation Emprunts', prefixes: ['16'] },
};

// --- COMPOSANT TOOLTIP ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.realValue;
    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl z-50">
        <p className="text-gray-500 text-xs font-semibold uppercase mb-2 tracking-wider">{label}</p>
        <div className="flex items-center gap-3">
            <div className={`w-1.5 h-10 rounded-full ${
                data.isTotal ? 'bg-indigo-500' : (value >= 0 ? 'bg-emerald-500' : 'bg-rose-500')
            }`}></div>
            <div>
                <p className={`text-xl font-bold font-mono ${
                    data.isTotal ? 'text-indigo-700' : (value >= 0 ? 'text-emerald-600' : 'text-rose-600')
                }`}>
                 {value > 0 && !data.isTotal ? '+' : ''}{formatCurrencyNoDecimals(value)}
                </p>
                <p className="text-xs text-gray-400 font-medium">
                    {data.isTotal ? 'Niveau Trésorerie' : 'Flux Période'}
                </p>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

const CashFlowView = ({ generateCashFlow, parseResult1, parseResult2 }) => {
  const [selectedDetail, setSelectedDetail] = useState(null);
  
  const data = generateCashFlow();

  if (!data) return <div className="p-8 text-center text-gray-500">Chargement des données...</div>;

  const getDetailAccounts = (detailKey) => {
    if (!detailKey || !parseResult1 || !parseResult2) return [];
    const config = DETAIL_MAP[detailKey];
    if (!config) return [];
    const prefixes = config.prefixes;
    const accountsMap = new Map();

    const scan = (resultList, field) => {
      resultList.data.forEach(acc => {
        if (prefixes.some(p => acc.compteNum.toString().startsWith(p))) {
          if (!accountsMap.has(acc.compteNum)) {
            accountsMap.set(acc.compteNum, {
              numero: acc.compteNum, libelle: acc.compteLibelle, soldeN: 0, soldeN1: 0
            });
          }
          accountsMap.get(acc.compteNum)[field] = acc.solde;
        }
      });
    };

    scan(parseResult1, 'soldeN');
    scan(parseResult2, 'soldeN1');

    return Array.from(accountsMap.values())
      .map(acc => ({
        ...acc,
        variation: acc.soldeN - acc.soldeN1
      }))
      .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));
  };

  const detailAccounts = useMemo(() => getDetailAccounts(selectedDetail), [selectedDetail, parseResult1, parseResult2]);

  const waterfallSteps = [
    { name: 'Tréso. Ouv.', value: data.synthese.tresorerieOuverture, isTotal: true },
    { name: 'CAF', value: data.caf.montant, isTotal: false },
    { name: 'Var. BFR', value: data.bfr.flux, isTotal: false },
    { name: 'Flux Invest.', value: data.invest.flux, isTotal: false },
    { name: 'Flux Fin.', value: data.fi.flux, isTotal: false },
  ];

  const chartData = [];
  let currentLevel = 0;
  
  waterfallSteps.forEach((item) => {
    if (item.isTotal) {
      currentLevel = item.value;
      chartData.push({ 
        name: item.name, 
        barRange: [0, item.value], 
        realValue: item.value, 
        isTotal: true, 
        fill: "url(#colorTotal)" 
      });
    } else {
      const prevLevel = currentLevel;
      currentLevel += item.value;
      chartData.push({ 
        name: item.name, 
        barRange: [prevLevel, currentLevel], 
        realValue: item.value, 
        isTotal: false, 
        fill: item.value >= 0 ? "url(#colorPos)" : "url(#colorNeg)" 
      });
    }
  });
  
  chartData.push({ 
    name: 'Tréso. Clôture', 
    barRange: [0, currentLevel], 
    realValue: currentLevel, 
    isTotal: true, 
    fill: "url(#colorTotal)" 
  });

  const FlowRow = ({ label, amount, isTotal = false, isSubItem = false, detailKey = null }) => (
    <div
      className={`
        flex justify-between items-center py-2 border-b border-gray-100 
        ${isTotal ? 'font-bold bg-gray-50 px-3 rounded mt-2' : 'hover:bg-gray-50 px-2 cursor-pointer transition-colors group'} 
        ${isSubItem ? 'text-sm text-gray-600 pl-6' : ''}
      `}
      onClick={() => detailKey && setSelectedDetail(detailKey)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {detailKey && <Info size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <span className={`font-mono ${amount >= 0 ? (isTotal && amount > 0 ? 'text-green-700' : 'text-gray-800') : 'text-red-600'}`}>
        {formatCurrencyNoDecimals(amount)}
      </span>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* --- GRAPHIQUE WATERFALL --- */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-8">
            <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Activity size={24} className="text-indigo-600" />
                Formation de la Trésorerie
            </h4>
            <div className={`px-4 py-2 rounded-lg text-sm font-bold border ${data.synthese.variationNette >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                Var. Nette : {data.synthese.variationNette > 0 ? '+' : ''}{formatCurrencyNoDecimals(data.synthese.variationNette)}
            </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/><stop offset="95%" stopColor="#4338ca" stopOpacity={0.85}/></linearGradient>
                <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/><stop offset="95%" stopColor="#059669" stopOpacity={0.85}/></linearGradient>
                <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9}/><stop offset="95%" stopColor="#e11d48" stopOpacity={0.85}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
              <Bar dataKey="barRange" radius={[6, 6, 6, 6]} barSize={50}>
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />)}
                <LabelList dataKey="realValue" position="top" formatter={(val) => formatCurrencyNoDecimals(val)} style={{ fill: '#475569', fontSize: '11px', fontWeight: 'bold' }} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {!data.synthese.equilibre && (
          <div className="mt-4 mx-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-sm text-amber-800">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>Écart détecté : {formatCurrencyNoDecimals(data.synthese.ecart)}.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- TABLEAU 1: CAF & BFR --- */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h5 className="font-bold text-gray-800 mb-6 pb-3 border-b border-gray-100 flex items-center justify-between">
            <span>1. Activité & BFR</span>
            <div className="h-1 w-12 bg-blue-500 rounded"></div>
          </h5>

          <FlowRow label="Résultat Net" amount={data.caf.resultatNet} isTotal detailKey="resultatNet" />
          <FlowRow label="+ Dotations" amount={data.caf.dotations} isSubItem detailKey="dotations" />
          <FlowRow label="- Reprises" amount={-data.caf.reprises} isSubItem detailKey="reprises" />
          <FlowRow label="-/+ Plus/Moins-values" amount={data.caf.plusMoinsValue} isSubItem detailKey="plusMoinsValue" />
          <FlowRow label="Capacité d'Autofinancement (CAF)" amount={data.caf.montant} isTotal />

          <div className="my-6 border-t border-dashed border-gray-200"></div>

          <FlowRow label="Variation Stocks" amount={data.bfr.varStocks} isSubItem detailKey="varStocks" />
          <FlowRow label="Variation Clients" amount={data.bfr.varClients} isSubItem detailKey="varClients" />
          <FlowRow label="Variation Fournisseurs" amount={data.bfr.varFournisseurs} isSubItem detailKey="varFournisseurs" />
          <FlowRow label="Variation Social/Fiscal" amount={data.bfr.varSocialFiscal} isSubItem detailKey="varSocialFiscal" />
          <FlowRow label="Autres éléments BFR" amount={data.bfr.varAutresBFR} isSubItem detailKey="varAutresBFR" />
          
          <FlowRow label="Variation du BFR" amount={data.bfr.flux} isTotal />

          <div className="mt-4 mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
             <span className="text-sm font-semibold text-blue-700">Flux d'Exploitation</span>
             <div className={`font-bold text-xl ${data.synthese.fte >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrencyNoDecimals(data.synthese.fte)}
             </div>
          </div>
        </div>

        {/* --- TABLEAU 2: INVESTISSEMENT & FINANCEMENT --- */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h5 className="font-bold text-gray-800 mb-6 pb-3 border-b border-gray-100 flex items-center justify-between">
            <span>2. Investissement & Financement</span>
            <div className="h-1 w-12 bg-purple-500 rounded"></div>
          </h5>

          {/* --- LES 4 LIGNES DÉTAILLÉES DEMANDÉES --- */}
          {/* Note : On inverse le signe (-) pour qu'une augmentation d'actif apparaisse comme un flux négatif */}
          
          <FlowRow label="Var. Immo. Incorporelles" amount={-data.invest.details.incorp} isSubItem detailKey="investIncorp" />
          <FlowRow label="Var. Immo. Corporelles" amount={-data.invest.details.corp} isSubItem detailKey="investCorp" />
          <FlowRow label="Var. Immo. Financières" amount={-data.invest.details.fi} isSubItem detailKey="investFi" />
          
          {/* VNC : Charge calculée, à soustraire pour obtenir le décaissement réel (coût d'acquisition) */}
          <FlowRow label="Retraitement VNC (Sorties)" amount={-data.invest.details.retraitementVNC} isSubItem detailKey="investVNC" />

          <div className="my-2 border-t border-dashed border-gray-100"></div>

          {/* Prix de cession : Le cash qui rentre */}
          <FlowRow label="Prix de Cession (Cash In)" amount={data.caf.produitsCessions} detailKey="prixCession" />

          <div className="mt-4 mb-6 p-3 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
             <span className="text-sm font-semibold text-purple-700">Flux d'Investissement</span>
             <div className={`font-bold text-xl ${data.invest.flux >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrencyNoDecimals(data.invest.flux)}
             </div>
          </div>

          <FlowRow label="Variation Capital" amount={data.fi.varCapital} detailKey="varCapital" />
          <FlowRow label="Variation Emprunts" amount={data.fi.varEmprunts} detailKey="varEmprunts" />

          <div className="mt-4 mb-6 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex justify-between items-center">
             <span className="text-sm font-semibold text-indigo-700">Flux de Financement</span>
             <div className={`font-bold text-xl ${data.fi.flux >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrencyNoDecimals(data.fi.flux)}
             </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
             <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Trésorerie Ouverture (N-1)</span>
                 <span className="font-mono font-medium text-gray-700">{formatCurrencyNoDecimals(data.synthese.tresorerieOuverture)}</span>
             </div>
             <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-lg shadow-md mt-2">
               <span className="font-semibold">Trésorerie Clôture (N)</span>
               <span className="font-mono text-xl font-bold">{formatCurrencyNoDecimals(data.synthese.tresorerieCloture)}</span>
             </div>
          </div>
        </div>
      </div>

      {/* --- MODALE DE DÉTAIL --- */}
      {selectedDetail && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDetail(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <div className="w-1 h-6 bg-indigo-500 rounded"></div>
                 Détail : {DETAIL_MAP[selectedDetail]?.label}
               </h3>
               <button onClick={() => setSelectedDetail(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><XCircle size={24} className="text-gray-500" /></button>
             </div>
             <div className="overflow-auto p-0">
               <table className="w-full text-sm">
                 <thead className="bg-gray-50 sticky top-0 text-xs uppercase text-gray-500 font-semibold shadow-sm z-10">
                   <tr>
                     <th className="px-6 py-3 text-left bg-gray-50">Compte</th>
                     <th className="px-4 py-3 text-left bg-gray-50">Libellé</th>
                     <th className="px-4 py-3 text-right bg-gray-50 text-gray-400">Solde N-1</th>
                     <th className="px-4 py-3 text-right bg-gray-50 text-gray-400">Solde N</th>
                     <th className="px-4 py-3 text-right bg-gray-100 text-indigo-900 border-l border-gray-200">Variation</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {detailAccounts.map((acc, idx) => (
                     <tr key={idx} className="hover:bg-gray-50">
                       <td className="px-6 py-3 font-mono text-indigo-600 font-medium">{acc.numero}</td>
                       <td className="px-4 py-3 font-medium text-gray-700 truncate max-w-xs">{acc.libelle}</td>
                       <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">{formatCurrencyNoDecimals(acc.soldeN1)}</td>
                       <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">{formatCurrencyNoDecimals(acc.soldeN)}</td>
                       <td className={`px-4 py-3 text-right font-mono font-bold bg-gray-50/50 border-l border-gray-100 ${acc.variation >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {acc.variation > 0 ? '+' : ''}{formatCurrencyNoDecimals(acc.variation)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                Détail des variations comptables (Solde N - Solde N-1).
             </div>
           </div>
         </div>
      )}
    </div>
  );
};

export default CashFlowView;