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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onCategoryChange(tab.id)}
              className={`px-4 py-2 font-medium transition-all duration-200 border-b-2 flex items-center gap-2 whitespace-nowrap relative ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {Icon && <Icon size={18} className={isActive ? 'animate-pulse' : ''} />}
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 animate-scale-in" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AnalysisTabs;


