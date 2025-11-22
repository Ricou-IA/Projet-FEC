import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import AgentPanel from './components/AgentPanel';
import AppHeader from './components/AppHeader';
import FileUploadZone from './components/FileUploadZone';
import BalanceStats from './components/BalanceStats';
import EntrepriseSearch from './components/EntrepriseSearch';
import AnalysisTabs from './components/AnalysisTabs';
import SIGView from './components/SIGView';
import CyclesView from './components/CyclesView';
import CompteResultatView from './components/CompteResultatView';
import BilanView from './components/BilanView';
import ProgrammeView from './components/ProgrammeView';
import ToastContainer from './components/ToastContainer';
import { AIService } from './services/aiService';
import BilanGenerator from './core/BilanGenerator';
import { ResultatGenerator } from './core/ResultatGenerator.jsx';
import { SIGGenerator } from './core/SIGGenerator';
import { analyzeFec } from './utils/fecCycleAnalyzer';
import { createSampleFECFile } from './utils/sampleFEC';
import { exportBalanceComptable as exportBalanceComptableUtil } from './utils/balanceExporter';
import { useEntrepriseSearch } from './hooks/useEntrepriseSearch';
import { useFECDataGenerators } from './hooks/useFECDataGenerators';
import { useAccountDetails } from './hooks/useAccountDetails';
import { useToast } from './hooks/useToast';

