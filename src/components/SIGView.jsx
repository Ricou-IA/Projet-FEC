import React from 'react';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const SIGView = ({ generateSIG }) => {
  const sigData = generateSIG();
  
  if (!sigData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <BarChart3 size={20} />
          Soldes Intermédiaires de Gestion (SIG)
        </h4>
        <div className="text-center text-gray-500 py-8">Aucune donnée disponible</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <BarChart3 size={20} />
        Soldes Intermédiaires de Gestion (SIG)
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Indicateur</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Formule</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200 hover:bg-gray-100">
              <td className="px-3 py-2 font-medium">Marge commerciale</td>
              <td className="px-3 py-2 text-gray-600 text-xs">707 - 607</td>
              <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.margeCommerciale || 0)}</td>
            </tr>
            <tr className="border-t border-gray-200 hover:bg-gray-100">
              <td className="px-3 py-2 font-medium">Production de l'exercice</td>
              <td className="px-3 py-2 text-gray-600 text-xs">70 (hors 707) - 60 (hors 607, 606)</td>
              <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.productionExercice || 0)}</td>
            </tr>
            <tr className="border-t border-gray-200 hover:bg-gray-100">
              <td className="px-3 py-2 font-medium">Valeur ajoutée</td>
              <td className="px-3 py-2 text-gray-600 text-xs">Marge commerciale + Production</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(sigData.valeurAjoutee || 0)}</td>
            </tr>
            <tr className="border-t border-gray-200 hover:bg-gray-100 bg-yellow-50">
              <td className="px-3 py-2 font-medium">Excédent Brut d'Exploitation (EBE)</td>
              <td className="px-3 py-2 text-gray-600 text-xs">Valeur ajoutée + Subventions - Impôts - Charges personnel</td>
              <td className="px-3 py-2 text-right font-mono font-bold text-yellow-700">{formatCurrency(sigData.ebe || 0)}</td>
            </tr>
            <tr className="border-t border-gray-200 hover:bg-gray-100">
              <td className="px-3 py-2 font-medium">Résultat d'exploitation</td>
              <td className="px-3 py-2 text-gray-600 text-xs">EBE + Reprises (78) + Transferts (79) + Autres produits (75) - Dotations (68) - Autres charges (65)</td>
              <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.resultatExploitation || 0)}</td>
            </tr>
            <tr className="border-t border-gray-200 hover:bg-gray-100 bg-blue-50">
              <td className="px-3 py-2 font-medium">Résultat courant avant impôt</td>
              <td className="px-3 py-2 text-gray-600 text-xs">Résultat d'exploitation + Produits financiers (76) - Charges financières (66)</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(sigData.resultatCourantAvantImpot || 0)}</td>
            </tr>
            <tr className="border-t border-gray-200 hover:bg-gray-100">
              <td className="px-3 py-2 font-medium">Résultat exceptionnel</td>
              <td className="px-3 py-2 text-gray-600 text-xs">Produits exceptionnels (77) - Charges exceptionnelles (67)</td>
              <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.resultatExceptionnel || 0)}</td>
            </tr>
            {((sigData.participationSalaries !== 0 && sigData.participationSalaries) || (sigData.impotBenefices !== 0 && sigData.impotBenefices)) && (
              <>
                {(sigData.participationSalaries !== 0 && sigData.participationSalaries) && (
                  <tr className="border-t border-gray-200 hover:bg-gray-100">
                    <td className="px-3 py-2 font-medium">Participation des salariés</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">Compte 69 (hors 695)</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">- {formatCurrency(sigData.participationSalaries || 0)}</td>
                  </tr>
                )}
                {(sigData.impotBenefices !== 0 && sigData.impotBenefices) && (
                  <tr className="border-t border-gray-200 hover:bg-gray-100">
                    <td className="px-3 py-2 font-medium">Impôt sur les bénéfices</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">Compte 695</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">- {formatCurrency(sigData.impotBenefices || 0)}</td>
                  </tr>
                )}
              </>
            )}
            <tr className="border-t-2 border-gray-400 hover:bg-gray-100 bg-indigo-50">
              <td className="px-3 py-2 font-bold">Résultat net</td>
              <td className="px-3 py-2 text-gray-600 text-xs">Résultat courant avant impôt + Résultat exceptionnel - Participation - Impôt</td>
              <td className={`px-3 py-2 text-right font-mono font-bold text-lg ${
                (sigData.resultatNet || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(sigData.resultatNet || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SIGView;


