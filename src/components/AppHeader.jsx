import React from 'react';
import { FileText, Sparkles } from 'lucide-react';

const AppHeader = ({ showAgent, onToggleAgent, hasData }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg animate-scale-in">
            <FileText className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 animate-fade-in-up">
            FEC V2
          </h1>
        </div>
        {hasData && (
          <button
            onClick={onToggleAgent}
            className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              showAgent
                ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700'
                : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 active:scale-95'
            }`}
          >
            <Sparkles size={18} className={showAgent ? 'animate-pulse' : ''} />
            {showAgent ? 'Masquer Assistant' : 'Assistant IA'}
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        Analyse et découpage en cycles comptables CNCC
      </p>
    </div>
  );
};

export default AppHeader;