const FecParserDemo = () => {
  // États pour gérer 2 fichiers FEC (Exercice N et Exercice N-1)
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [parseResult1, setParseResult1] = useState(null);
  const [parseResult2, setParseResult2] = useState(null);
  const [cyclesResult1, setCyclesResult1] = useState(null);
  const [cyclesResult2, setCyclesResult2] = useState(null);
  const [error, setError] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [selectedCycleForDetail, setSelectedCycleForDetail] = useState(null);
  const [viewMode, setViewMode] = useState('ecritures');
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [cumulMode, setCumulMode] = useState(false);
  const [analysisCategory, setAnalysisCategory] = useState('cycles');
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [showAgent, setShowAgent] = useState(false);
  const [showSeuilParams, setShowSeuilParams] = useState(false);
  const [customSeuilParams, setCustomSeuilParams] = useState(null);
  const [programmeTravail, setProgrammeTravail] = useState(null);
  const [loadingProgramme, setLoadingProgramme] = useState(false);
  const [programmeTravailData, setProgrammeTravailData] = useState(null);
  const [showResultatN, setShowResultatN] = useState(true);
  const [showResultatN1, setShowResultatN1] = useState(false);
  const [showResultatComparaison, setShowResultatComparaison] = useState(false);
  const [showBilanN, setShowBilanN] = useState(true);
  const [showBilanN1, setShowBilanN1] = useState(false);
  const [showBilanComparaison, setShowBilanComparaison] = useState(false);

  // Hook pour la recherche d'entreprise
  const {
    siren,
    entrepriseInfo,
    loadingEntreprise,
    sirenError,
    searchEntreprise,
    handleSirenChange
  } = useEntrepriseSearch();

  // Hook pour générer les données comptables
  const { generateCompteResultat, generateBilan, generateSIG } = useFECDataGenerators(
    parseResult1,
    parseResult2,
    cyclesResult2
  );

  // Hook pour obtenir les détails des comptes
  const { getCycleDetailsByAccount, getCompteResultatDetails, getBilanDetails } = useAccountDetails(
    parseResult1,
    parseResult2
  );

  // Hook pour les notifications
  const { toasts, success, error: showError, removeToast } = useToast();

  // Fonction pour générer le programme de travail
  const handleGenerateProgramme = async () => {
    setLoadingProgramme(true);
    try {
      const context = {
        parseResult: parseResult1,
        parseResult2: parseResult2,
        cyclesResult: cyclesResult1,
        cyclesResult2: cyclesResult2,
        sig: generateSIG(),
        sig2: parseResult2 ? generateSIG(parseResult2) : null,
        bilan: generateBilan(),
        bilan2: parseResult2 ? generateBilan(parseResult2) : null,
        compteResultat: generateCompteResultat(),
        compteResultat2: parseResult2 ? generateCompteResultat(parseResult2) : null,
        entrepriseInfo
      };
      const programme = await AIService.generateProgrammeTravail(context);
      setProgrammeTravail(programme);
      
      try {
        let jsonStr = programme;
        const jsonMatch = programme.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        } else {
          const jsonStart = programme.indexOf('[');
          const jsonEnd = programme.lastIndexOf(']') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            jsonStr = programme.substring(jsonStart, jsonEnd);
          }
        }
        const parsed = JSON.parse(jsonStr.trim());
        if (Array.isArray(parsed)) {
          setProgrammeTravailData(parsed);
        }
      } catch (e) {
        console.log('Le résultat n\'est pas du JSON valide, affichage en texte brut');
      }
    } catch (error) {
      if (!error.message.includes('Clé API')) {
        setError(`Erreur lors de la génération du programme : ${error.message}`);
      }
    } finally {
      setLoadingProgramme(false);
    }
  };

  // Fonction de parsing du fichier FEC (local, peut être extraite plus tard)
  const handleParseFecFile = (fileContent, exerciceLabel = '') => {
    try {
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Le fichier est vide ou invalide');
      }

      const headers = lines[0].split('\t');
      
      if (headers.length < 18) {
        throw new Error(`Le fichier ne respecte pas le minimum de 18 colonnes requis par la norme FEC. Colonnes détectées: ${headers.length}`);
      }

      const data = [];
      let totalDebit = 0;
      let totalCredit = 0;
      const dates = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        if (values.length >= 18) {
          const debit = parseFloat(values[11].replace(',', '.')) || 0;
          const credit = parseFloat(values[12].replace(',', '.')) || 0;
          
          totalDebit += debit;
          totalCredit += credit;

          const dateStr = values[3];
          if (dateStr && dateStr.length === 8) {
            const date = new Date(
              parseInt(dateStr.substring(0, 4)),
              parseInt(dateStr.substring(4, 6)) - 1,
              parseInt(dateStr.substring(6, 8))
            );
            dates.push(date);
          }

          data.push({
            journalCode: values[0],
            journalLibelle: values[1],
            ecritureNum: values[2],
            ecritureDate: values[3],
            compteNum: values[4],
            compteLibelle: values[5],
            compteAuxNum: values[6] || '', // Compte auxiliaire numéro (vide si pas d'auxiliaire)
            compteAuxLibelle: values[7] || '', // Libellé du compte auxiliaire
            pieceRef: values[8],
            ecritureLibelle: values[10],
            debit: debit,
            credit: credit
          });
        }
      }

      const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

      return {
        success: true,
        columnsCount: headers.length,
        rowsCount: data.length,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        balance: Math.abs(totalDebit - totalCredit),
        minDate: minDate,
        maxDate: maxDate,
        data: data
      };
    } catch (err) {
      throw err;
    }
  };

  // Gestion de l'upload pour l'Exercice N
  const handleFileUpload1 = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile1(uploadedFile);
    setError(null);
    setParseResult1(null);
    setCyclesResult1(null);
    setSelectedCycleForDetail(null);
    setLoading1(true);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const result = handleParseFecFile(content, 'Exercice N');
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
    };

    reader.onerror = () => {
      const errorMsg = 'Erreur lors de la lecture du fichier Exercice N';
      setError(errorMsg);
      setLoading1(false);
      showError(errorMsg);
    };

    reader.readAsText(uploadedFile, 'UTF-8');
  };

  // Gestion de l'upload pour l'Exercice N-1
  const handleFileUpload2 = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile2(uploadedFile);
    setError(null);
    setParseResult2(null);
    setCyclesResult2(null);
    setLoading2(true);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const result = handleParseFecFile(content, 'Exercice N-1');
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
    };

    reader.onerror = () => {
      const errorMsg = 'Erreur lors de la lecture du fichier Exercice N-1';
      setError(errorMsg);
      setLoading2(false);
      showError(errorMsg);
    };

    reader.readAsText(uploadedFile, 'UTF-8');
  };

  // Fonction pour créer un fichier FEC d'exemple
  const handleCreateSampleFile = () => {
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
  };

  // Générer automatiquement le programme de travail
  useEffect(() => {
    if (analysisCategory === 'programme' && parseResult1 && !programmeTravail && !loadingProgramme) {
      const generateProgramme = async () => {
        setLoadingProgramme(true);
        try {
          const context = {
            parseResult: parseResult1,
            parseResult2: parseResult2,
            cyclesResult: cyclesResult1,
            cyclesResult2: cyclesResult2,
            sig: generateSIG(),
            sig2: parseResult2 ? generateSIG(parseResult2) : null,
            bilan: generateBilan(),
            bilan2: parseResult2 ? generateBilan(parseResult2) : null,
            compteResultat: generateCompteResultat(),
            compteResultat2: parseResult2 ? generateCompteResultat(parseResult2) : null,
            entrepriseInfo
          };
          const programme = await AIService.generateProgrammeTravail(context);
          setProgrammeTravail(programme);
          
          try {
            let jsonStr = programme;
            const jsonMatch = programme.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1];
            } else {
              const jsonStart = programme.indexOf('[');
              const jsonEnd = programme.lastIndexOf(']') + 1;
              if (jsonStart !== -1 && jsonEnd > jsonStart) {
                jsonStr = programme.substring(jsonStart, jsonEnd);
              }
            }
            const parsed = JSON.parse(jsonStr.trim());
            if (Array.isArray(parsed)) {
              setProgrammeTravailData(parsed);
            }
          } catch (e) {
            console.log('Le résultat n\'est pas du JSON valide, affichage en texte brut');
          }
        } catch (error) {
          if (!error.message.includes('Clé API')) {
            setError(`Erreur lors de la génération du programme : ${error.message}`);
          }
        } finally {
          setLoadingProgramme(false);
        }
      };
      
      if (AIService.getApiKey()) {
        generateProgramme();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisCategory, parseResult1, parseResult2, cyclesResult1, cyclesResult2, entrepriseInfo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <AppHeader 
          showAgent={showAgent}
          onToggleAgent={() => setShowAgent(!showAgent)}
          hasData={parseResult1}
        />

        {/* Recherche entreprise */}
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

        {/* Zone d'upload */}
        <FileUploadZone
          file1={file1}
          file2={file2}
          onFileUpload1={handleFileUpload1}
          onFileUpload2={handleFileUpload2}
          onCreateSampleFile={handleCreateSampleFile}
          loading1={loading1}
          loading2={loading2}
        />

        {/* Chargement - Skeleton loader */}
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
              <div className="mt-4 w-full max-w-md">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
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
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                aria-label="Fermer"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Résultats */}
        {parseResult1 && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Statistiques principales */}
            <BalanceStats
              parseResult1={parseResult1}
              parseResult2={parseResult2}
              generateCompteResultat={generateCompteResultat}
              generateBilan={generateBilan}
              onExportBalance={() => {
                try {
                  exportBalanceComptableUtil(parseResult1, parseResult2);
                  success('Balance comptable exportée avec succès');
                } catch (err) {
                  showError(`Erreur lors de l'export : ${err.message}`);
                }
              }}
            />

            {/* Assistant IA */}
            {showAgent && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <AgentPanel
                  context={{
                    parseResult: parseResult1,
                    parseResult2: parseResult2,
                    cyclesResult: cyclesResult1,
                    cyclesResult2: cyclesResult2,
                    compteResultat: generateCompteResultat(),
                    compteResultat2: parseResult2 ? generateCompteResultat(parseResult2) : null,
                    bilan: generateBilan(),
                    bilan2: parseResult2 ? generateBilan(parseResult2) : null,
                    sig: generateSIG(),
                    sig2: parseResult2 ? generateSIG(parseResult2) : null,
                    entrepriseInfo
                  }}
                />
              </div>
            )}

            {/* Onglets de catégories d'analyse */}
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
              <SIGView generateSIG={generateSIG} />
            )}

            {analysisCategory === 'programme' && (
              <ProgrammeView
                programmeTravail={programmeTravail}
                programmeTravailData={programmeTravailData}
                loadingProgramme={loadingProgramme}
                parseResult1={parseResult1}
                generateProgramme={handleGenerateProgramme}
                onUpdateProgrammeData={setProgrammeTravailData}
              />
            )}
          </div>
        )}

        {/* Container pour les notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  );
};

const App = FecParserDemo;
export default App;
