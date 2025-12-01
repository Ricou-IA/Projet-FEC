import React from 'react';
import { 
  NAVIGATION_STRUCTURE, 
  findGroupByTabId, 
  getFirstTabOfGroup 
} from '../config/navigation.config';

/**
 * Composant de navigation par onglets
 * 
 * Utilise la configuration centralisée depuis src/config/navigation.config.js
 * Pour modifier les onglets, éditez le fichier de configuration.
 * 
 * Structure à 2 niveaux :
 * - Niveau 1 : Groupes principaux (Synthèse Financière, Audit & Analyse)
 * - Niveau 2 : Onglets individuels dans chaque groupe
 * 
 * @param {Object} props
 * @param {string} props.category - Catégorie/onglet actuellement sélectionné
 * @param {Function} props.onCategoryChange - Callback pour changer de catégorie
 */
const AnalysisTabs = ({ category, onCategoryChange }) => {
  
  // Déterminer le groupe actif en fonction de l'onglet sélectionné
  const activeGroupKey = findGroupByTabId(category);

  // Changer de groupe (sélectionne le premier onglet du groupe)
  const handleGroupChange = (groupKey) => {
    const firstTabId = getFirstTabOfGroup(groupKey);
    if (firstTabId) {
      onCategoryChange(firstTabId);
    }
  };

  return (
    <div className="mb-6 animate-fade-in-up">
      
      {/* ═══════════════════════════════════════════════════════════════════
          NIVEAU 1 : Navigation Principale (Groupes)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-4 w-fit mx-auto sm:mx-0">
        {Object.entries(NAVIGATION_STRUCTURE).map(([key, group]) => {
          const isActive = activeGroupKey === key;
          const Icon = group.icon;
          
          return (
            <button
              key={key}
              onClick={() => handleGroupChange(key)}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${isActive 
                  ? 'bg-white text-gray-800 shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }
              `}
              title={group.description}
            >
              <Icon size={18} className={isActive ? `text-${group.color}-600` : ''} />
              {group.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          NIVEAU 2 : Onglets du groupe actif
      ═══════════════════════════════════════════════════════════════════ */}
      {activeGroupKey && (
        <div className="flex flex-wrap gap-2">
          {NAVIGATION_STRUCTURE[activeGroupKey].tabs.map((tab) => {
            const isActive = category === tab.id;
            const Icon = tab.icon;
            const groupColor = NAVIGATION_STRUCTURE[activeGroupKey].color;
            
            return (
              <button
                key={tab.id}
                onClick={() => onCategoryChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? `bg-${groupColor}-600 text-white shadow-md` 
                    : `bg-white text-gray-600 hover:bg-${groupColor}-50 hover:text-${groupColor}-700 border border-gray-200`
                  }
                `}
                title={tab.description}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnalysisTabs;
