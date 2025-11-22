/**
 * FEC Context - Gestion de l'état global de l'application
 * 
 * Centralise tous les états précédemment dispersés dans App.jsx
 * Facilite le partage de données entre composants
 * 
 * @module context/FECContext
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const FECContext = createContext(null);

/**
 * Provider du contexte FEC
 */
export const FECProvider = ({ children }) => {
  // ========================================
  // ÉTATS - FICHIERS
  // ========================================
  const [file1, setFile1] = useState(null); // Exercice N (actuel)
  const [file2, setFile2] = useState(null); // Exercice N-1 (précédent)
  const [loading1, setLoading1] = useState(false); // Chargement Exercice N
  const [loading2, setLoading2] = useState(false); // Chargement Exercice N-1

  // ========================================
  // ÉTATS - RÉSULTATS D'ANALYSE
  // ========================================
  const [parseResult1, setParseResult1] = useState(null); // Résultats Exercice N
  const [parseResult2, setParseResult2] = useState(null); // Résultats Exercice N-1
  const [cyclesResult1, setCyclesResult1] = useState(null); // Cycles Exercice N
  const [cyclesResult2, setCyclesResult2] = useState(null); // Cycles Exercice N-1

  // ========================================
  // ÉTATS - UI / NAVIGATION
  // ========================================
  const [analysisCategory, setAnalysisCategory] = useState('cycles'); // 'cycles', 'resultat', 'bilan', 'sig', 'programme'
  const [selectedCycleForDetail, setSelectedCycleForDetail] = useState(null);
  const [selectedClasse, setSelectedClasse] = useState(null); // {type: 'charge'|'produit'|'actif'|'passif', classe: '60'}
  const [viewMode, setViewMode] = useState('ecritures'); // 'ecritures' ou 'solde'

  // ========================================
  // ÉTATS - GRAPHIQUES / VISUALISATION
  // ========================================
  const [selectedAccounts, setSelectedAccounts] = useState(new Set()); // Comptes sélectionnés pour courbes
  const [cumulMode, setCumulMode] = useState(false); // Mode cumul pour courbes

  // ========================================
  // ÉTATS - COMPARAISON N vs N-1
  // ========================================
  const [showResultatN, setShowResultatN] = useState(true); // Afficher exercice N
  const [showResultatN1, setShowResultatN1] = useState(false); // Afficher exercice N-1
  const [showResultatComparaison, setShowResultatComparaison] = useState(false); // Afficher comparaison

  // ========================================
  // ÉTATS - ENTREPRISE
  // ========================================
  const [siren, setSiren] = useState('');
  const [entrepriseInfo, setEntrepriseInfo] = useState(null);
  const [loadingEntreprise, setLoadingEntreprise] = useState(false);

  // ========================================
  // ÉTATS - IA / PROGRAMME DE TRAVAIL
  // ========================================
  const [showAgent, setShowAgent] = useState(false);
  const [programmeTravail, setProgrammeTravail] = useState(null);
  const [programmeTravailData, setProgrammeTravailData] = useState(null);
  const [loadingProgramme, setLoadingProgramme] = useState(false);

  // ========================================
  // ÉTATS - ERREURS
  // ========================================
  const [error, setError] = useState(null);

  // ========================================
  // ACTIONS - FICHIERS
  // ========================================
  
  const resetFile1 = useCallback(() => {
    setFile1(null);
    setParseResult1(null);
    setCyclesResult1(null);
  }, []);

  const resetFile2 = useCallback(() => {
    setFile2(null);
    setParseResult2(null);
    setCyclesResult2(null);
  }, []);

  const resetAllFiles = useCallback(() => {
    resetFile1();
    resetFile2();
    setError(null);
  }, [resetFile1, resetFile2]);

  // ========================================
  // ACTIONS - UI
  // ========================================
  
  const resetUIState = useCallback(() => {
    setSelectedCycleForDetail(null);
    setSelectedClasse(null);
    setViewMode('ecritures');
    setSelectedAccounts(new Set());
    setCumulMode(false);
  }, []);

  const toggleAccountSelection = useCallback((account) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(account)) {
        newSet.delete(account);
      } else {
        newSet.add(account);
      }
      return newSet;
    });
  }, []);

  // ========================================
  // GETTERS DÉRIVÉS
  // ========================================
  
  const parseResult = parseResult1; // Référence principale
  const cyclesResult = cyclesResult1; // Référence principale
  const isLoading = loading1 || loading2 || loadingEntreprise || loadingProgramme;
  const hasFile1 = !!file1 && !!parseResult1;
  const hasFile2 = !!file2 && !!parseResult2;
  const canCompare = hasFile1 && hasFile2;

  // ========================================
  // VALEUR DU CONTEXTE
  // ========================================
  
  const value = {
    // États - Fichiers
    file1,
    file2,
    loading1,
    loading2,
    setFile1,
    setFile2,
    setLoading1,
    setLoading2,
    
    // États - Résultats
    parseResult1,
    parseResult2,
    cyclesResult1,
    cyclesResult2,
    setParseResult1,
    setParseResult2,
    setCyclesResult1,
    setCyclesResult2,
    
    // États - UI
    analysisCategory,
    selectedCycleForDetail,
    selectedClasse,
    viewMode,
    setAnalysisCategory,
    setSelectedCycleForDetail,
    setSelectedClasse,
    setViewMode,
    
    // États - Graphiques
    selectedAccounts,
    cumulMode,
    setSelectedAccounts,
    setCumulMode,
    toggleAccountSelection,
    
    // États - Comparaison
    showResultatN,
    showResultatN1,
    showResultatComparaison,
    setShowResultatN,
    setShowResultatN1,
    setShowResultatComparaison,
    
    // États - Entreprise
    siren,
    entrepriseInfo,
    loadingEntreprise,
    setSiren,
    setEntrepriseInfo,
    setLoadingEntreprise,
    
    // États - IA
    showAgent,
    programmeTravail,
    programmeTravailData,
    loadingProgramme,
    setShowAgent,
    setProgrammeTravail,
    setProgrammeTravailData,
    setLoadingProgramme,
    
    // États - Erreurs
    error,
    setError,
    
    // Actions
    resetFile1,
    resetFile2,
    resetAllFiles,
    resetUIState,
    
    // Getters dérivés
    parseResult, // Alias pour parseResult1
    cyclesResult, // Alias pour cyclesResult1
    isLoading,
    hasFile1,
    hasFile2,
    canCompare,
  };

  return (
    <FECContext.Provider value={value}>
      {children}
    </FECContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte FEC
 * 
 * @returns {Object} Contexte FEC
 * @throws {Error} Si utilisé en dehors du FECProvider
 */
export const useFEC = () => {
  const context = useContext(FECContext);
  
  if (!context) {
    throw new Error('useFEC must be used within a FECProvider');
  }
  
  return context;
};

/**
 * Hook pour obtenir uniquement les états des fichiers
 */
export const useFECFiles = () => {
  const {
    file1,
    file2,
    loading1,
    loading2,
    setFile1,
    setFile2,
    setLoading1,
    setLoading2,
    resetFile1,
    resetFile2,
    resetAllFiles,
    hasFile1,
    hasFile2,
  } = useFEC();
  
  return {
    file1,
    file2,
    loading1,
    loading2,
    setFile1,
    setFile2,
    setLoading1,
    setLoading2,
    resetFile1,
    resetFile2,
    resetAllFiles,
    hasFile1,
    hasFile2,
  };
};

/**
 * Hook pour obtenir uniquement les résultats d'analyse
 */
export const useFECResults = () => {
  const {
    parseResult1,
    parseResult2,
    cyclesResult1,
    cyclesResult2,
    parseResult,
    cyclesResult,
    canCompare,
  } = useFEC();
  
  return {
    parseResult1,
    parseResult2,
    cyclesResult1,
    cyclesResult2,
    parseResult,
    cyclesResult,
    canCompare,
  };
};

/**
 * Hook pour obtenir uniquement l'état UI
 */
export const useFECUI = () => {
  const {
    analysisCategory,
    selectedCycleForDetail,
    selectedClasse,
    viewMode,
    setAnalysisCategory,
    setSelectedCycleForDetail,
    setSelectedClasse,
    setViewMode,
    resetUIState,
  } = useFEC();
  
  return {
    analysisCategory,
    selectedCycleForDetail,
    selectedClasse,
    viewMode,
    setAnalysisCategory,
    setSelectedCycleForDetail,
    setSelectedClasse,
    setViewMode,
    resetUIState,
  };
};

export default FECContext;
