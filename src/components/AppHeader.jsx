import React from 'react';
import { FileText, Sparkles } from 'lucide-react';

const AppHeader = ({ showAgent, onToggleAgent, hasData }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText className="text-indigo-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-800">
            FEC V2
          </h1>
        </div>
        {hasData && (
          <button
            onClick={onToggleAgent}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showAgent
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <Sparkles size={18} />
            {showAgent ? 'Masquer Assistant' : 'Assistant IA'}
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-4">
        Analyse et découpage en cycles comptables CNCC
      </p>
    </div>
  );
};

export default AppHeader;


