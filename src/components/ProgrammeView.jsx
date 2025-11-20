import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ProgrammeTravailTemplate from './ProgrammeTravailTemplate';
import { AIService } from '../services/aiService';

const ProgrammeView = ({
  programmeTravail,
  programmeTravailData,
  loadingProgramme,
  parseResult1,
  generateProgramme,
  onUpdateProgrammeData
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={20} />
          Programme de travail
        </h4>
        {!programmeTravail && !loadingProgramme && parseResult1 && AIService.getApiKey() && (
          <button
            onClick={generateProgramme}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <Sparkles size={16} />
            Générer le programme
          </button>
        )}
      </div>

      {loadingProgramme && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="ml-3 text-gray-600">Génération du programme de travail en cours...</span>
        </div>
      )}

      {!loadingProgramme && !programmeTravail && (
        <div className="text-center py-12 text-gray-500">
          <Sparkles size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Programme de travail</p>
          <p className="text-sm mb-4">Génère un programme de travail personnalisé basé sur les données FEC analysées</p>
          {!parseResult1 && (
            <p className="text-xs text-gray-400">Chargez d'abord un fichier FEC pour générer le programme</p>
          )}
          {parseResult1 && !AIService.getApiKey() && (
            <p className="text-xs text-yellow-600 mt-2">⚠️ Configurez votre clé API OpenRouter dans l'assistant IA pour générer le programme</p>
          )}
        </div>
      )}

      {programmeTravail && (
        <div>
          {programmeTravailData ? (
            <ProgrammeTravailTemplate
              data={programmeTravailData}
              onUpdate={onUpdateProgrammeData}
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800">
                {programmeTravail}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgrammeView;


