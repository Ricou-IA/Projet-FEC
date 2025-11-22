import React from 'react';
import { Sparkles } from 'lucide-react';

const AnalysisTabs = ({ category, onCategoryChange }) => {
  const tabs = [
    { id: 'cycles', label: 'Répartition par cycle' },
    { id: 'resultat', label: 'Compte de Résultat' },
    { id: 'bilan', label: 'Bilan' },
    { id: 'sig', label: 'Soldes Intermédiaires de Gestion' },
    { id: 'programme', label: 'Programme de travail', icon: Sparkles }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onCategoryChange(tab.id)}
              className={`px-4 py-2 font-medium transition-all border-b-2 flex items-center gap-2 ${
                category === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {Icon && <Icon size={18} />}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AnalysisTabs;


