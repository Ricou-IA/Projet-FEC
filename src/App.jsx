import React, { useState, useCallback } from 'react';
import { XCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS SIMPLIFIÉS AVEC BARREL EXPORTS (Étape 5)
// ═══════════════════════════════════════════════════════════════════════════

// Composants - Import groupé depuis ./components
import {
  AppHeader,
  FileUploadZone,
  BalanceStats,
  EntrepriseSearch,
  AnalysisTabs,
  SIGView,
  CyclesView,
  CompteResultatView,
  BilanView,
  CashFlowView,
  ToastContainer
} from './components';

// Core - Import depuis ./core
import { FECParser } from './core';

// Utils - Import groupé depuis ./utils
import { analyzeFec, createSampleFECFile, exportBalanceComptable } from './utils';

// Hooks - Import groupé depuis ./hooks
import { 
  useEntrepriseSearch, 
  useFECDataGenerators, 
  useAccountDetails, 
  useToast 
} from './hooks';

/**
 * Composant principal de l'application FEC Analyzer V2
 * 
 * Optimisations appliquées :
 * - Étape 1 : Module IA supprimé
 * - Étape 3 : Configuration centralisée
 * - Étape 4 : useCallback sur les handlers, useMemo dans les hooks
 * - Étape 5 : Barrel exports pour imports simplifiés
 */
const App = () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS - Fichiers FEC (Exercice N et Exercice N-1)
  // ═══════════════════════════════════════════════════════════════════════════
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [parseResult1, setParseResult1] = useState(null);
  const [parseResult2, setParseResult2] = useState(null);
  const [cyclesResult1, setCyclesResult1] = useState(null);
  const [cyclesResult2, setCyclesResult2] = useState(null);
  const [error, setError] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS - Navigation et sélection
  // ═══════════════════════════════════════════════════════════════════════════
  const [selectedCycleForDetail, setSelectedCycleForDetail] = useState(null);
  const [viewMode, setViewMode] = useState('ecritures');
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [cumulMode, setCumulMode] = useState(false);
  const [analysisCategory, setAnalysisCategory] = useState('cycles');
  const [selectedClasse, setSelectedClasse] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS - Affichage Comparaison N / N-1
  // ═══════════════════════════════════════════════════════════════════════════
  const [showResultatN, setShowResultatN] = useState(true);
  const [showResultatN1, setShowResultatN1] = useState(false);
  const [showResultatComparaison, setShowResultatComparaison] = useState(false);
  const [showBilanN, setShowBilanN] = useState(true);
  const [showBilanN1, setShowBilanN1] = useState(false);
  const [showBilanComparaison, setShowBilanComparaison] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS PERSONNALISÉS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const {
    siren,
    entrepriseInfo,
    loadingEntreprise,
    sirenError,
    searchEntreprise,
    handleSirenChange
  } = useEntrepriseSearch();

  const { generateCompteResultat, generateBilan, generateSIG, generateCashFlow } = useFECDataGenerators(
    parseResult1,
    parseResult2,
    cyclesResult2
  );

  const { getCycleDetailsByAccount, getCompteResultatDetails, getBilanDetails } = useAccountDetails(
    parseResult1,
    parseResult2
  );

  const { toasts, success, error: showError, removeToast } = useToast();

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS OPTIMISÉS AVEC useCallback
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFileUpload1 = useCallback(async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile1(uploadedFile);
    setError(null);
    setParseResult1(null);
    setCyclesResult1(null);
    setSelectedCycleForDetail(null);
    setLoading1(true);

    try {
      const result = await FECParser.parse(uploadedFile);
      setParseResult1(result);

      if (result.data && result.data.length > 0) {
        const cyclesAnalysis = analyzeFec(result.data);
        setCyclesResult1(cyclesAnalysis);
      }

      setLoading1(false);
      success(`Fichier Exercice N chargé avec succès (${result.rowsCount.toLocaleString('fr-FR')} écritures)`);
    } catch (err) {
      const errorMsg = `Erreur Exercice N: ${err.message}`;
      setError(errorMsg);
      setLoading1(false);
      showError(errorMsg);
    }
  }, [success, showError]);

  const handleFileUpload2 = useCallback(async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile2(uploadedFile);
    setError(null);
    setParseResult2(null);
    setCyclesResult2(null);
    setLoading2(true);

    try {
      const result = await FECParser.parse(uploadedFile);
      setParseResult2(result);

      if (result.data && result.data.length > 0) {
        const cyclesAnalysis = analyzeFec(result.data);
        setCyclesResult2(cyclesAnalysis);
      }

      setLoading2(false);
      success(`Fichier Exercice N-1 chargé avec succès (${result.rowsCount.toLocaleString('fr-FR')} écritures)`);
    } catch (err) {
      const errorMsg = `Erreur Exercice N-1: ${err.message}`;
      setError(errorMsg);
      setLoading2(false);
      showError(errorMsg);
    }
  }, [success, showError]);

  const handleCreateSampleFile = useCallback(() => {
    const sampleFile = createSampleFECFile();
    const blob = new Blob([sampleFile], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exemple_FEC.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('Fichier d\'exemple téléchargé avec succès');
  }, [success]);

  const handleExportBalance = useCallback(() => {
    try {
      exportBalanceComptable(parseResult1, parseResult2);
      success('Balance comptable exportée avec succès');
    } catch (err) {
      showError(`Erreur lors de l'export : ${err.message}`);
    }
  }, [parseResult1, parseResult2, success, showError]);

  const handleCloseError = useCallback(() => {
    setError(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU JSX
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <AppHeader hasData={parseResult1} />

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <EntrepriseSearch
            siren={siren}
            sirenError={sirenError}
            loadingEntreprise={loadingEntreprise}
            entrepriseInfo={entrepriseInfo}
            onSirenChange={handleSirenChange}
            onSearch={searchEntreprise}
          />
        </div>

        <FileUploadZone
          file1={file1}
          file2={file2}
          onFileUpload1={handleFileUpload1}
          onFileUpload2={handleFileUpload2}
          onCreateSampleFile={handleCreateSampleFile}
          loading1={loading1}
          loading2={loading2}
        />

        {(loading1 || loading2) && !parseResult1 && (
          <div className="bg-white rounded-lg shadow-lg p-8 animate-fade-in">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-100 border-t-indigo-600 mx-auto mb-4"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 animate-spin" style={{ animationDuration: '1.5s' }}></div>
              </div>
              <p className="text-gray-600 font-medium animate-pulse">
                {loading1 && loading2 ? 'Traitement des fichiers FEC en cours...' : 
                 loading1 ? 'Traitement Exercice N en cours...' : 
                 'Traitement Exercice N-1 en cours...'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-lg animate-slide-in-left">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-500 flex-shrink-0 animate-scale-in" size={24} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-1">
                  Erreur de traitement
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={handleCloseError}
                className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                aria-label="Fermer"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>
        )}

        {parseResult1 && (
          <div className="space-y-6 animate-fade-in-up">
            
            <BalanceStats
              parseResult1={parseResult1}
              parseResult2={parseResult2}
              generateCompteResultat={generateCompteResultat}
              generateBilan={generateBilan}
              onExportBalance={handleExportBalance}
            />

            <AnalysisTabs
              category={analysisCategory}
              onCategoryChange={setAnalysisCategory}
            />

            {analysisCategory === 'cycles' && cyclesResult1 && (
              <CyclesView
                cyclesResult1={cyclesResult1}
                cyclesResult2={cyclesResult2}
                parseResult1={parseResult1}
                parseResult2={parseResult2}
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedCycleForDetail={selectedCycleForDetail}
                setSelectedCycleForDetail={setSelectedCycleForDetail}
                selectedAccounts={selectedAccounts}
                setSelectedAccounts={setSelectedAccounts}
                cumulMode={cumulMode}
                setCumulMode={setCumulMode}
                getCycleDetailsByAccount={getCycleDetailsByAccount}
              />
            )}

            {analysisCategory === 'resultat' && (
              <CompteResultatView
                generateCompteResultat={generateCompteResultat}
                parseResult2={parseResult2}
                showResultatN={showResultatN}
                setShowResultatN={setShowResultatN}
                showResultatN1={showResultatN1}
                setShowResultatN1={setShowResultatN1}
                showResultatComparaison={showResultatComparaison}
                setShowResultatComparaison={setShowResultatComparaison}
                selectedClasse={selectedClasse}
                setSelectedClasse={setSelectedClasse}
                getCompteResultatDetails={getCompteResultatDetails}
              />
            )}

            {analysisCategory === 'bilan' && (
              <BilanView
                generateBilan={generateBilan}
                parseResult1={parseResult1}
                parseResult2={parseResult2}
                showBilanN={showBilanN}
                setShowBilanN={setShowBilanN}
                showBilanN1={showBilanN1}
                setShowBilanN1={setShowBilanN1}
                showBilanComparaison={showBilanComparaison}
                setShowBilanComparaison={setShowBilanComparaison}
                selectedClasse={selectedClasse}
                setSelectedClasse={setSelectedClasse}
                getBilanDetails={getBilanDetails}
              />
            )}

            {analysisCategory === 'sig' && (
              <SIGView 
                generateSIG={generateSIG} 
                parseResult1={parseResult1}
                parseResult2={parseResult2}
              />
            )}

            {analysisCategory === 'cashflow' && (
              <CashFlowView 
                generateCashFlow={generateCashFlow}
                parseResult1={parseResult1}
                parseResult2={parseResult2}
              />
            )}
          </div>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  );
};

export default App;