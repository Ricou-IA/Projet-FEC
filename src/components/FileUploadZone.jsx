import React from 'react';
import { Upload, FileText } from 'lucide-react';

const FileUploadZone = ({ 
  file1, 
  file2, 
  onFileUpload1, 
  onFileUpload2, 
  onCreateSampleFile 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Charger les fichiers FEC (2 exercices)
        </h2>
        <button
          onClick={onCreateSampleFile}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <FileText size={20} />
          Télécharger un fichier d'exemple
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Zone d'upload Exercice N */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exercice N (Actuel)
          </label>
          <label className="cursor-pointer">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              file1 ? 'border-green-400 bg-green-50' : 'border-indigo-300 hover:border-indigo-500'
            }`}>
              <Upload className={`mx-auto mb-2 ${file1 ? 'text-green-500' : 'text-indigo-500'}`} size={40} />
              <p className="text-gray-700 font-medium mb-1 text-sm">
                {file1 ? 'Fichier chargé' : 'Cliquez pour sélectionner'}
              </p>
              <p className="text-gray-500 text-xs">
                Format: .txt avec délimiteur tabulation
              </p>
            </div>
            <input
              type="file"
              onChange={onFileUpload1}
              accept=".txt"
              className="hidden"
            />
          </label>
          {file1 && (
            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-gray-700">
                <strong>Fichier:</strong> {file1.name} ({(file1.size / 1024).toFixed(2)} Ko)
              </p>
            </div>
          )}
        </div>

        {/* Zone d'upload Exercice N-1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exercice N-1 (Précédent) <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <label className="cursor-pointer">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              file2 ? 'border-blue-400 bg-blue-50' : 'border-indigo-300 hover:border-indigo-500'
            }`}>
              <Upload className={`mx-auto mb-2 ${file2 ? 'text-blue-500' : 'text-indigo-500'}`} size={40} />
              <p className="text-gray-700 font-medium mb-1 text-sm">
                {file2 ? 'Fichier chargé' : 'Cliquez pour sélectionner'}
              </p>
              <p className="text-gray-500 text-xs">
                Format: .txt avec délimiteur tabulation
              </p>
            </div>
            <input
              type="file"
              onChange={onFileUpload2}
              accept=".txt"
              className="hidden"
            />
          </label>
          {file2 && (
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-gray-700">
                <strong>Fichier:</strong> {file2.name} ({(file2.size / 1024).toFixed(2)} Ko)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadZone;


