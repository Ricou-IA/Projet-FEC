import React from 'react';
import { FileText, XCircle } from 'lucide-react';

const EntrepriseSearch = ({
  siren,
  sirenError,
  loadingEntreprise,
  entrepriseInfo,
  onSirenChange,
  onSearch
}) => {
  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-end gap-3 mb-3">
        <div className="flex-1">
          <label htmlFor="siren" className="block text-sm font-medium text-gray-700 mb-2">
            SIREN de l'entreprise (9 chiffres)
          </label>
          <input
            id="siren"
            type="text"
            value={siren}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 9);
              onSirenChange(value);
            }}
            placeholder="123456789"
            maxLength={9}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
          />
          {sirenError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <XCircle size={16} />
              {sirenError}
            </p>
          )}
        </div>
        <button
          onClick={onSearch}
          disabled={loadingEntreprise || siren.length !== 9}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {loadingEntreprise ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Recherche...
            </>
          ) : (
            <>
              <FileText size={18} />
              Rechercher
            </>
          )}
        </button>
      </div>

      {/* Affichage des informations de l'entreprise */}
      {entrepriseInfo && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-indigo-900 mb-2">{entrepriseInfo.nom}</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <strong>SIREN:</strong> {entrepriseInfo.siren}
                  {entrepriseInfo.formeJuridique && (
                    <span className="ml-2 text-gray-600">({entrepriseInfo.formeJuridique})</span>
                  )}
                </p>
                {entrepriseInfo.siret && <p><strong>SIRET:</strong> {entrepriseInfo.siret}</p>}
                {entrepriseInfo.codeNaf && (
                  <p>
                    <strong>Code NAF:</strong> <span className="font-mono">{entrepriseInfo.codeNaf}</span>
                  </p>
                )}
                {entrepriseInfo.libelleNaf && (
                  <p>
                    <strong>Activité principale:</strong> <span className="text-gray-600">{entrepriseInfo.libelleNaf}</span>
                  </p>
                )}
                {entrepriseInfo.dirigeant && (
                  <p>
                    <strong>Dirigeant:</strong> {entrepriseInfo.dirigeant}
                  </p>
                )}
                {entrepriseInfo.adresse && (
                  <p>
                    <strong>Adresse:</strong> {entrepriseInfo.adresse}
                    {entrepriseInfo.codePostal && `, ${entrepriseInfo.codePostal}`}
                    {entrepriseInfo.ville && ` ${entrepriseInfo.ville}`}
                  </p>
                )}
              </div>
            </div>
            <a
              href={entrepriseInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <FileText size={16} />
              Voir la fiche
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntrepriseSearch;


