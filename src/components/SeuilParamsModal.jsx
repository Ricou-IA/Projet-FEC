import React, { useState, useEffect } from 'react';
import { XCircle, Settings, Save } from 'lucide-react';
import seuilData from '../data/Calcul-seuil.json';

/**
 * Composant modal pour éditer les paramètres de calcul des seuils
 */
export default function SeuilParamsModal({ isOpen, onClose, onSave, customParams }) {
  const [localParams, setLocalParams] = useState(null);

  // Initialiser les paramètres locaux
  useEffect(() => {
    if (isOpen) {
      if (customParams) {
        setLocalParams(JSON.parse(JSON.stringify(customParams)));
      } else {
        setLocalParams(JSON.parse(JSON.stringify(seuilData.materiality_calculation_framework)));
      }
    }
  }, [isOpen, customParams]);

  if (!isOpen || !localParams) return null;

  const handleSave = () => {
    onSave(localParams);
    onClose();
  };

  const updateBand = (index, field, value) => {
    const newBands = [...localParams.materiality_bands];
    if (field === 'max_base' && value === '') {
      newBands[index][field] = null;
    } else if (field === 'percentage_b') {
      newBands[index][field] = parseFloat(value) || 0;
    } else {
      newBands[index][field] = parseInt(value) || 0;
    }
    setLocalParams({ ...localParams, materiality_bands: newBands });
  };

  const updatePercentage = (value) => {
    const newParams = { ...localParams };
    if (!newParams.anomaly_reporting_threshold) {
      newParams.anomaly_reporting_threshold = {};
    }
    newParams.anomaly_reporting_threshold.percentage_of_ssg = parseFloat(value) || 0.03;
    setLocalParams(newParams);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="text-indigo-600" size={24} />
            <h3 className="text-xl font-semibold text-gray-800">
              Paramètres de calcul des seuils
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Paramètre de seuil de remontée */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Seuil de remontée des ajustements
              </h4>
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600">
                  Pourcentage du SSG:
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={localParams.anomaly_reporting_threshold?.percentage_of_ssg || 0.03}
                  onChange={(e) => updatePercentage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg w-32"
                />
                <span className="text-xs text-gray-500">
                  ({(localParams.anomaly_reporting_threshold?.percentage_of_ssg || 0.03) * 100}%)
                </span>
              </div>
            </div>

            {/* Tableau des tranches */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Tranches de signification (materiality_bands)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-indigo-100">
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300">
                        Min Base
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300">
                        Max Base
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300">
                        Montant Fixe (a)
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300">
                        Pourcentage (b)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {localParams.materiality_bands.map((band, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            value={band.min_base}
                            onChange={(e) => updateBand(index, 'min_base', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            value={band.max_base || ''}
                            placeholder="∞"
                            onChange={(e) => updateBand(index, 'max_base', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            value={band.fixed_amount_a}
                            onChange={(e) => updateBand(index, 'fixed_amount_a', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.0001"
                              value={band.percentage_b}
                              onChange={(e) => updateBand(index, 'percentage_b', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              ({(band.percentage_b * 100).toFixed(2)}%)
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

