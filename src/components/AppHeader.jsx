import React from 'react';
import { FileText } from 'lucide-react';

/**
 * Composant d'en-tête de l'application
 * 
 * Affiche le titre et la description de l'application.
 * 
 * @param {Object} props
 * @param {boolean} props.hasData - Indique si des données FEC sont chargées
 */
const AppHeader = ({ hasData }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg animate-scale-in">
            <FileText className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 animate-fade-in-up">
            TRADUCTION ET ANALYSE DE FICHIERS FEC
          </h1>
        </div>
      </div>
      <p className="text-gray-600 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        La donnée facile à analyser pour les experts comptables et les entreprises.
      </p>
    </div>
  );
};

export default AppHeader;







