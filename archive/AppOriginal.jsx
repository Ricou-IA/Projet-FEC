import React, { useState, useMemo, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, BarChart3, TrendingUp, Download, Sparkles, Loader2, Search, Settings, Save } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import AgentPanel from './components/AgentPanel';
import ProgrammeTravailTemplate from './components/ProgrammeTravailTemplate';
import SeuilParamsModal from './components/SeuilParamsModal';
import { AIService } from './services/aiService';
import { getAccountType, getBilanPosition, getResultatPosition, getAccountLabel, isRegularisationAccount, isTVAAccount } from './core/AccountClassifier';
import { BilanGenerator } from './core/BilanGenerator';
import { ResultatGenerator, generateCompteResultat as generateCompteResultatModule } from './core/ResultatGenerator';
import { SIGGenerator } from './core/SIGGenerator';
import CompteResultatDisplay from './components/CompteResultatDisplay';
import reglesAffectation from './data/regles-affectation-comptes.json';
import { SeuilCalculator } from './utils/seuilCalculator';
import { analyzeFec } from './utils/fecCycleAnalyzer';
import { brightenColor } from './utils/colors';
import { parseFecFile } from './utils/fecParser';
import { createSampleFECFile } from './utils/sampleFEC';
import { exportBalanceComptable as exportBalanceComptableUtil } from './utils/balanceExporter';

// FECCycleAnalyzer remplacé par des utilitaires importés (analyzeFec)

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

const FecParserDemo = () => {
  // États pour gérer 2 fichiers FEC (Exercice N et Exercice N-1)
  const [file1, setFile1] = useState(null); // Exercice N (actuel)
  const [file2, setFile2] = useState(null); // Exercice N-1 (précédent)
  const [parseResult1, setParseResult1] = useState(null); // Résultats Exercice N
  const [parseResult2, setParseResult2] = useState(null); // Résultats Exercice N-1
  const [cyclesResult1, setCyclesResult1] = useState(null); // Cycles Exercice N
  const [cyclesResult2, setCyclesResult2] = useState(null); // Cycles Exercice N-1
  const [error, setError] = useState(null);
  const [sirenError, setSirenError] = useState(null); // Erreur spécifique au champ SIREN
  const [loading1, setLoading1] = useState(false); // Chargement Exercice N
  const [loading2, setLoading2] = useState(false); // Chargement Exercice N-1
  const [selectedCycleForDetail, setSelectedCycleForDetail] = useState(null); // Pour le détail dans la répartition
  const [viewMode, setViewMode] = useState('ecritures'); // 'ecritures' ou 'solde'
  const [selectedAccounts, setSelectedAccounts] = useState(new Set()); // Comptes sélectionnés pour la courbe
  const [cumulMode, setCumulMode] = useState(false); // Mode cumul pour les courbes
  const [siren, setSiren] = useState(''); // SIREN de l'entreprise
  const [entrepriseInfo, setEntrepriseInfo] = useState(null); // Informations de l'entreprise
  const [loadingEntreprise, setLoadingEntreprise] = useState(false); // Chargement des infos entreprise
  const [analysisCategory, setAnalysisCategory] = useState('cycles'); // Catégorie d'analyse : 'cycles', 'resultat', 'bilan', 'sig', 'programme'
  const [selectedClasse, setSelectedClasse] = useState(null); // Classe sélectionnée pour le détail (format: {type: 'charge'|'produit'|'actif'|'passif', classe: '60'})
  const [showAgent, setShowAgent] = useState(false); // Afficher/masquer l'agent IA
  const [showSeuilParams, setShowSeuilParams] = useState(false); // Afficher/masquer le panneau de paramètres de seuils
  const [customSeuilParams, setCustomSeuilParams] = useState(null); // Paramètres de seuils personnalisés
  const [programmeTravail, setProgrammeTravail] = useState(null); // Programme de travail généré par l'IA (JSON structuré)
  const [loadingProgramme, setLoadingProgramme] = useState(false); // Chargement du programme
  const [programmeTravailData, setProgrammeTravailData] = useState(null); // Données structurées du programme
  const [showResultatN, setShowResultatN] = useState(true); // Afficher l'exercice N dans le compte de résultat
  const [showResultatN1, setShowResultatN1] = useState(false); // Afficher l'exercice N-1 dans le compte de résultat
  const [showResultatComparaison, setShowResultatComparaison] = useState(false); // Afficher la comparaison dans le compte de résultat
  const [showBilanN, setShowBilanN] = useState(true); // Afficher l'exercice N dans le bilan
  const [showBilanN1, setShowBilanN1] = useState(false); // Afficher l'exercice N-1 dans le bilan
  const [showBilanComparaison, setShowBilanComparaison] = useState(false); // Afficher la comparaison dans le bilan

  // Variables calculées pour compatibilité avec le code existant
  const parseResult = parseResult1; // Utiliser Exercice N comme référence principale
  const cyclesResult = cyclesResult1; // Utiliser Exercice N comme référence principale

  // Utilitaire d'analyse des cycles importé depuis ./utils/fecCycleAnalyzer

  // brightenColor importé depuis ./utils/colors

  // Générer automatiquement le programme de travail quand on change de catégorie
  useEffect(() => {
    if (analysisCategory === 'programme' && parseResult1 && !programmeTravail && !loadingProgramme) {
      const generateProgramme = async () => {
        setLoadingProgramme(true);
        try {
          const context = {
            parseResult: parseResult1,
            parseResult2: parseResult2, // Ajouter les données de l'exercice N-1
            cyclesResult: cyclesResult1,
            cyclesResult2: cyclesResult2, // Ajouter les cycles de l'exercice N-1
            sig: generateSIG(),
            sig2: parseResult2 ? generateSIG(parseResult2, cyclesResult2) : null, // SIG Exercice N-1
            bilan: generateBilan(),
            bilan2: parseResult2 ? generateBilan(parseResult2, cyclesResult2) : null, // Bilan Exercice N-1
            compteResultat: generateCompteResultat(),
            compteResultat2: parseResult2 ? generateCompteResultat(parseResult2, cyclesResult2) : null, // Compte de résultat Exercice N-1
            entrepriseInfo
          };
          const programme = await AIService.generateProgrammeTravail(context);
          setProgrammeTravail(programme);
          
          // Essayer de parser le JSON si c'est du JSON valide
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
          // Ne pas afficher d'erreur si la clé API n'est pas configurée
          if (!error.message.includes('Clé API')) {
            setError(`Erreur lors de la génération du programme : ${error.message}`);
          }
        } finally {
          setLoadingProgramme(false);
        }
      };
      
      // Vérifier si la clé API est configurée avant de générer
      if (AIService.getApiKey()) {
        generateProgramme();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisCategory, parseResult1, parseResult2, cyclesResult1, cyclesResult2, entrepriseInfo]);

  // Fonction de parsing du fichier FEC
  const parseFecFile = (fileContent, exerciceLabel = '') => {
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
        data: data // Retourner aussi les données brutes
      };

    } catch (err) {
      throw err;
    }
  };

  // Gestion de l'upload pour l'Exercice N (fichier 1)
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
        const result = parseFecFile(content, 'Exercice N');
        setParseResult1(result);

        // Analyser les cycles
        if (result.data && result.data.length > 0) {
          const cyclesAnalysis = analyzeFec(result.data);
          setCyclesResult1(cyclesAnalysis);
        }

        setLoading1(false);
      } catch (err) {
        setError(`Erreur Exercice N: ${err.message}`);
        setLoading1(false);
      }
    };

    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier Exercice N');
      setLoading1(false);
    };

    reader.readAsText(uploadedFile, 'UTF-8');
  };

  // Gestion de l'upload pour l'Exercice N-1 (fichier 2)
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
        const result = parseFecFile(content, 'Exercice N-1');
        setParseResult2(result);

        // Analyser les cycles
        if (result.data && result.data.length > 0) {
          const cyclesAnalysis = analyzeFec(result.data);
          setCyclesResult2(cyclesAnalysis);
        }

        setLoading2(false);
      } catch (err) {
        setError(`Erreur Exercice N-1: ${err.message}`);
        setLoading2(false);
      }
    };

    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier Exercice N-1');
      setLoading2(false);
    };

    reader.readAsText(uploadedFile, 'UTF-8');
  };

  const createSampleFile = () => createSampleFECFile();

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount) => {
    // Utiliser un formatage avec espacement fixe pour l'alignement
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    // Pour les nombres négatifs, s'assurer que le signe moins est bien aligné
    return formatted;
  };

  // Formatage sans décimales pour le compte de résultat
  const formatCurrencyNoDecimals = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Fonction pour exporter la balance comptable au format Excel
  const exportBalanceComptable = () => exportBalanceComptableUtil(parseResult1, parseResult2);

  // Grouper les écritures par numéro de compte et sommer les débits/crédits
  const getCycleDetailsByAccount = (cycleCode, cyclesResultParam = null) => {
    const cycles = cyclesResultParam || cyclesResult1;
    if (!cycles) return { bilan: [], resultat: [] };
    
    const cycleData = cycles.dataWithCycles.filter(row => row.cycle === cycleCode);
    
    // Grouper par numéro de compte pour l'exercice N
    const groupedByAccount = {};
    
    cycleData.forEach(row => {
      const compteNum = row.compteNum || '';
      const compteLibelle = row.compteLibelle || '';
      
      if (!groupedByAccount[compteNum]) {
        groupedByAccount[compteNum] = {
          compteNum,
          compteLibelle,
          totalDebit: 0,
          totalCredit: 0,
          solde: 0,
          soldeN1: 0
        };
      }
      
      groupedByAccount[compteNum].totalDebit += row.debit || 0;
      groupedByAccount[compteNum].totalCredit += row.credit || 0;
    });
    
    // Calculer le solde N pour chaque compte
    Object.values(groupedByAccount).forEach(account => {
      account.solde = account.totalDebit - account.totalCredit;
    });

    // Traiter l'exercice N-1 si disponible
    if (cyclesResult2 && cyclesResult2.dataWithCycles) {
      const cycleDataN1 = cyclesResult2.dataWithCycles.filter(row => row.cycle === cycleCode);
      
      cycleDataN1.forEach(row => {
        const compteNum = row.compteNum || '';
        const compteLibelle = row.compteLibelle || '';
        
        if (!groupedByAccount[compteNum]) {
          groupedByAccount[compteNum] = {
            compteNum,
            compteLibelle,
            totalDebit: 0,
            totalCredit: 0,
            solde: 0,
            totalDebitN1: 0,
            totalCreditN1: 0,
            soldeN1: 0
          };
        }
        
        if (!groupedByAccount[compteNum].totalDebitN1) {
          groupedByAccount[compteNum].totalDebitN1 = 0;
          groupedByAccount[compteNum].totalCreditN1 = 0;
        }
        
        groupedByAccount[compteNum].totalDebitN1 += row.debit || 0;
        groupedByAccount[compteNum].totalCreditN1 += row.credit || 0;
      });
      
      // Calculer le solde N-1 pour chaque compte
      Object.values(groupedByAccount).forEach(account => {
        if (account.totalDebitN1 !== undefined && account.totalCreditN1 !== undefined) {
          account.soldeN1 = account.totalDebitN1 - account.totalCreditN1;
        }
      });
    }
    
    // Séparer les comptes de bilan (classes 1-5) et de résultat (classes 6-7)
    // Utilise uniquement AccountClassifier basé sur regles-affectation-comptes.json
    const bilan = [];
    const resultat = [];
    
    Object.values(groupedByAccount).forEach(account => {
      const compteNum = account.compteNum.trim();
      
      // Utiliser AccountClassifier pour déterminer le type
      const accountType = getAccountType(compteNum);
      
      if (accountType === 'BILAN') {
        // Comptes de bilan (classes 1-5, 8)
        bilan.push(account);
      } else if (accountType === 'COMPTE_RESULTAT') {
        // Comptes de résultat (classes 6-7)
        resultat.push(account);
      } else {
        // Comptes non classés - on les met dans bilan par défaut
        console.warn(`Compte ${compteNum} non classé, mis dans bilan par défaut`);
        bilan.push(account);
      }
    });
    
    // Trier par numéro de compte croissant
    const sortByAccountNumber = (a, b) => {
      // Comparer les numéros de compte comme des chaînes pour un tri naturel
      return a.compteNum.localeCompare(b.compteNum, undefined, { numeric: true, sensitivity: 'base' });
    };
    
    bilan.sort(sortByAccountNumber);
    resultat.sort(sortByAccountNumber);
    
    return { bilan, resultat };
  };

  // Générer le Compte de Résultat (Classes 6 et 7) selon le Plan Comptable Général
  // Utilise le module ResultatGenerator
  const generateCompteResultat = (parseResultParam = null, cyclesResultParam = null) => {
    const result = parseResultParam || parseResult1;
    if (!result || !result.data) return null;

    try {
      // Utiliser le nouveau module ResultatGenerator
      const resultat = ResultatGenerator.generateCompteResultat(result);
      
      if (!resultat) {
        console.warn('ResultatGenerator.generateCompteResultat a retourné null');
        return null;
      }

      // Si c'est la structure hiérarchique, la retourner avec compatibilité tableaux
      if (resultat.formatHierarchique) {
        console.log('Compte de Résultat hiérarchique généré:', {
          chargesExploitation: resultat.charges?.exploitation?.comptes?.length || 0,
          produitsExploitation: resultat.produits?.exploitation?.comptes?.length || 0,
          resultatsIntermediaires: resultat.resultatsIntermediaires
        });
        
        // Ajouter les tableaux plats pour compatibilité avec le code existant
        // qui fait .find() sur charges et produits
        return {
          ...resultat,
          // Tableaux plats pour compatibilité avec regrouperParCategorie
          charges: resultat.chargesFlat || [],
          produits: resultat.produitsFlat || [],
          // Totaux pour compatibilité
          totalCharges: resultat.totalChargesFlat || resultat.validation?.totalCharges || 0,
          totalProduits: resultat.totalProduitsFlat || resultat.validation?.totalProduits || 0,
          resultatExercice: resultat.resultatsIntermediaires?.net || 0,
          // Chiffre d'affaires (déjà dans resultat via ...resultat, mais explicite pour clarté)
          chiffreAffaires: resultat.chiffreAffaires || 0
        };
      }

      // Si c'est la structure formatée, la convertir en structure classique pour compatibilité
      if (resultat.formatFormate) {
        const charges = [];
        const produits = [];

        // Extraire les charges depuis la structure formatée
        if (resultat.chargesExploitation?.lignes) {
          resultat.chargesExploitation.lignes.forEach(ligne => {
            charges.push({
              classe: ligne.code || '',
              libelle: ligne.libelle || '',
              solde: ligne.montant || 0,
              totalDebit: 0,
              totalCredit: 0
            });
          });
        }
        if (resultat.chargesFinancier?.lignes) {
          resultat.chargesFinancier.lignes.forEach(ligne => {
            charges.push({
              classe: ligne.code || '',
              libelle: ligne.libelle || '',
              solde: ligne.montant || 0,
              totalDebit: 0,
              totalCredit: 0
            });
          });
        }
        if (resultat.chargesExceptionnel?.lignes) {
          resultat.chargesExceptionnel.lignes.forEach(ligne => {
            charges.push({
              classe: ligne.code || '',
              libelle: ligne.libelle || '',
              solde: ligne.montant || 0,
              totalDebit: 0,
              totalCredit: 0
            });
          });
        }

        // Extraire les produits depuis la structure formatée
        if (resultat.produitsExploitation?.lignes) {
          resultat.produitsExploitation.lignes.forEach(ligne => {
            produits.push({
              classe: ligne.code || '',
              libelle: ligne.libelle || '',
              solde: ligne.montant || 0,
              totalDebit: 0,
              totalCredit: 0
            });
          });
        }
        if (resultat.produitsFinancier?.lignes) {
          resultat.produitsFinancier.lignes.forEach(ligne => {
            produits.push({
              classe: ligne.code || '',
              libelle: ligne.libelle || '',
              solde: ligne.montant || 0,
              totalDebit: 0,
              totalCredit: 0
            });
          });
        }
        if (resultat.produitsExceptionnel?.lignes) {
          resultat.produitsExceptionnel.lignes.forEach(ligne => {
            produits.push({
              classe: ligne.code || '',
              libelle: ligne.libelle || '',
              solde: ligne.montant || 0,
              totalDebit: 0,
              totalCredit: 0
            });
          });
        }

        const compteResultat = {
          charges,
          produits,
          chiffreAffaires: resultat.chiffreAffaires || 0,
          totalCharges: resultat.totalCharges || 0,
          totalProduits: resultat.totalProduits || 0,
          resultatExercice: resultat.resultatExercice || 0,
          formatFormate: true // Garder l'indicateur pour référence
        };

        // Log pour débogage
        console.log('Compte de Résultat formaté converti:', {
          chargesCount: charges.length,
          produitsCount: produits.length,
          chargesExploitation: resultat.chargesExploitation?.lignes?.length || 0,
          produitsExploitation: resultat.produitsExploitation?.lignes?.length || 0
        });

        if (charges.length === 0 && produits.length === 0) {
          console.warn('Aucune charge ou produit trouvé dans le compte de résultat formaté');
        }

        return compteResultat;
      }

      // Structure classique : convertir pour compatibilité
      const charges = Array.isArray(resultat.charges) ? resultat.charges.map(item => ({
        classe: item.classe || '',
        libelle: item.libelle || '',
        totalDebit: item.totalDebit || 0,
        totalCredit: item.totalCredit || 0,
        solde: item.solde || 0
      })) : [];

      const produits = Array.isArray(resultat.produits) ? resultat.produits.map(item => ({
        classe: item.classe || '',
        libelle: item.libelle || '',
        totalDebit: item.totalDebit || 0,
        totalCredit: item.totalCredit || 0,
        solde: item.solde || 0
      })) : [];

      const compteResultat = {
        charges,
        produits,
        chiffreAffaires: resultat.chiffreAffaires || 0,
        totalCharges: resultat.totalCharges || 0,
        totalProduits: resultat.totalProduits || 0,
        resultatExercice: resultat.resultatExercice || 0
      };

      // Log pour débogage
      console.log('Compte de Résultat classique:', {
        chargesCount: charges.length,
        produitsCount: produits.length,
        structure: 'classique'
      });

      if (charges.length === 0 && produits.length === 0) {
        console.warn('Aucune charge ou produit trouvé dans le compte de résultat');
      }

      return compteResultat;
    } catch (error) {
      console.error('Erreur lors de la génération du compte de résultat:', error);
      console.error('Stack:', error.stack);
      return null;
    }
  };

  // Récupérer les comptes détaillés d'une classe pour le Compte de Résultat
  // Utilise uniquement AccountClassifier basé sur regles-affectation-comptes.json
  const getCompteResultatDetails = (type, classe) => {
    if (!parseResult || !parseResult.data) return [];

    const filtered = parseResult.data.filter(row => {
      const compteNum = row.compteNum || '';
      const deuxPremiers = compteNum.substring(0, 2);
      
      // Utiliser AccountClassifier pour déterminer le type et la position
      const accountType = getAccountType(compteNum);
      const resultatPosition = getResultatPosition(compteNum);
      
      // Ne garder que les comptes de RESULTAT avec la bonne position et la bonne classe
      if (accountType === 'RESULTAT' && 
          ((type === 'charge' && resultatPosition === 'CHARGE') || 
           (type === 'produit' && resultatPosition === 'PRODUIT'))) {
        return deuxPremiers === classe;
      }
      return false;
    });

    // Filtrer aussi pour N-1 si disponible
    const filteredN1 = parseResult2 && parseResult2.data ? parseResult2.data.filter(row => {
      const compteNum = row.compteNum || '';
      const deuxPremiers = compteNum.substring(0, 2);
      
      // Utiliser AccountClassifier pour déterminer le type et la position
      const accountType = getAccountType(compteNum);
      const resultatPosition = getResultatPosition(compteNum);
      
      // Ne garder que les comptes de RESULTAT avec la bonne position et la bonne classe
      if (accountType === 'RESULTAT' && 
          ((type === 'charge' && resultatPosition === 'CHARGE') || 
           (type === 'produit' && resultatPosition === 'PRODUIT'))) {
        return deuxPremiers === classe;
      }
      return false;
    }) : [];

    // Grouper par compte pour N
    const grouped = {};
    filtered.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!grouped[compteNum]) {
        grouped[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || '',
          totalDebit: 0,
          totalCredit: 0,
          solde: 0,
          totalDebitN1: 0,
          totalCreditN1: 0,
          soldeN1: 0
        };
      }
      grouped[compteNum].totalDebit += row.debit || 0;
      grouped[compteNum].totalCredit += row.credit || 0;
    });

    // Grouper par compte pour N-1
    const groupedN1 = {};
    filteredN1.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!groupedN1[compteNum]) {
        groupedN1[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || '',
          totalDebit: 0,
          totalCredit: 0,
          solde: 0
        };
      }
      groupedN1[compteNum].totalDebit += row.debit || 0;
      groupedN1[compteNum].totalCredit += row.credit || 0;
    });

    // Calculer les soldes pour N
    Object.values(grouped).forEach(account => {
      if (type === 'charge') {
        account.solde = account.totalDebit - account.totalCredit;
      } else {
        account.solde = account.totalCredit - account.totalDebit;
      }
      
      // Ajouter les données N-1 si disponibles
      const accountN1 = groupedN1[account.compteNum];
      if (accountN1) {
        account.totalDebitN1 = accountN1.totalDebit;
        account.totalCreditN1 = accountN1.totalCredit;
        if (type === 'charge') {
          account.soldeN1 = accountN1.totalDebit - accountN1.totalCredit;
        } else {
          account.soldeN1 = accountN1.totalCredit - accountN1.totalDebit;
        }
      }
    });

    // Trier par numéro de compte
    return Object.values(grouped).sort((a, b) => 
      a.compteNum.localeCompare(b.compteNum, undefined, { numeric: true, sensitivity: 'base' })
    );
  };

  // Récupérer les comptes détaillés d'une classe pour le Bilan
  // Utilise uniquement AccountClassifier basé sur regles-affectation-comptes.json
  const getBilanDetails = (type, classe) => {
    if (!parseResult || !parseResult.data) return [];

    const filtered = parseResult.data.filter(row => {
      const compteNum = row.compteNum || '';
      const deuxPremiers = compteNum.substring(0, 2);
      
      // Utiliser AccountClassifier pour déterminer le type et la position
      const accountType = getAccountType(compteNum);
      const bilanPosition = getBilanPosition(compteNum);

      // Ne garder que les comptes de BILAN avec la bonne position et la bonne classe
      if (accountType === 'BILAN' && 
          ((type === 'actif' && bilanPosition === 'ACTIF') || 
           (type === 'passif' && bilanPosition === 'PASSIF'))) {
        return deuxPremiers === classe;
      }
      return false;
    });

    // Grouper par compte
    const grouped = {};
    filtered.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!grouped[compteNum]) {
        grouped[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || '',
          totalDebit: 0,
          totalCredit: 0,
          solde: 0
        };
      }
      grouped[compteNum].totalDebit += row.debit || 0;
      grouped[compteNum].totalCredit += row.credit || 0;
    });

    // Calculer les soldes
    Object.values(grouped).forEach(account => {
      if (type === 'actif') {
        account.solde = account.totalDebit - account.totalCredit;
      } else {
        account.solde = account.totalCredit - account.totalDebit;
      }
    });

    // Trier par numéro de compte
    return Object.values(grouped).sort((a, b) => 
      a.compteNum.localeCompare(b.compteNum, undefined, { numeric: true, sensitivity: 'base' })
    );
  };

  // Générer le Bilan (Classes 1 à 5) selon le Plan Comptable Général
  // Utilise le module BilanGenerator
  const generateBilan = (parseResultParam = null, cyclesResultParam = null) => {
    const result = parseResultParam || parseResult1;
    if (!result || !result.data) return null;

    try {
      // Utiliser le nouveau module BilanGenerator
      const bilan = BilanGenerator.generateBilan(result);
      
      if (!bilan) return null;

      // Convertir la structure pour compatibilité avec le code existant
      // La structure retournée par BilanGenerator est déjà compatible, on adapte juste les noms
      const convertItem = (item) => ({
        classe: item.classe || '',
        libelle: item.libelle || '',
        totalDebit: item.totalDebit || 0,
        totalCredit: item.totalCredit || 0,
        solde: item.solde || 0
      });

      const actifImmobilise = Array.isArray(bilan.actif?.immobilise) 
        ? bilan.actif.immobilise.map(convertItem) 
        : [];
      const stocks = Array.isArray(bilan.actif?.circulant?.stocks) 
        ? bilan.actif.circulant.stocks.map(convertItem) 
        : [];
      const creances = Array.isArray(bilan.actif?.circulant?.creances) 
        ? bilan.actif.circulant.creances.map(convertItem) 
        : [];
      const tresorerie = Array.isArray(bilan.actif?.circulant?.tresorerie) 
        ? bilan.actif.circulant.tresorerie.map(convertItem) 
        : [];
      const capitauxPropres = Array.isArray(bilan.passif?.capitauxPropres) 
        ? bilan.passif.capitauxPropres.map(convertItem) 
        : [];
      const dettes = Array.isArray(bilan.passif?.dettes) 
        ? bilan.passif.dettes.map(convertItem) 
        : [];

      // Log pour débogage
      if (actifImmobilise.length === 0 && stocks.length === 0 && creances.length === 0 && tresorerie.length === 0 &&
          capitauxPropres.length === 0 && dettes.length === 0) {
        console.warn('Aucun élément trouvé dans le bilan');
        console.log('Structure bilan reçue:', bilan);
      }

      return { 
        actif: {
          immobilise: actifImmobilise,
          circulant: {
            stocks: stocks,
            creances: creances,
            tresorerie: tresorerie
          },
          totalImmobilise: bilan.actif?.totalImmobilise || 0,
          totalStocks: bilan.actif?.totalStocks || 0,
          totalCreances: bilan.actif?.totalCreances || 0,
          totalTresorerie: bilan.actif?.totalTresorerie || 0,
          totalCirculant: bilan.actif?.totalCirculant || 0,
          total: bilan.actif?.total || 0
        },
        passif: {
          capitauxPropres: capitauxPropres,
          dettes: dettes,
          totalCapitauxPropres: bilan.passif?.totalCapitauxPropres || 0,
          totalDettes: bilan.passif?.totalDettes || 0,
          total: bilan.passif?.total || 0
        }
      };
    } catch (error) {
      console.error('Erreur lors de la génération du bilan:', error);
      return null;
    }
  };

  // Générer les Soldes Intermédiaires de Gestion (SIG) selon le Plan Comptable Général
  // Utilise le module SIGGenerator
  const generateSIG = (parseResultParam = null, cyclesResultParam = null) => {
    const result = parseResultParam || parseResult1;
    if (!result || !result.data) return null;

    try {
      // Utiliser le nouveau module SIGGenerator
      const sig = SIGGenerator.generateSIG(result);
      
      if (!sig) return null;

      // Convertir la structure pour compatibilité avec le code existant
      return {
        margeCommerciale: sig.margeCommerciale || 0,
        productionExercice: sig.productionExercice || 0,
        valeurAjoutee: sig.valeurAjoutee || 0,
        ebe: sig.ebe || 0,
        resultatExploitation: sig.resultatExploitation || 0,
        resultatCourantAvantImpot: sig.resultatCourantAvantImpot || 0,
        resultatExceptionnel: sig.resultatExceptionnel || 0,
        participationSalaries: sig.participationSalaries || 0,
        impotBenefices: sig.impotBenefices || 0,
        resultatNet: sig.resultatNet || 0
      };
    } catch (error) {
      console.error('Erreur lors de la génération des SIG:', error);
      return null;
    }
  };

  // Libellés des classes comptables
  const getClasseLibelle = (classe, sousClasse) => {
    const libelles = {
      1: {
        '10': 'Capital',
        '11': 'Réserves',
        '12': 'Report à nouveau',
        '13': 'Résultat net',
        '15': 'Subventions d\'investissement',
        '16': 'Emprunts et dettes',
        '17': 'Dettes rattachées',
        '18': 'Comptes de liaison'
      },
      2: {
        '20': 'Immobilisations incorporelles',
        '21': 'Immobilisations corporelles',
        '22': 'Terrains',
        '23': 'Constructions',
        '24': 'Matériel',
        '25': 'Amortissements',
        '26': 'Participations',
        '27': 'Autres immobilisations'
      },
      3: {
        '31': 'Matières premières',
        '32': 'Autres approvisionnements',
        '33': 'En-cours',
        '34': 'Produits',
        '35': 'Stocks de marchandises',
        '37': 'Stocks de services'
      },
      4: {
        '40': 'Fournisseurs',
        '41': 'Clients',
        '42': 'Personnel',
        '43': 'Sécurité sociale',
        '44': 'État',
        '45': 'Groupe',
        '46': 'Associés',
        '47': 'Débiteurs et créditeurs divers'
      },
      5: {
        '51': 'Banques',
        '52': 'Instruments de trésorerie',
        '53': 'Caisse',
        '54': 'Régies d\'avances',
        '58': 'Virements internes'
      },
      6: {
        '60': 'Achats',
        '61': 'Services extérieurs',
        '62': 'Autres services extérieurs',
        '63': 'Impôts, taxes et versements assimilés',
        '64': 'Charges de personnel',
        '65': 'Autres charges de gestion courante',
        '66': 'Charges financières',
        '67': 'Charges exceptionnelles',
        '68': 'Dotations aux amortissements',
        '69': 'Participation des salariés'
      },
      7: {
        '70': 'Ventes',
        '71': 'Production stockée',
        '72': 'Production immobilisée',
        '74': 'Subventions d\'exploitation',
        '75': 'Autres produits de gestion courante',
        '76': 'Produits financiers',
        '77': 'Produits exceptionnels',
        '78': 'Reprises sur amortissements',
        '79': 'Transferts de charges'
      }
    };

    return libelles[classe]?.[sousClasse] || `Classe ${sousClasse}`;
  };

  // Générer les données mensuelles pour les comptes sélectionnés
  const getMonthlyData = useMemo(() => {
    if (!selectedCycleForDetail || !cyclesResult || selectedAccounts.size === 0) {
      return [];
    }

    const cycleData = cyclesResult.dataWithCycles.filter(row => row.cycle === selectedCycleForDetail);
    const monthlyData = {};

    // Initialiser tous les mois de l'exercice
    if (parseResult && parseResult.minDate && parseResult.maxDate) {
      const startDate = new Date(parseResult.minDate);
      const endDate = new Date(parseResult.maxDate);
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            label: currentDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
          };
          // Initialiser chaque compte sélectionné
          selectedAccounts.forEach(compteNum => {
            monthlyData[monthKey][`${compteNum}_debit`] = 0;
            monthlyData[monthKey][`${compteNum}_credit`] = 0;
            monthlyData[monthKey][`${compteNum}_solde`] = 0;
          });
          // Initialiser le cumul si activé
          if (cumulMode) {
            monthlyData[monthKey]['cumul_solde'] = 0;
          }
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Agréger les données par mois et par compte
    cycleData.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!selectedAccounts.has(compteNum)) return;

      const dateStr = row.ecritureDate;
      if (dateStr && dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const monthKey = `${year}-${month}`;

        if (monthlyData[monthKey]) {
          monthlyData[monthKey][`${compteNum}_debit`] = (monthlyData[monthKey][`${compteNum}_debit`] || 0) + (row.debit || 0);
          monthlyData[monthKey][`${compteNum}_credit`] = (monthlyData[monthKey][`${compteNum}_credit`] || 0) + (row.credit || 0);
          monthlyData[monthKey][`${compteNum}_solde`] = monthlyData[monthKey][`${compteNum}_debit`] - monthlyData[monthKey][`${compteNum}_credit`];
        }
      }
    });

    // Calculer le cumul si activé (après avoir agrégé tous les comptes)
    if (cumulMode) {
      Object.keys(monthlyData).forEach(monthKey => {
        let cumulSolde = 0;
        selectedAccounts.forEach(compteNum => {
          cumulSolde += monthlyData[monthKey][`${compteNum}_solde`] || 0;
        });
        monthlyData[monthKey]['cumul_solde'] = cumulSolde;
      });
    }

    // Convertir en tableau et trier par mois
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedCycleForDetail, cyclesResult, selectedAccounts, parseResult, cumulMode]);

  // Toggle la sélection d'un compte
  const toggleAccountSelection = (compteNum) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compteNum)) {
        newSet.delete(compteNum);
      } else {
        newSet.add(compteNum);
      }
      return newSet;
    });
  };

  // Réinitialiser les sélections quand on change de cycle
  useEffect(() => {
    setSelectedAccounts(new Set());
  }, [selectedCycleForDetail]);

  // Rechercher les informations de l'entreprise via l'API
  const searchEntreprise = async () => {
    if (!siren || siren.length !== 9 || !/^\d+$/.test(siren)) {
      setSirenError('Le SIREN doit contenir exactement 9 chiffres');
      return;
    }

    setLoadingEntreprise(true);
    setSirenError(null); // Effacer l'erreur SIREN si valide
    setError(null);

    try {
      // API de l'annuaire des entreprises
      const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche de l\'entreprise');
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const entreprise = data.results[0];
        
        // Récupérer les détails complets de l'entreprise pour avoir le dirigeant
        let dirigeant = '';
        let codeNaf = entreprise.activite_principale || entreprise.code_activite_principale || '';
        let libelleNaf = entreprise.libelle_activite_principale || '';
        let formeJuridique = entreprise.libelle_forme_juridique || entreprise.forme_juridique || entreprise.nature_juridique || '';
        
        // Récupérer le dirigeant depuis les données de l'entreprise
        if (entreprise.dirigeants && entreprise.dirigeants.length > 0) {
          const premierDirigeant = entreprise.dirigeants[0];
          const prenom = premierDirigeant.prenom || '';
          const nom = premierDirigeant.nom || '';
          dirigeant = `${prenom} ${nom}`.trim();
          if (premierDirigeant.qualite) {
            dirigeant += ` (${premierDirigeant.qualite})`;
          }
        } else if (entreprise.representants && entreprise.representants.length > 0) {
          const premierRepresentant = entreprise.representants[0];
          const prenom = premierRepresentant.prenom || '';
          const nom = premierRepresentant.nom || '';
          dirigeant = `${prenom} ${nom}`.trim();
          if (premierRepresentant.qualite) {
            dirigeant += ` (${premierRepresentant.qualite})`;
          }
        }
        
        // Essayer de récupérer plus d'informations via l'API avec les détails complets
        try {
          const detailResponse = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=1`);
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            if (detailData.results && detailData.results.length > 0) {
              const detail = detailData.results[0];
              
              // Récupérer le dirigeant si pas déjà trouvé
              if (!dirigeant) {
                if (detail.dirigeants && detail.dirigeants.length > 0) {
                  const premierDirigeant = detail.dirigeants[0];
                  const prenom = premierDirigeant.prenom || '';
                  const nom = premierDirigeant.nom || '';
                  dirigeant = `${prenom} ${nom}`.trim();
                  if (premierDirigeant.qualite) {
                    dirigeant += ` (${premierDirigeant.qualite})`;
                  }
                } else if (detail.representants && detail.representants.length > 0) {
                  const premierRepresentant = detail.representants[0];
                  const prenom = premierRepresentant.prenom || '';
                  const nom = premierRepresentant.nom || '';
                  dirigeant = `${prenom} ${nom}`.trim();
                  if (premierRepresentant.qualite) {
                    dirigeant += ` (${premierRepresentant.qualite})`;
                  }
                }
              }
              
              // Mettre à jour le code NAF et libellé si disponibles
              if (detail.activite_principale || detail.code_activite_principale) {
                codeNaf = detail.activite_principale || detail.code_activite_principale || codeNaf;
              }
              if (detail.libelle_activite_principale) {
                libelleNaf = detail.libelle_activite_principale;
              }
              
              // Mettre à jour la forme juridique si disponible (priorité au libellé)
              if (detail.libelle_forme_juridique) {
                formeJuridique = detail.libelle_forme_juridique;
              } else if (detail.forme_juridique || detail.nature_juridique) {
                formeJuridique = detail.forme_juridique || detail.nature_juridique || formeJuridique;
              }
            }
          }
        } catch (err) {
          // Si l'API détaillée échoue, on continue avec les données de base
          console.warn('Impossible de récupérer les détails complets:', err);
        }
        
        setEntrepriseInfo({
          siren: entreprise.siren,
          siret: entreprise.siret,
          nom: entreprise.nom_complet || entreprise.nom || '',
          formeJuridique: formeJuridique,
          codeNaf: codeNaf,
          libelleNaf: libelleNaf,
          dirigeant: dirigeant,
          adresse: entreprise.siege?.adresse || '',
          ville: entreprise.siege?.ville || '',
          codePostal: entreprise.siege?.code_postal || '',
          url: `https://annuaire-entreprises.data.gouv.fr/entreprise/${entreprise.siren}`
        });
      } else {
        throw new Error('Aucune entreprise trouvée avec ce SIREN');
      }
    } catch (err) {
      setSirenError(err.message); // Afficher l'erreur sous le champ SIREN
      setEntrepriseInfo(null);
    } finally {
      setLoadingEntreprise(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="text-indigo-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-800">
                Moteur d'Ingestion FEC
              </h1>
            </div>
            {parseResult && (
              <button
                onClick={() => setShowAgent(!showAgent)}
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

          {/* Section SIREN / Informations entreprise */}
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
                    setSiren(value);
                    setSirenError(null); // Effacer l'erreur quand l'utilisateur modifie le champ
                    // Ne pas rechercher automatiquement, seulement quand on clique sur "Rechercher"
                    if (value.length !== 9) {
                      setEntrepriseInfo(null);
                    }
                  }}
                  placeholder="123456789"
                  maxLength={9}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
                {/* Message d'erreur SIREN sous le champ */}
                {sirenError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <XCircle size={16} />
                    {sirenError}
                  </p>
                )}
              </div>
              <button
                onClick={searchEntreprise}
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
        </div>

        {/* Zone d'upload */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Charger les fichiers FEC (2 exercices)
            </h2>
            <button
              onClick={createSampleFile}
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
                  onChange={handleFileUpload1}
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
                  onChange={handleFileUpload2}
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

        {/* Chargement */}
        {(loading1 || loading2) && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {loading1 && loading2 ? 'Traitement des fichiers FEC en cours...' : 
               loading1 ? 'Traitement Exercice N en cours...' : 
               'Traitement Exercice N-1 en cours...'}
            </p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-500 flex-shrink-0" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-1">
                  Erreur de traitement
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Résultats */}
        {parseResult1 && (
          <div className="space-y-6">
            {/* Statistiques principales */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="text-green-500" size={24} />
                <h2 className="text-xl font-semibold text-gray-800">
                  Traitement réussi !
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balance comptable - Colonne de gauche */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-indigo-600" size={20} />
                      <h3 className="text-lg font-semibold text-gray-800">
                        Balance comptable
                      </h3>
                    </div>
                    <button
                      onClick={exportBalanceComptable}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                      title="Exporter la balance comptable au format Excel"
                    >
                      <Download size={16} />
                      Exporter (XLS)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Colonne Exercice N */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Exercice N
                        <br />
                        <span className="font-normal">Période du {formatDate(parseResult?.minDate)} au {formatDate(parseResult?.maxDate)}</span>
                      </h4>
                      <div className="grid grid-cols-1 gap-4 mb-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600 font-medium mb-1">
                            Nombre d'écritures
                          </p>
                          <p className="text-xl font-bold text-green-900">
                            {parseResult1?.rowsCount?.toLocaleString('fr-FR')}
                          </p>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-600 font-medium mb-1">
                            Total Débit
                          </p>
                          <p className="text-xl font-bold text-blue-900">
                            {formatCurrency(parseResult.totalDebit)}
                          </p>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-lg">
                          <p className="text-sm text-orange-600 font-medium mb-1">
                            Total Crédit
                          </p>
                          <p className="text-xl font-bold text-orange-900">
                            {formatCurrency(parseResult.totalCredit)}
                          </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 font-medium mb-1">
                            Différence
                          </p>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(parseResult.balance)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Colonne Exercice N-1 */}
                    {parseResult2 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Exercice N-1
                          <br />
                          <span className="font-normal">Période du {formatDate(parseResult2?.minDate)} au {formatDate(parseResult2?.maxDate)}</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-4 mb-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600 font-medium mb-1">
                              Nombre d'écritures
                            </p>
                            <p className="text-xl font-bold text-green-900">
                              {parseResult2?.rowsCount?.toLocaleString('fr-FR')}
                            </p>
                          </div>

                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium mb-1">
                              Total Débit
                            </p>
                            <p className="text-xl font-bold text-blue-900">
                              {formatCurrency(parseResult2.totalDebit)}
                            </p>
                          </div>

                          <div className="p-4 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-600 font-medium mb-1">
                              Total Crédit
                            </p>
                            <p className="text-xl font-bold text-orange-900">
                              {formatCurrency(parseResult2.totalCredit)}
                            </p>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 font-medium mb-1">
                              Différence
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                              {formatCurrency(parseResult2.balance)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message global d'équilibre */}
                  {(() => {
                    const nEquilibre = parseResult.balance < 0.01;
                    const n1Equilibre = parseResult2 ? parseResult2.balance < 0.01 : true;
                    
                    if (nEquilibre && n1Equilibre) {
                      return (
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200 mt-4">
                          <CheckCircle className="text-green-600" size={20} />
                          <p className="text-sm text-green-700 font-medium">
                            Les balances sont équilibrées
                          </p>
                        </div>
                      );
                    } else {
                      const errors = [];
                      if (!nEquilibre) errors.push('Exercice N');
                      if (parseResult2 && !n1Equilibre) errors.push('Exercice N-1');
                      
                      return (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded border border-yellow-200 mt-4">
                          <AlertCircle className="text-yellow-600" size={20} />
                          <p className="text-sm text-yellow-700 font-medium">
                            Attention: la balance n'est pas équilibrée pour {errors.join(' et ')}
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Paramètres de l'audit - Colonne de droite */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Search className="text-indigo-600" size={20} />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Paramètres de l'audit
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Paramètres de base */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-700">
                          Paramètres de base
                        </p>
                        <button
                          onClick={() => setShowSeuilParams(true)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-medium"
                        >
                          <Settings size={14} />
                          Modifier
                        </button>
                      </div>
                      <p className="text-xs text-gray-600">
                        Utilise les paramètres par défaut du fichier Calcul-seuil.json
                      </p>
                    </div>

                    {/* Affichage des seuils calculés */}
                    {(() => {
                      const compteResultat = generateCompteResultat();
                      const bilan = generateBilan();
                      
                      // Utiliser les paramètres personnalisés s'ils existent
                      const seuils = compteResultat && bilan 
                        ? SeuilCalculator.calculateAllSeuils(compteResultat, bilan, customSeuilParams)
                        : null;
                      
                      if (!seuils) {
                        return null; // Ne rien afficher si pas de données
                      }

                      return (
                        <>
                          {/* Base de référence */}
                          <div className="p-4 bg-indigo-50 rounded-lg">
                            <p className="text-sm text-indigo-600 font-medium mb-1">
                              Base de référence
                            </p>
                            <p className="text-lg font-bold text-indigo-900">
                              {formatCurrency(seuils.details.baseReference)}
                            </p>
                            <p className="text-xs text-indigo-700 mt-1">
                              Max(CA HT: {formatCurrency(seuils.details.chiffreAffairesHT)}, 
                              Bilan: {formatCurrency(seuils.details.totalBilan)})
                            </p>
                          </div>

                          {/* Tranche appliquée */}
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-purple-600 font-medium mb-1">
                              Tranche appliquée
                            </p>
                            <p className="text-sm font-semibold text-purple-900">
                              {formatCurrency(seuils.details.tranche.min)} - {seuils.details.tranche.max ? formatCurrency(seuils.details.tranche.max) : '∞'}
                            </p>
                            <p className="text-xs text-purple-700 mt-1">
                              Pourcentage: {(seuils.details.tranche.pourcentage * 100).toFixed(2)}% | 
                              Fixe: {formatCurrency(seuils.details.tranche.montantFixe)}
                            </p>
                          </div>

                          {/* Seuil de Signification Global */}
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium mb-1">
                              Seuil de Signification Global (SSG)
                            </p>
                            <p className="text-xl font-bold text-blue-900">
                              {formatCurrency(seuils.ssg.ssgArrondi)}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Non arrondi: {formatCurrency(seuils.ssg.ssgNonArrondi)} | 
                              Calcul: {formatCurrency(seuils.ssg.calculC)} + {formatCurrency(seuils.ssg.montantFixe)}
                            </p>
                          </div>

                          {/* Seuil de remontée des anomalies */}
                          <div className="p-4 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-600 font-medium mb-1">
                              Seuil de remontée des ajustements
                            </p>
                            <p className="text-xl font-bold text-orange-900">
                              {formatCurrency(seuils.seuilRemontee)}
                            </p>
                            <p className="text-xs text-orange-700 mt-1">
                              {((customSeuilParams?.anomaly_reporting_threshold?.percentage_of_ssg || 0.03) * 100).toFixed(1)}% du SSG ({formatCurrency(seuils.ssg.ssgArrondi)})
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal de paramètres de seuils */}
            <SeuilParamsModal
              isOpen={showSeuilParams}
              onClose={() => setShowSeuilParams(false)}
              onSave={(params) => setCustomSeuilParams(params)}
              customParams={customSeuilParams}
            />

            {/* Assistant IA */}
            {parseResult1 && showAgent && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <AgentPanel
                  context={{
                    parseResult: parseResult1,
                    parseResult2: parseResult2,
                    cyclesResult: cyclesResult1,
                    cyclesResult2: cyclesResult2,
                    compteResultat: generateCompteResultat(),
                    compteResultat2: parseResult2 ? generateCompteResultat(parseResult2, cyclesResult2) : null,
                    bilan: generateBilan(),
                    bilan2: parseResult2 ? generateBilan(parseResult2, cyclesResult2) : null,
                    sig: generateSIG(),
                    sig2: parseResult2 ? generateSIG(parseResult2, cyclesResult2) : null,
                    entrepriseInfo
                  }}
                />
              </div>
            )}

            {/* Onglets de catégories d'analyse */}
            {parseResult1 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
                  <button
                    onClick={() => setAnalysisCategory('cycles')}
                    className={`px-4 py-2 font-medium transition-all border-b-2 ${
                      analysisCategory === 'cycles'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Répartition par cycle
                  </button>
                  <button
                    onClick={() => setAnalysisCategory('resultat')}
                    className={`px-4 py-2 font-medium transition-all border-b-2 ${
                      analysisCategory === 'resultat'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Compte de Résultat
                  </button>
                  <button
                    onClick={() => setAnalysisCategory('bilan')}
                    className={`px-4 py-2 font-medium transition-all border-b-2 ${
                      analysisCategory === 'bilan'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Bilan
                  </button>
                  <button
                    onClick={() => setAnalysisCategory('sig')}
                    className={`px-4 py-2 font-medium transition-all border-b-2 ${
                      analysisCategory === 'sig'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Soldes Intermédiaires de Gestion
                  </button>
                  <button
                    onClick={() => setAnalysisCategory('programme')}
                    className={`px-4 py-2 font-medium transition-all border-b-2 flex items-center gap-2 ${
                      analysisCategory === 'programme'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Sparkles size={18} />
                    Programme de travail
                  </button>
                </div>
              </div>
            )}

            {/* Synthèse - Graphique de répartition par cycle */}
            {cyclesResult1 && analysisCategory === 'cycles' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <TrendingUp size={20} />
                    Répartition par cycle
                  </h4>
                  {/* Boutons de sélection du mode */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('ecritures')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        viewMode === 'ecritures'
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Par écriture
                    </button>
                    <button
                      onClick={() => setViewMode('solde')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        viewMode === 'solde'
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Par solde
                    </button>
                  </div>
                </div>

                {/* Message explicative */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600">
                    {viewMode === 'ecritures' ? (
                      <>📊 <strong>Mode "Par écriture"</strong> : Poids de chaque cycle par rapport au total d'écritures</>
                    ) : (
                      <>💰 <strong>Mode "Par solde"</strong> : Poids de chaque cycle par rapport au total du bilan (somme des valeurs absolues des soldes)</>
                    )}
                    {' • '}
                    <span className="text-indigo-600">💡 Cliquez sur un nom de cycle pour voir le détail par compte</span>
                  </p>
                </div>

                <div className="space-y-3">
                  {(() => {
                    // Calculer le total pour le mode sélectionné
                    const cyclesFiltered = Object.entries(cyclesResult1.statsParCycle)
                      .filter(([_, stats]) => {
                        if (viewMode === 'ecritures') {
                          return stats.nbEcritures > 0;
                        } else {
                          return Math.abs(stats.solde) > 0;
                        }
                      });

                    // Calculer le total selon le mode
                    let total = 0;
                    if (viewMode === 'ecritures') {
                      total = cyclesFiltered.reduce((sum, [_, stats]) => sum + stats.nbEcritures, 0);
                    } else {
                      // Pour le solde, on prend la somme des valeurs absolues des soldes
                      total = cyclesFiltered.reduce((sum, [_, stats]) => sum + Math.abs(stats.solde), 0);
                    }

                    // Trier selon le mode
                    const sortedCycles = cyclesFiltered.sort(([_, a], [__, b]) => {
                      if (viewMode === 'ecritures') {
                        return b.nbEcritures - a.nbEcritures;
                      } else {
                        return Math.abs(b.solde) - Math.abs(a.solde);
                      }
                    });

                    return sortedCycles.map(([cycleCode, stats]) => {
                      // Récupérer les stats de l'exercice N-1 si disponible
                      const stats2 = cyclesResult2?.statsParCycle?.[cycleCode];
                      
                      // Calculer le pourcentage selon le mode
                      let percentage = 0;
                      let displayValue = '';
                      let evolutionValue = null;

                      if (viewMode === 'ecritures') {
                        percentage = total > 0 ? (stats.nbEcritures / total) * 100 : 0;
                        // Formater avec espacement pour alignement
                        const nbEcrituresFormatted = stats.nbEcritures.toLocaleString('fr-FR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        });
                        displayValue = `${nbEcrituresFormatted} écritures`;
                        if (stats2) {
                          const evolution = ((stats.nbEcritures - stats2.nbEcritures) / stats2.nbEcritures) * 100;
                          evolutionValue = {
                            value: stats2.nbEcritures,
                            evolution: evolution
                          };
                        }
                      } else {
                        const soldeAbs = Math.abs(stats.solde);
                        percentage = total > 0 ? (soldeAbs / total) * 100 : 0;
                        displayValue = formatCurrency(stats.solde);
                        if (stats2) {
                          const evolution = stats2.solde !== 0 ? ((stats.solde - stats2.solde) / Math.abs(stats2.solde)) * 100 : 0;
                          evolutionValue = {
                            value: stats2.solde,
                            evolution: evolution
                          };
                        }
                      }

                      const isSelected = selectedCycleForDetail === cycleCode;
                      const barColor = isSelected ? brightenColor(stats.color, 0.25) : stats.color;

                      return (
                        <div key={cycleCode} className="flex items-center gap-3">
                          <div 
                            className={`w-48 text-sm flex-shrink-0 truncate cursor-pointer hover:text-indigo-600 hover:underline transition-colors ${
                              isSelected ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                            }`}
                            onClick={() => setSelectedCycleForDetail(selectedCycleForDetail === cycleCode ? null : cycleCode)}
                            title="Cliquez pour voir le détail par compte"
                          >
                            {stats.nom}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden relative min-w-0">
                            {/* Barre de progression de 0 à 100% */}
                            <div
                              className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: barColor,
                                minWidth: percentage > 0 ? '2px' : '0',
                              }}
                            >
                              {percentage > 5 && (
                                <span className="text-xs font-bold text-white whitespace-nowrap">
                                  {percentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {/* Affichage du pourcentage pour les petites barres */}
                            {percentage <= 5 && percentage > 0 && (
                              <span 
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-bold whitespace-nowrap"
                                style={{ color: barColor }}
                              >
                                {percentage.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="w-40 text-sm font-semibold text-gray-800 text-right flex-shrink-0 font-mono tabular-nums">
                            {displayValue}
                            {evolutionValue && (
                              <div className={`text-xs mt-0.5 ${evolutionValue.evolution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {evolutionValue.evolution >= 0 ? '↑' : '↓'} {Math.abs(evolutionValue.evolution).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Détail par compte du cycle sélectionné */}
                {selectedCycleForDetail && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-800">
                        Détail par compte: {cyclesResult1.statsParCycle[selectedCycleForDetail]?.nom}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const accountsData = getCycleDetailsByAccount(selectedCycleForDetail);
                            const cycleName = cyclesResult1.statsParCycle[selectedCycleForDetail]?.nom || 'Cycle';
                            
                            // Créer un nouveau workbook Excel
                            const wb = XLSX.utils.book_new();
                            
                            // Préparer les données pour l'onglet BILAN
                            const bilanData = [];
                            if (accountsData.bilan.length > 0) {
                              // Titre de section en haut
                              const sectionHeader = parseResult2
                                ? ['COMPTES DE BILAN (Classes 1 à 5)', '', '', '']
                                : ['COMPTES DE BILAN (Classes 1 à 5)', '', ''];
                              bilanData.push(sectionHeader);
                              
                              // Ligne vide
                              bilanData.push([]);
                              
                              // En-têtes de colonnes
                              const headerBilan = parseResult2 
                                ? ['Numéro de compte', 'Libellé du compte', 'Solde N-1', 'Solde N']
                                : ['Numéro de compte', 'Libellé du compte', 'Solde N'];
                              bilanData.push(headerBilan);
                              
                              // Comptes de bilan (valeurs numériques, pas formatées)
                              accountsData.bilan.forEach(account => {
                                if (parseResult2) {
                                  bilanData.push([
                                    account.compteNum,
                                    account.compteLibelle,
                                    account.soldeN1 || 0,
                                    account.solde || 0
                                  ]);
                                } else {
                                  bilanData.push([
                                    account.compteNum,
                                    account.compteLibelle,
                                    account.solde || 0
                                  ]);
                                }
                              });
                              
                              // Sous-total
                              const bilanSoldeN1 = accountsData.bilan.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0);
                              const bilanSolde = accountsData.bilan.reduce((sum, acc) => sum + acc.solde, 0);
                              bilanData.push([]);
                              if (parseResult2) {
                                bilanData.push(['Sous-total Bilan', '', bilanSoldeN1, bilanSolde]);
                              } else {
                                bilanData.push(['Sous-total Bilan', '', bilanSolde]);
                              }
                            }
                            
                            // Préparer les données pour l'onglet RÉSULTAT
                            const resultatData = [];
                            if (accountsData.resultat.length > 0) {
                              // Titre de section en haut
                              const sectionHeader = parseResult2
                                ? ['COMPTES DE RÉSULTAT (Classes 6 et 7)', '', '', '']
                                : ['COMPTES DE RÉSULTAT (Classes 6 et 7)', '', ''];
                              resultatData.push(sectionHeader);
                              
                              // Ligne vide
                              resultatData.push([]);
                              
                              // En-têtes de colonnes
                              const headerResultat = parseResult2 
                                ? ['Numéro de compte', 'Libellé du compte', 'Solde N-1', 'Solde N']
                                : ['Numéro de compte', 'Libellé du compte', 'Solde N'];
                              resultatData.push(headerResultat);
                              
                              // Comptes de résultat (valeurs numériques, pas formatées)
                              accountsData.resultat.forEach(account => {
                                if (parseResult2) {
                                  resultatData.push([
                                    account.compteNum,
                                    account.compteLibelle,
                                    account.soldeN1 || 0,
                                    account.solde || 0
                                  ]);
                                } else {
                                  resultatData.push([
                                    account.compteNum,
                                    account.compteLibelle,
                                    account.solde || 0
                                  ]);
                                }
                              });
                              
                              // Sous-total
                              const resultatSoldeN1 = accountsData.resultat.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0);
                              const resultatSolde = accountsData.resultat.reduce((sum, acc) => sum + acc.solde, 0);
                              resultatData.push([]);
                              if (parseResult2) {
                                resultatData.push(['Sous-total Résultat', '', resultatSoldeN1, resultatSolde]);
                              } else {
                                resultatData.push(['Sous-total Résultat', '', resultatSolde]);
                              }
                            }
                            
                            // Fonction pour calculer la largeur optimale d'une colonne
                            const calculateColumnWidth = (data, colIndex) => {
                              let maxLength = 10; // Largeur minimale
                              data.forEach((row, rowIndex) => {
                                if (row && row[colIndex] !== undefined && row[colIndex] !== null) {
                                  const cellValue = String(row[colIndex]);
                                  // Compter les caractères (les séparateurs de milliers ajoutent de la largeur)
                                  const length = cellValue.length;
                                  if (length > maxLength) {
                                    maxLength = length;
                                  }
                                }
                              });
                              return Math.min(Math.max(maxLength + 2, 10), 60); // Entre 10 et 60 caractères
                            };
                            
                            // Fonction pour appliquer le format numérique français aux cellules
                            const applyNumberFormat = (ws, startRow, endRow, colIndex) => {
                              for (let R = startRow; R <= endRow; ++R) {
                                const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: R });
                                if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
                                  // Format français : # ##0,00 (séparateur d'espace pour milliers, virgule pour décimales)
                                  ws[cellAddress].z = '# ##0,00';
                                }
                              }
                            };
                            
                            // Créer les feuilles Excel
                            if (bilanData.length > 0) {
                              const wsBilan = XLSX.utils.aoa_to_sheet(bilanData);
                              
                              // Calculer les largeurs de colonnes automatiquement
                              const colWidths = [];
                              const numCols = parseResult2 ? 4 : 3;
                              for (let col = 0; col < numCols; col++) {
                                colWidths.push({ wch: calculateColumnWidth(bilanData, col) });
                              }
                              
                              // Ajuster les colonnes de soldes à la même taille (la plus grande)
                              if (parseResult2) {
                                const soldeWidth = Math.max(colWidths[2].wch, colWidths[3].wch);
                                colWidths[2].wch = soldeWidth;
                                colWidths[3].wch = soldeWidth;
                              }
                              
                              wsBilan['!cols'] = colWidths;
                              
                              // Mettre en forme le titre de section (ligne 1)
                              if (wsBilan['A1']) {
                                const sectionRange = parseResult2 ? XLSX.utils.decode_range('A1:D1') : XLSX.utils.decode_range('A1:C1');
                                for (let C = sectionRange.s.c; C <= sectionRange.e.c; ++C) {
                                  const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
                                  if (!wsBilan[cellAddress]) continue;
                                  wsBilan[cellAddress].s = {
                                    font: { bold: true, color: { rgb: '1F4E78' }, sz: 12 },
                                    fill: { fgColor: { rgb: 'D9E1F2' } },
                                    alignment: { horizontal: 'left', vertical: 'center' }
                                  };
                                }
                              }
                              
                              // Mettre en forme l'en-tête (ligne 3)
                              if (wsBilan['A3']) {
                                const headerRange = parseResult2 ? XLSX.utils.decode_range('A3:D3') : XLSX.utils.decode_range('A3:C3');
                                for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                                  const cellAddress = XLSX.utils.encode_cell({ c: C, r: 2 });
                                  if (!wsBilan[cellAddress]) continue;
                                  wsBilan[cellAddress].s = {
                                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                                    fill: { fgColor: { rgb: '4472C4' } },
                                    alignment: { horizontal: 'center', vertical: 'center' }
                                  };
                                }
                              }
                              
                              // Appliquer le format numérique aux colonnes de soldes
                              const lastDataRow = bilanData.length - 1;
                              if (parseResult2) {
                                // Colonne Solde N-1 (index 2)
                                applyNumberFormat(wsBilan, 3, lastDataRow, 2);
                                // Colonne Solde N (index 3)
                                applyNumberFormat(wsBilan, 3, lastDataRow, 3);
                              } else {
                                // Colonne Solde N (index 2)
                                applyNumberFormat(wsBilan, 3, lastDataRow, 2);
                              }
                              
                              XLSX.utils.book_append_sheet(wb, wsBilan, 'Bilan');
                            }
                            
                            if (resultatData.length > 0) {
                              const wsResultat = XLSX.utils.aoa_to_sheet(resultatData);
                              
                              // Calculer les largeurs de colonnes automatiquement
                              const colWidths = [];
                              const numCols = parseResult2 ? 4 : 3;
                              for (let col = 0; col < numCols; col++) {
                                colWidths.push({ wch: calculateColumnWidth(resultatData, col) });
                              }
                              
                              // Ajuster les colonnes de soldes à la même taille (la plus grande)
                              if (parseResult2) {
                                const soldeWidth = Math.max(colWidths[2].wch, colWidths[3].wch);
                                colWidths[2].wch = soldeWidth;
                                colWidths[3].wch = soldeWidth;
                              }
                              
                              wsResultat['!cols'] = colWidths;
                              
                              // Mettre en forme le titre de section (ligne 1)
                              if (wsResultat['A1']) {
                                const sectionRange = parseResult2 ? XLSX.utils.decode_range('A1:D1') : XLSX.utils.decode_range('A1:C1');
                                for (let C = sectionRange.s.c; C <= sectionRange.e.c; ++C) {
                                  const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
                                  if (!wsResultat[cellAddress]) continue;
                                  wsResultat[cellAddress].s = {
                                    font: { bold: true, color: { rgb: '385723' }, sz: 12 },
                                    fill: { fgColor: { rgb: 'E2EFDA' } },
                                    alignment: { horizontal: 'left', vertical: 'center' }
                                  };
                                }
                              }
                              
                              // Mettre en forme l'en-tête (ligne 3)
                              if (wsResultat['A3']) {
                                const headerRange = parseResult2 ? XLSX.utils.decode_range('A3:D3') : XLSX.utils.decode_range('A3:C3');
                                for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                                  const cellAddress = XLSX.utils.encode_cell({ c: C, r: 2 });
                                  if (!wsResultat[cellAddress]) continue;
                                  wsResultat[cellAddress].s = {
                                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                                    fill: { fgColor: { rgb: '70AD47' } },
                                    alignment: { horizontal: 'center', vertical: 'center' }
                                  };
                                }
                              }
                              
                              // Appliquer le format numérique aux colonnes de soldes
                              const lastDataRow = resultatData.length - 1;
                              if (parseResult2) {
                                // Colonne Solde N-1 (index 2)
                                applyNumberFormat(wsResultat, 3, lastDataRow, 2);
                                // Colonne Solde N (index 3)
                                applyNumberFormat(wsResultat, 3, lastDataRow, 3);
                              } else {
                                // Colonne Solde N (index 2)
                                applyNumberFormat(wsResultat, 3, lastDataRow, 2);
                              }
                              
                              XLSX.utils.book_append_sheet(wb, wsResultat, 'Compte de Résultat');
                            }
                            
                            // Générer le nom du fichier avec la date
                            const dateStr = new Date().toISOString().split('T')[0];
                            const fileName = `Detail_${cycleName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
                            
                            // Télécharger le fichier
                            XLSX.writeFile(wb, fileName);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                          title="Exporter en Excel (XLSX) avec 2 onglets"
                        >
                          <Download size={18} />
                          Export XLS
                        </button>
                        <button
                          onClick={() => setSelectedCycleForDetail(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {(() => {
                        const accountsData = getCycleDetailsByAccount(selectedCycleForDetail);
                        const allAccounts = [...accountsData.bilan, ...accountsData.resultat];
                        
                        return (
                          <div className="space-y-6">
                            {/* Section Comptes de Bilan */}
                            {accountsData.bilan.length > 0 && (
                              <div>
                                <div className="bg-blue-50 px-3 py-2 mb-2 rounded-t-lg">
                                  <h5 className="font-bold text-blue-800">📊 COMPTES DE BILAN (Classes 1 à 5)</h5>
                                </div>
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-200">
                                    <tr>
                                      <th className="px-3 py-2 text-center font-semibold text-gray-700 w-12">
                                        <input
                                          type="checkbox"
                                          checked={accountsData.bilan.length > 0 && accountsData.bilan.every(acc => selectedAccounts.has(acc.compteNum))}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const newSet = new Set(selectedAccounts);
                                              accountsData.bilan.forEach(acc => newSet.add(acc.compteNum));
                                              setSelectedAccounts(newSet);
                                            } else {
                                              const newSet = new Set(selectedAccounts);
                                              accountsData.bilan.forEach(acc => newSet.delete(acc.compteNum));
                                              setSelectedAccounts(newSet);
                                            }
                                          }}
                                          className="w-4 h-4"
                                        />
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                                      {parseResult2 && (
                                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>
                                      )}
                                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {accountsData.bilan.map((account, idx) => (
                                      <tr key={`bilan-${idx}`} className="border-t border-gray-200 hover:bg-gray-100">
                                        <td className="px-3 py-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={selectedAccounts.has(account.compteNum)}
                                            onChange={() => toggleAccountSelection(account.compteNum)}
                                            className="w-4 h-4 cursor-pointer"
                                          />
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                                        <td className="px-3 py-2">{account.compteLibelle}</td>
                                        {parseResult2 && (
                                          <td className={`px-3 py-2 text-right font-mono ${
                                            (account.soldeN1 || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {formatCurrency(account.soldeN1 || 0)}
                                          </td>
                                        )}
                                        <td className={`px-3 py-2 text-right font-mono font-bold ${
                                          account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {formatCurrency(account.solde)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-blue-100 font-bold">
                                    <tr>
                                      <td colSpan={parseResult2 ? "3" : "3"} className="px-3 py-2 text-right">Sous-total Bilan:</td>
                                      {parseResult2 && (
                                        <td className={`px-3 py-2 text-right font-mono ${
                                          accountsData.bilan.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {formatCurrency(accountsData.bilan.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0))}
                                        </td>
                                      )}
                                      <td className={`px-3 py-2 text-right font-mono ${
                                        accountsData.bilan.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatCurrency(accountsData.bilan.reduce((sum, acc) => sum + acc.solde, 0))}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                            
                            {/* Section Comptes de Résultat */}
                            {accountsData.resultat.length > 0 && (
                              <div>
                                <div className="bg-green-50 px-3 py-2 mb-2 rounded-t-lg">
                                  <h5 className="font-bold text-green-800">📈 COMPTES DE RÉSULTAT (Classes 6 et 7)</h5>
                                </div>
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-200">
                                    <tr>
                                      <th className="px-3 py-2 text-center font-semibold text-gray-700 w-12">
                                        <input
                                          type="checkbox"
                                          checked={accountsData.resultat.length > 0 && accountsData.resultat.every(acc => selectedAccounts.has(acc.compteNum))}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const newSet = new Set(selectedAccounts);
                                              accountsData.resultat.forEach(acc => newSet.add(acc.compteNum));
                                              setSelectedAccounts(newSet);
                                            } else {
                                              const newSet = new Set(selectedAccounts);
                                              accountsData.resultat.forEach(acc => newSet.delete(acc.compteNum));
                                              setSelectedAccounts(newSet);
                                            }
                                          }}
                                          className="w-4 h-4"
                                        />
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                                      {parseResult2 && (
                                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>
                                      )}
                                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {accountsData.resultat.map((account, idx) => (
                                      <tr key={`resultat-${idx}`} className="border-t border-gray-200 hover:bg-gray-100">
                                        <td className="px-3 py-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={selectedAccounts.has(account.compteNum)}
                                            onChange={() => toggleAccountSelection(account.compteNum)}
                                            className="w-4 h-4 cursor-pointer"
                                          />
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                                        <td className="px-3 py-2">{account.compteLibelle}</td>
                                        {parseResult2 && (
                                          <td className={`px-3 py-2 text-right font-mono ${
                                            (account.soldeN1 || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {formatCurrency(account.soldeN1 || 0)}
                                          </td>
                                        )}
                                        <td className={`px-3 py-2 text-right font-mono font-bold ${
                                          account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {formatCurrency(account.solde)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-green-100 font-bold">
                                    <tr>
                                      <td colSpan={parseResult2 ? "3" : "3"} className="px-3 py-2 text-right">Sous-total Résultat:</td>
                                      {parseResult2 && (
                                        <td className={`px-3 py-2 text-right font-mono ${
                                          accountsData.resultat.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {formatCurrency(accountsData.resultat.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0))}
                                        </td>
                                      )}
                                      <td className={`px-3 py-2 text-right font-mono ${
                                        accountsData.resultat.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatCurrency(accountsData.resultat.reduce((sum, acc) => sum + acc.solde, 0))}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                            
                            {/* Total Général */}
                            <div>
                              <table className="w-full text-sm">
                                <tfoot className="bg-gray-100 font-bold">
                                  <tr>
                                    <td colSpan={parseResult2 ? "3" : "3"} className="px-3 py-2 text-right">TOTAL GÉNÉRAL:</td>
                                    {parseResult2 && (
                                      <td className={`px-3 py-2 text-right font-mono ${
                                        allAccounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatCurrency(
                                          allAccounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0)
                                        )}
                                      </td>
                                    )}
                                    <td className={`px-3 py-2 text-right font-mono ${
                                      cyclesResult1.statsParCycle[selectedCycleForDetail]?.solde >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {formatCurrency(cyclesResult1.statsParCycle[selectedCycleForDetail]?.solde || 0)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Graphique mensuel de saisonnalité */}
                    {selectedAccounts.size > 0 && getMonthlyData.length > 0 && (
                      <div className="mt-6 p-6 bg-white rounded-lg border-2 border-indigo-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <TrendingUp size={20} />
                            Analyse de saisonnalité - Évolution mensuelle
                          </h4>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setCumulMode(!cumulMode)}
                              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                                cumulMode
                                  ? 'bg-indigo-600 text-white shadow-lg'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Cumul
                            </button>
                            <button
                              onClick={() => setSelectedAccounts(new Set())}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Désélectionner tout
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Comptes sélectionnés ({selectedAccounts.size}) :
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const accountsData = getCycleDetailsByAccount(selectedCycleForDetail);
                              const allAccounts = [...accountsData.bilan, ...accountsData.resultat];
                              return Array.from(selectedAccounts).map(compteNum => {
                                const account = allAccounts.find(acc => acc.compteNum === compteNum);
                                return account ? (
                                  <span
                                    key={compteNum}
                                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium flex items-center gap-2"
                                  >
                                    {account.compteNum} - {account.compteLibelle}
                                    <button
                                      onClick={() => toggleAccountSelection(compteNum)}
                                      className="text-indigo-600 hover:text-indigo-800"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  </span>
                                ) : null;
                              });
                            })()}
                          </div>
                        </div>

                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getMonthlyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                dataKey="label" 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                                tickFormatter={(value) => {
                                  if (Math.abs(value) >= 1000000) {
                                    return `${(value / 1000000).toFixed(1)}M€`;
                                  } else if (Math.abs(value) >= 1000) {
                                    return `${(value / 1000).toFixed(0)}k€`;
                                  }
                                  return `${value.toFixed(0)}€`;
                                }}
                              />
                              <Tooltip
                                formatter={(value, name) => {
                                  const formattedValue = formatCurrency(value);
                                  if (name === 'cumul_solde') {
                                    return [formattedValue, 'Cumul (Solde total)'];
                                  }
                                  const accountInfo = name.split('_');
                                  const compteNum = accountInfo[0];
                                  const accountsData = getCycleDetailsByAccount(selectedCycleForDetail);
                                  const allAccounts = [...accountsData.bilan, ...accountsData.resultat];
                                  const account = allAccounts.find(acc => acc.compteNum === compteNum);
                                  return [
                                    formattedValue,
                                    `${account?.compteLibelle || compteNum} (Solde)`
                                  ];
                                }}
                                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                              />
                              <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => {
                                  if (value === 'cumul_solde') {
                                    return 'Cumul (Solde total)';
                                  }
                                  const accountInfo = value.split('_');
                                  const compteNum = accountInfo[0];
                                  const accountsData = getCycleDetailsByAccount(selectedCycleForDetail);
                                  const allAccounts = [...accountsData.bilan, ...accountsData.resultat];
                                  const account = allAccounts.find(acc => acc.compteNum === compteNum);
                                  return `${account?.compteLibelle || compteNum}`;
                                }}
                              />
                              {/* Ligne de cumul si activée */}
                              {cumulMode && (
                                <Line
                                  key="cumul_solde"
                                  type="monotone"
                                  dataKey="cumul_solde"
                                  stroke="#1e40af"
                                  strokeWidth={3}
                                  dot={{ r: 5 }}
                                  activeDot={{ r: 7 }}
                                  name="cumul_solde"
                                />
                              )}
                              {/* Lignes individuelles des comptes */}
                              {Array.from(selectedAccounts).map((compteNum, idx) => {
                                const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                                const pastelColors = ['#93c5fd', '#fca5a5', '#86efac', '#fde047', '#c4b5fd', '#f9a8d4', '#67e8f9', '#bef264'];
                                const color = cumulMode ? pastelColors[idx % pastelColors.length] : colors[idx % colors.length];
                                const strokeWidth = cumulMode ? 1.5 : 2;
                                return (
                                  <Line
                                    key={`${compteNum}_solde`}
                                    type="monotone"
                                    dataKey={`${compteNum}_solde`}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeOpacity={cumulMode ? 0.6 : 1}
                                    dot={{ r: cumulMode ? 3 : 4 }}
                                    activeDot={{ r: cumulMode ? 5 : 6 }}
                                    name={`${compteNum}_solde`}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-600">
                            💡 <strong>Analyse de saisonnalité</strong> : Cette courbe montre l'évolution mensuelle du solde des comptes sélectionnés sur l'exercice. 
                            Les pics et creux permettent d'identifier les périodes de forte activité ou de saisonnalité.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Compte de Résultat */}
            {analysisCategory === 'resultat' && generateCompteResultat() && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 size={20} />
                    Compte de Résultat
                  </h4>
                  {/* Checkboxes pour sélectionner les colonnes à afficher */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showResultatN}
                        onChange={(e) => setShowResultatN(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">N</span>
                    </label>
                    {parseResult2 && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showResultatN1}
                            onChange={(e) => setShowResultatN1(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700">N-1</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showResultatComparaison}
                            onChange={(e) => setShowResultatComparaison(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700">Comparaison</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
                {/* Présentation en 3 colonnes : Charges / Produits / Résultats */}
                {(() => {
                  const compteResultatN = generateCompteResultat();
                  const compteResultatN1 = parseResult2 ? generateCompteResultat(parseResult2, cyclesResult2) : null;

                  // Vérifications de sécurité
                  if (!compteResultatN) {
                    console.warn('compteResultatN est null ou undefined');
                    return <div className="text-center text-gray-500 py-8">Aucune donnée disponible</div>;
                  }

                  // Note: La structure hiérarchique est déjà convertie avec les tableaux plats
                  // dans la fonction generateCompteResultat (lignes 451-461), donc pas besoin de re-conversion ici

                  if (!compteResultatN.charges || !Array.isArray(compteResultatN.charges)) {
                    console.warn('compteResultatN.charges n\'est pas un tableau:', compteResultatN);
                    return <div className="text-center text-gray-500 py-8">Structure de données invalide</div>;
                  }

                  if (!compteResultatN.produits || !Array.isArray(compteResultatN.produits)) {
                    console.warn('compteResultatN.produits n\'est pas un tableau:', compteResultatN);
                    return <div className="text-center text-gray-500 py-8">Structure de données invalide</div>;
                  }

                  // Log pour débogage
                  console.log('Compte de Résultat N:', {
                    chargesCount: compteResultatN.charges.length,
                    produitsCount: compteResultatN.produits.length,
                    charges: compteResultatN.charges.slice(0, 3),
                    produits: compteResultatN.produits.slice(0, 3)
                  });

                  // Classification des classes par catégorie selon le PCG
                  const classification = {
                    exploitation: {
                      charges: ['60', '61', '62', '63', '64', '65', '68', '69'],
                      produits: ['70', '71', '75']
                    },
                    financier: {
                      charges: ['66'],
                      produits: ['76']
                    },
                    exceptionnel: {
                      charges: ['67'],
                      produits: ['77', '79']
                    }
                  };

                  // Fonction pour regrouper par catégorie
                  const regrouperParCategorie = (items, type) => {
                    if (!items || !Array.isArray(items)) {
                      return {
                        exploitation: [],
                        financier: [],
                        exceptionnel: []
                      };
                    }

                    const result = {
                      exploitation: [],
                      financier: [],
                      exceptionnel: []
                    };

                    items.forEach(item => {
                      const classe = item.classe;
                      
                      // Log pour débogage
                      if (!item.classe) {
                        console.warn('Item sans classe:', item);
                      }
                      
                      // Vérifier si la classe commence par les préfixes attendus
                      const classeStr = String(classe || '');
                      const matchExploitation = classification.exploitation[type] && 
                        classification.exploitation[type].some(c => classeStr.startsWith(c));
                      const matchFinancier = classification.financier[type] && 
                        classification.financier[type].some(c => classeStr.startsWith(c));
                      const matchExceptionnel = classification.exceptionnel[type] && 
                        classification.exceptionnel[type].some(c => classeStr.startsWith(c));
                      
                      if (matchExploitation) {
                        result.exploitation.push(item);
                      } else if (matchFinancier) {
                        result.financier.push(item);
                      } else if (matchExceptionnel) {
                        result.exceptionnel.push(item);
                      } else {
                        // Log si aucune correspondance trouvée
                        console.log(`Classe ${classe} (type ${type}) non classifiée dans:`, {
                          exploitation: classification.exploitation[type],
                          financier: classification.financier[type],
                          exceptionnel: classification.exceptionnel[type]
                        });
                      }
                    });

                    return result;
                  };

                  const chargesN = regrouperParCategorie(compteResultatN.charges, 'charges');
                  const produitsN = regrouperParCategorie(compteResultatN.produits, 'produits');
                  const chargesN1 = compteResultatN1 ? regrouperParCategorie(compteResultatN1.charges || [], 'charges') : null;
                  const produitsN1 = compteResultatN1 ? regrouperParCategorie(compteResultatN1.produits || [], 'produits') : null;

                  // Log pour débogage des catégories
                  console.log('Charges et Produits regroupés:', {
                    chargesN: {
                      exploitation: chargesN.exploitation.length,
                      financier: chargesN.financier.length,
                      exceptionnel: chargesN.exceptionnel.length
                    },
                    produitsN: {
                      exploitation: produitsN.exploitation.length,
                      financier: produitsN.financier.length,
                      exceptionnel: produitsN.exceptionnel.length
                    },
                    premiereCharge: compteResultatN.charges[0],
                    premierProduit: compteResultatN.produits[0]
                  });

                  // Calculer les totaux par catégorie
                  const calculerTotal = (items) => {
                    if (!items || !Array.isArray(items)) return 0;
                    return items.reduce((sum, item) => sum + (item.solde || 0), 0);
                  };

                  const totauxChargesN = {
                    exploitation: calculerTotal(chargesN.exploitation),
                    financier: calculerTotal(chargesN.financier),
                    exceptionnel: calculerTotal(chargesN.exceptionnel)
                  };

                  const totauxProduitsN = {
                    exploitation: calculerTotal(produitsN.exploitation),
                    financier: calculerTotal(produitsN.financier),
                    exceptionnel: calculerTotal(produitsN.exceptionnel)
                  };

                  const totauxChargesN1 = chargesN1 ? {
                    exploitation: calculerTotal(chargesN1.exploitation),
                    financier: calculerTotal(chargesN1.financier),
                    exceptionnel: calculerTotal(chargesN1.exceptionnel)
                  } : null;

                  const totauxProduitsN1 = produitsN1 ? {
                    exploitation: calculerTotal(produitsN1.exploitation),
                    financier: calculerTotal(produitsN1.financier),
                    exceptionnel: calculerTotal(produitsN1.exceptionnel)
                  } : null;

                  // Calculer les résultats par catégorie
                  const resultatsN = {
                    exploitation: totauxProduitsN.exploitation - totauxChargesN.exploitation,
                    financier: totauxProduitsN.financier - totauxChargesN.financier,
                    exceptionnel: totauxProduitsN.exceptionnel - totauxChargesN.exceptionnel
                  };

                  const resultatsN1 = totauxProduitsN1 ? {
                    exploitation: totauxProduitsN1.exploitation - totauxChargesN1.exploitation,
                    financier: totauxProduitsN1.financier - totauxChargesN1.financier,
                    exceptionnel: totauxProduitsN1.exceptionnel - totauxChargesN1.exceptionnel
                  } : null;

                  // Fonction pour afficher une section de catégorie avec total
                  const renderCategorieSection = (titre, items, itemsN1, couleur, type, totalN, totalN1) => {
                    // Log pour débogage
                    console.log(`renderCategorieSection(${titre}):`, {
                      itemsLength: items ? items.length : 0,
                      itemsN1Length: itemsN1 ? itemsN1.length : 0,
                      totalN,
                      items: items ? items.slice(0, 2) : null
                    });

                    if (!items || items.length === 0) {
                      if (!itemsN1 || itemsN1.length === 0) {
                        // Retourner null seulement si vraiment aucune donnée
                        return null;
                      }
                      // Si on a des données N1 mais pas N, afficher quand même
                    }

                    const variation = totalN1 !== null ? totalN - totalN1 : null;
                    const variationPercent = totalN1 !== null && totalN1 !== 0 
                      ? ((totalN - totalN1) / Math.abs(totalN1)) * 100 
                      : null;

                    return (
                      <div className="flex flex-col h-full">
                        <div className={`${couleur} px-3 py-2 mb-2 rounded font-bold text-sm`}>
                          {titre}
                        </div>
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="flex-1 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-200">
                                <tr>
                                  <th className="px-2 py-1 text-left font-semibold text-gray-700">Classe</th>
                                  <th className="px-2 py-1 text-left font-semibold text-gray-700">Libellé</th>
                                  {showResultatN && (
                                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N</th>
                                  )}
                                  {showResultatN1 && parseResult2 && (
                                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N-1</th>
                                  )}
                                  {showResultatComparaison && parseResult2 && (
                                    <th className="px-2 py-1 text-right font-semibold text-gray-700">Var</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => {
                                  const itemN1 = itemsN1?.find(i => i.classe === item.classe);
                                  const itemVariation = itemN1 ? item.solde - itemN1.solde : null;
                                  const itemVariationPercent = itemN1 && itemN1.solde !== 0 
                                    ? ((item.solde - itemN1.solde) / Math.abs(itemN1.solde)) * 100 
                                    : null;

                                  return (
                                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                                      <td className="px-2 py-1 font-mono text-xs">{item.classe}</td>
                                      <td 
                                        className="px-2 py-1 cursor-pointer hover:text-indigo-600 hover:underline transition-colors text-xs"
                                        onClick={() => setSelectedClasse(selectedClasse?.type === type && selectedClasse?.classe === item.classe ? null : { type, classe: item.classe })}
                                        title="Cliquez pour voir le détail"
                                      >
                                        {item.libelle}
                                      </td>
                                      {showResultatN && (
                                        <td className={`px-2 py-1 text-right font-mono text-xs font-bold ${
                                          type === 'charge' ? 'text-red-700' : 'text-green-700'
                                        }`}>
                                          {formatCurrencyNoDecimals(item.solde)}
                                        </td>
                                      )}
                                      {showResultatN1 && parseResult2 && (
                                        <td className={`px-2 py-1 text-right font-mono text-xs ${
                                          type === 'charge' ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                          {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                                        </td>
                                      )}
                                      {showResultatComparaison && parseResult2 && (
                                        <td className={`px-2 py-1 text-right font-mono text-xs ${
                                          itemVariation === null ? 'text-gray-400' : 
                                          (type === 'charge' ? (itemVariation >= 0 ? 'text-red-600' : 'text-green-600') : 
                                           (itemVariation >= 0 ? 'text-green-600' : 'text-red-600'))
                                        }`}>
                                          {itemVariation !== null ? (
                                            <>
                                              {itemVariation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(itemVariation)}
                                              {itemVariationPercent !== null && (
                                                <span className="ml-1">
                                                  ({itemVariationPercent >= 0 ? '+' : ''}{itemVariationPercent.toFixed(1)}%)
                                                </span>
                                              )}
                                            </>
                                          ) : '-'}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {/* Total aligné en bas */}
                          <div className={`${couleur.replace('50', '100')} font-bold mt-auto`}>
                            <table className="w-full text-xs">
                              <tfoot>
                                <tr>
                                  <td colSpan={showResultatN ? (showResultatN1 && parseResult2 ? (showResultatComparaison && parseResult2 ? 5 : 4) : 3) : 2} className="px-2 py-2 text-right text-xs">
                                    Total {titre}:
                                  </td>
                                  {showResultatN && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      type === 'charge' ? 'text-red-800' : 'text-green-800'
                                    }`}>
                                      {formatCurrencyNoDecimals(totalN)}
                                    </td>
                                  )}
                                  {showResultatN1 && parseResult2 && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      type === 'charge' ? 'text-red-700' : 'text-green-700'
                                    }`}>
                                      {formatCurrencyNoDecimals(totalN1 || 0)}
                                    </td>
                                  )}
                                  {showResultatComparaison && parseResult2 && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      variation === null ? 'text-gray-400' : 
                                      (type === 'charge' ? (variation >= 0 ? 'text-red-600' : 'text-green-600') : 
                                       (variation >= 0 ? 'text-green-600' : 'text-red-600'))
                                    }`}>
                                      {variation !== null ? (
                                        <>
                                          {variation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(variation)}
                                          {variationPercent !== null && (
                                            <span className="ml-1">
                                              ({variationPercent >= 0 ? '+' : ''}{variationPercent.toFixed(1)}%)
                                            </span>
                                          )}
                                        </>
                                      ) : '-'}
                                    </td>
                                  )}
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  // Fonction pour afficher une ligne de total alignée
                  const renderTotalLigne = (titre, totalN, totalN1, couleur, type) => {
                    const variation = totalN1 !== null ? totalN - totalN1 : null;
                    const variationPercent = totalN1 !== null && totalN1 !== 0 ? (variation / Math.abs(totalN1)) * 100 : null;

                    return (
                      <div className={`${couleur.replace('50', '100')} px-3 py-2 rounded font-bold text-xs`}>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Colonne Charges */}
                          <div className="text-right">
                            <span className="text-gray-700">Total {titre}:</span>
                            <div className="flex justify-end gap-2 mt-1">
                              {showResultatN && (
                                <span className={`font-mono ${
                                  type === 'charge' ? 'text-red-800' : 'text-green-800'
                                }`}>
                                  {formatCurrencyNoDecimals(totalN)}
                                </span>
                              )}
                              {showResultatN1 && parseResult2 && (
                                <span className={`font-mono ${
                                  type === 'charge' ? 'text-red-700' : 'text-green-700'
                                }`}>
                                  {formatCurrencyNoDecimals(totalN1)}
                                </span>
                              )}
                              {showResultatComparaison && parseResult2 && variation !== null && (
                                <span className={`font-mono text-xs ${
                                  type === 'charge' ? (variation >= 0 ? 'text-red-600' : 'text-green-600') : 
                                  (variation >= 0 ? 'text-green-600' : 'text-red-600')
                                }`}>
                                  {variation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(variation)}
                                  {variationPercent !== null && (
                                    <span className="ml-1">
                                      ({variationPercent >= 0 ? '+' : ''}{variationPercent.toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Colonne Produits */}
                          <div className="text-right">
                            <span className="text-gray-700">Total {titre}:</span>
                            <div className="flex justify-end gap-2 mt-1">
                              {showResultatN && (
                                <span className={`font-mono ${
                                  type === 'produit' ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {formatCurrencyNoDecimals(totalN)}
                                </span>
                              )}
                              {showResultatN1 && parseResult2 && (
                                <span className={`font-mono ${
                                  type === 'produit' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {formatCurrencyNoDecimals(totalN1)}
                                </span>
                              )}
                              {showResultatComparaison && parseResult2 && variation !== null && (
                                <span className={`font-mono text-xs ${
                                  type === 'produit' ? (variation >= 0 ? 'text-green-600' : 'text-red-600') : 
                                  (variation >= 0 ? 'text-red-600' : 'text-green-600')
                                }`}>
                                  {variation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(variation)}
                                  {variationPercent !== null && (
                                    <span className="ml-1">
                                      ({variationPercent >= 0 ? '+' : ''}{variationPercent.toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Colonne Résultats */}
                          <div className="text-right">
                            <span className="text-gray-700">Résultat {titre.toLowerCase()}:</span>
                            <div className="flex justify-end gap-2 mt-1">
                              {showResultatN && (
                                <span className={`font-mono ${
                                  (type === 'produit' ? totalN : -totalN) >= 0 ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {formatCurrencyNoDecimals(type === 'produit' ? totalN - (type === 'charge' ? totalN : 0) : (type === 'charge' ? totalN : 0) - totalN)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  // Fonction pour rendre une section de résultat
                  const renderResultatSection = (titre, couleur, totalProduitsN, totalChargesN, totalProduitsN1, totalChargesN1, resultatN, resultatN1) => {
                    return (
                      <div className="flex flex-col h-full">
                        <div className={`${couleur} px-3 py-2 mb-2 rounded font-bold text-sm`}>
                          {titre}
                        </div>
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="flex-1 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-200">
                                <tr>
                                  <th className="px-2 py-1 text-left font-semibold text-gray-700">Libellé</th>
                                  {showResultatN && (
                                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N</th>
                                  )}
                                  {showResultatN1 && parseResult2 && (
                                    <th className="px-2 py-1 text-right font-semibold text-gray-700">N-1</th>
                                  )}
                                  {showResultatComparaison && parseResult2 && (
                                    <th className="px-2 py-1 text-right font-semibold text-gray-700">Var</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-2 py-2 text-xs">Produits</td>
                                  {showResultatN && (
                                    <td className="px-2 py-2 text-right font-mono text-xs text-green-700">
                                      {formatCurrencyNoDecimals(totalProduitsN)}
                                    </td>
                                  )}
                                  {showResultatN1 && parseResult2 && (
                                    <td className="px-2 py-2 text-right font-mono text-xs text-green-600">
                                      {formatCurrencyNoDecimals(totalProduitsN1 || 0)}
                                    </td>
                                  )}
                                  {showResultatComparaison && parseResult2 && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      ((totalProduitsN - (totalProduitsN1 || 0)) >= 0) ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {((totalProduitsN - (totalProduitsN1 || 0)) >= 0) ? '+' : ''}
                                      {formatCurrencyNoDecimals(totalProduitsN - (totalProduitsN1 || 0))}
                                    </td>
                                  )}
                                </tr>
                                <tr>
                                  <td className="px-2 py-2 text-xs">Charges</td>
                                  {showResultatN && (
                                    <td className="px-2 py-2 text-right font-mono text-xs text-red-700">
                                      {formatCurrencyNoDecimals(totalChargesN)}
                                    </td>
                                  )}
                                  {showResultatN1 && parseResult2 && (
                                    <td className="px-2 py-2 text-right font-mono text-xs text-red-600">
                                      {formatCurrencyNoDecimals(totalChargesN1 || 0)}
                                    </td>
                                  )}
                                  {showResultatComparaison && parseResult2 && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      ((totalChargesN - (totalChargesN1 || 0)) >= 0) ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      {((totalChargesN - (totalChargesN1 || 0)) >= 0) ? '+' : ''}
                                      {formatCurrencyNoDecimals(totalChargesN - (totalChargesN1 || 0))}
                                    </td>
                                  )}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          {/* Résultat aligné en bas */}
                          <div className={`${couleur.replace('50', '100')} font-bold mt-auto`}>
                            <table className="w-full text-xs">
                              <tfoot>
                                <tr>
                                  <td className="px-2 py-2 text-right text-xs">Résultat:</td>
                                  {showResultatN && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      resultatN >= 0 ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                      {formatCurrencyNoDecimals(resultatN)}
                                    </td>
                                  )}
                                  {showResultatN1 && parseResult2 && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      (resultatN1 || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {formatCurrencyNoDecimals(resultatN1 || 0)}
                                    </td>
                                  )}
                                  {showResultatComparaison && parseResult2 && (
                                    <td className={`px-2 py-2 text-right font-mono text-xs ${
                                      ((resultatN - (resultatN1 || 0)) >= 0) ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {((resultatN - (resultatN1 || 0)) >= 0) ? '+' : ''}
                                      {formatCurrencyNoDecimals(resultatN - (resultatN1 || 0))}
                                    </td>
                                  )}
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  // Vérifier s'il y a des données à afficher
                  const hasExploitationData = (chargesN.exploitation && chargesN.exploitation.length > 0) || 
                                            (produitsN.exploitation && produitsN.exploitation.length > 0) ||
                                            (chargesN1?.exploitation && chargesN1.exploitation.length > 0) ||
                                            (produitsN1?.exploitation && produitsN1.exploitation.length > 0);
                  
                  const hasFinancierData = (chargesN.financier && chargesN.financier.length > 0) || 
                                          (produitsN.financier && produitsN.financier.length > 0) ||
                                          (chargesN1?.financier && chargesN1.financier.length > 0) ||
                                          (produitsN1?.financier && produitsN1.financier.length > 0);
                  
                  const hasExceptionnelData = (chargesN.exceptionnel && chargesN.exceptionnel.length > 0) || 
                                             (produitsN.exceptionnel && produitsN.exceptionnel.length > 0) ||
                                             (chargesN1?.exceptionnel && chargesN1.exceptionnel.length > 0) ||
                                             (produitsN1?.exceptionnel && produitsN1.exceptionnel.length > 0);

                  // Si aucune donnée, afficher un message
                  if (!hasExploitationData && !hasFinancierData && !hasExceptionnelData) {
                    return (
                      <div className="text-center text-gray-500 py-8">
                        <p className="mb-2">Aucune donnée de compte de résultat trouvée.</p>
                        <p className="text-sm">Vérifiez que votre fichier FEC contient des comptes de classe 6 (charges) et 7 (produits).</p>
                        <p className="text-xs mt-2 text-gray-400">
                          Charges trouvées: {compteResultatN.charges.length}, Produits trouvées: {compteResultatN.produits.length}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* En-têtes des colonnes */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <h5 className="font-bold text-red-700 mb-3 text-center bg-red-50 py-2 rounded">CHARGES</h5>
                        </div>
                        <div>
                          <h5 className="font-bold text-green-700 mb-3 text-center bg-green-50 py-2 rounded">PRODUITS</h5>
                        </div>
                        <div>
                          <h5 className="font-bold text-indigo-700 mb-3 text-center bg-indigo-50 py-2 rounded">RÉSULTATS</h5>
                        </div>
                      </div>

                      {/* Pavé Exploitation */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                        <div className="flex flex-col">
                          {renderCategorieSection('Exploitation', chargesN.exploitation, chargesN1?.exploitation, 'bg-blue-50', 'charge', totauxChargesN.exploitation, totauxChargesN1?.exploitation)}
                        </div>
                        <div className="flex flex-col">
                          {renderCategorieSection('Exploitation', produitsN.exploitation, produitsN1?.exploitation, 'bg-blue-50', 'produit', totauxProduitsN.exploitation, totauxProduitsN1?.exploitation)}
                        </div>
                        <div className="flex flex-col">
                          {renderResultatSection(
                            'Résultat d\'Exploitation',
                            'bg-blue-50',
                            totauxProduitsN.exploitation,
                            totauxChargesN.exploitation,
                            totauxProduitsN1?.exploitation,
                            totauxChargesN1?.exploitation,
                            resultatsN.exploitation,
                            resultatsN1?.exploitation
                          )}
                        </div>
                      </div>

                      {/* Pavé Financier */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                        <div className="flex flex-col">
                          {renderCategorieSection('Financier', chargesN.financier, chargesN1?.financier, 'bg-purple-50', 'charge', totauxChargesN.financier, totauxChargesN1?.financier)}
                        </div>
                        <div className="flex flex-col">
                          {renderCategorieSection('Financier', produitsN.financier, produitsN1?.financier, 'bg-purple-50', 'produit', totauxProduitsN.financier, totauxProduitsN1?.financier)}
                        </div>
                        <div className="flex flex-col">
                          {renderResultatSection(
                            'Résultat Financier',
                            'bg-purple-50',
                            totauxProduitsN.financier,
                            totauxChargesN.financier,
                            totauxProduitsN1?.financier,
                            totauxChargesN1?.financier,
                            resultatsN.financier,
                            resultatsN1?.financier
                          )}
                        </div>
                      </div>

                      {/* Pavé Exceptionnel */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                        <div className="flex flex-col">
                          {renderCategorieSection('Exceptionnel', chargesN.exceptionnel, chargesN1?.exceptionnel, 'bg-orange-50', 'charge', totauxChargesN.exceptionnel, totauxChargesN1?.exceptionnel)}
                        </div>
                        <div className="flex flex-col">
                          {renderCategorieSection('Exceptionnel', produitsN.exceptionnel, produitsN1?.exceptionnel, 'bg-orange-50', 'produit', totauxProduitsN.exceptionnel, totauxProduitsN1?.exceptionnel)}
                        </div>
                        <div className="flex flex-col">
                          {renderResultatSection(
                            'Résultat Exceptionnel',
                            'bg-orange-50',
                            totauxProduitsN.exceptionnel,
                            totauxChargesN.exceptionnel,
                            totauxProduitsN1?.exceptionnel,
                            totauxChargesN1?.exceptionnel,
                            resultatsN.exceptionnel,
                            resultatsN1?.exceptionnel
                          )}
                        </div>
                      </div>

                      {/* Résultat Net - en pleine largeur */}
                      <div className="mt-6 p-3 bg-indigo-100 rounded-lg border-2 border-indigo-300">
                        <div className="font-bold text-sm mb-2">Résultat Net</div>
                        <div className="flex flex-col gap-2">
                          {showResultatN && (
                            <div className={`text-lg font-bold font-mono ${
                              resultatsN.exploitation + resultatsN.financier + resultatsN.exceptionnel >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              N: {formatCurrencyNoDecimals(resultatsN.exploitation + resultatsN.financier + resultatsN.exceptionnel)}
                            </div>
                          )}
                          {showResultatN1 && parseResult2 && (
                            <div className={`text-base font-bold font-mono ${
                              resultatsN1.exploitation + resultatsN1.financier + resultatsN1.exceptionnel >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              N-1: {formatCurrencyNoDecimals(resultatsN1.exploitation + resultatsN1.financier + resultatsN1.exceptionnel)}
                            </div>
                          )}
                          {showResultatComparaison && parseResult2 && (
                            <div className={`text-sm font-bold font-mono ${
                              ((resultatsN.exploitation + resultatsN.financier + resultatsN.exceptionnel) - 
                               (resultatsN1.exploitation + resultatsN1.financier + resultatsN1.exceptionnel)) >= 0 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              Var: {((resultatsN.exploitation + resultatsN.financier + resultatsN.exceptionnel) - 
                                    (resultatsN1.exploitation + resultatsN1.financier + resultatsN1.exceptionnel)) >= 0 ? '+' : ''}
                              {formatCurrencyNoDecimals(
                                (resultatsN.exploitation + resultatsN.financier + resultatsN.exceptionnel) - 
                                (resultatsN1.exploitation + resultatsN1.financier + resultatsN1.exceptionnel)
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Détail par compte pour une classe sélectionnée */}
                {selectedClasse && (selectedClasse.type === 'charge' || selectedClasse.type === 'produit') && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-800">
                        Détail par compte: {selectedClasse.type === 'charge' ? 'Charges' : 'Produits'} - Classe {selectedClasse.classe}
                        {generateCompteResultat() && (
                          <span className="ml-2 text-gray-600">
                            ({selectedClasse.type === 'charge' 
                              ? generateCompteResultat().charges.find(c => c.classe === selectedClasse.classe)?.libelle
                              : generateCompteResultat().produits.find(p => p.classe === selectedClasse.classe)?.libelle})
                          </span>
                        )}
                      </h4>
                      <button
                        onClick={() => setSelectedClasse(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      {(() => {
                        const accounts = getCompteResultatDetails(selectedClasse.type, selectedClasse.classe);
                        // Déterminer si un seul exercice est coché
                        const singleExercice = (showResultatN && !showResultatN1) || (!showResultatN && showResultatN1 && parseResult2);
                        const showN = showResultatN;
                        const showN1 = showResultatN1 && parseResult2;
                        const showComparaison = showResultatComparaison && parseResult2;
                        
                        return (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                                {singleExercice ? (
                                  <>
                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Débit</th>
                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Crédit</th>
                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde</th>
                                  </>
                                ) : (
                                  <>
                                    {showN && (
                                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N</th>
                                    )}
                                    {showN1 && (
                                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde N-1</th>
                                    )}
                                    {showComparaison && (
                                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Var</th>
                                    )}
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {accounts.map((account, idx) => {
                                const variation = showN1 && account.soldeN1 !== undefined ? account.solde - account.soldeN1 : null;
                                const variationPercent = showN1 && account.soldeN1 !== undefined && account.soldeN1 !== 0 
                                  ? ((account.solde - account.soldeN1) / Math.abs(account.soldeN1)) * 100 
                                  : null;
                                
                                return (
                                  <tr key={idx} className="border-t border-gray-200 hover:bg-gray-100">
                                    <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                                    <td className="px-3 py-2">{account.compteLibelle}</td>
                                    {singleExercice ? (
                                      <>
                                        <td className="px-3 py-2 text-right font-mono">
                                          {account.totalDebit > 0 ? formatCurrency(account.totalDebit) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                          {account.totalCredit > 0 ? formatCurrency(account.totalCredit) : '-'}
                                        </td>
                                        <td className={`px-3 py-2 text-right font-mono font-bold ${
                                          selectedClasse.type === 'charge' 
                                            ? 'text-red-600' 
                                            : account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {formatCurrency(account.solde)}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        {showN && (
                                          <td className={`px-3 py-2 text-right font-mono font-bold ${
                                            selectedClasse.type === 'charge' 
                                              ? 'text-red-600' 
                                              : account.solde >= 0 ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {formatCurrency(account.solde)}
                                          </td>
                                        )}
                                        {showN1 && (
                                          <td className={`px-3 py-2 text-right font-mono ${
                                            selectedClasse.type === 'charge' 
                                              ? 'text-red-500' 
                                              : (account.soldeN1 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                          }`}>
                                            {account.soldeN1 !== undefined ? formatCurrency(account.soldeN1) : '-'}
                                          </td>
                                        )}
                                        {showComparaison && (
                                          <td className={`px-3 py-2 text-right font-mono ${
                                            variation === null ? 'text-gray-400' : 
                                            (selectedClasse.type === 'charge' 
                                              ? (variation >= 0 ? 'text-red-600' : 'text-green-600') 
                                              : (variation >= 0 ? 'text-green-600' : 'text-red-600'))
                                          }`}>
                                            {variation !== null ? (
                                              <>
                                                {variation >= 0 ? '+' : ''}{formatCurrency(variation)}
                                                {variationPercent !== null && (
                                                  <span className="ml-1">
                                                    ({variationPercent >= 0 ? '+' : ''}{variationPercent.toFixed(1)}%)
                                                  </span>
                                                )}
                                              </>
                                            ) : '-'}
                                          </td>
                                        )}
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold">
                              <tr>
                                <td colSpan="2" className="px-3 py-2 text-right">Total:</td>
                                {singleExercice ? (
                                  <>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {formatCurrency(
                                        accounts.reduce((sum, acc) => sum + acc.totalDebit, 0)
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {formatCurrency(
                                        accounts.reduce((sum, acc) => sum + acc.totalCredit, 0)
                                      )}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono ${
                                      selectedClasse.type === 'charge' 
                                        ? 'text-red-700' 
                                        : accounts.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {formatCurrency(
                                        accounts.reduce((sum, acc) => sum + acc.solde, 0)
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    {showN && (
                                      <td className={`px-3 py-2 text-right font-mono ${
                                        selectedClasse.type === 'charge' 
                                          ? 'text-red-700' 
                                          : accounts.reduce((sum, acc) => sum + acc.solde, 0) >= 0 ? 'text-green-700' : 'text-red-700'
                                      }`}>
                                        {formatCurrency(
                                          accounts.reduce((sum, acc) => sum + acc.solde, 0)
                                        )}
                                      </td>
                                    )}
                                    {showN1 && (
                                      <td className={`px-3 py-2 text-right font-mono ${
                                        selectedClasse.type === 'charge' 
                                          ? 'text-red-600' 
                                          : accounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatCurrency(
                                          accounts.reduce((sum, acc) => sum + (acc.soldeN1 || 0), 0)
                                        )}
                                      </td>
                                    )}
                                    {showComparaison && (
                                      <td className={`px-3 py-2 text-right font-mono ${
                                        accounts.reduce((sum, acc) => sum + acc.solde - (acc.soldeN1 || 0), 0) >= 0 
                                          ? (selectedClasse.type === 'charge' ? 'text-red-600' : 'text-green-600')
                                          : (selectedClasse.type === 'charge' ? 'text-green-600' : 'text-red-600')
                                      }`}>
                                        {accounts.reduce((sum, acc) => sum + acc.solde - (acc.soldeN1 || 0), 0) >= 0 ? '+' : ''}
                                        {formatCurrency(
                                          accounts.reduce((sum, acc) => sum + acc.solde - (acc.soldeN1 || 0), 0)
                                        )}
                                      </td>
                                    )}
                                  </>
                                )}
                              </tr>
                            </tfoot>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bilan */}
            {analysisCategory === 'bilan' && generateBilan() && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 size={20} />
                    Bilan Comptable
                  </h4>
                  {/* Checkboxes pour sélectionner les colonnes à afficher */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showBilanN}
                        onChange={(e) => setShowBilanN(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">N</span>
                    </label>
                    {parseResult2 && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showBilanN1}
                            onChange={(e) => setShowBilanN1(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700">N-1</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showBilanComparaison}
                            onChange={(e) => setShowBilanComparaison(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700">Var</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
                {(() => {
                  const bilanN = generateBilan();
                  const bilanN1 = parseResult2 ? generateBilan(parseResult2, cyclesResult2) : null;

                  // Vérifications de sécurité
                  if (!bilanN) {
                    console.warn('bilanN est null ou undefined');
                    return <div className="text-center text-gray-500 py-8">Aucune donnée disponible</div>;
                  }

                  if (!bilanN.actif || !bilanN.passif) {
                    console.warn('bilanN structure invalide:', bilanN);
                    return <div className="text-center text-gray-500 py-8">Structure de données invalide</div>;
                  }

                  // Log pour débogage
                  console.log('Bilan N:', {
                    actifImmobilise: bilanN.actif?.immobilise?.length || 0,
                    actifStocks: bilanN.actif?.circulant?.stocks?.length || 0,
                    actifCreances: bilanN.actif?.circulant?.creances?.length || 0,
                    actifTresorerie: bilanN.actif?.circulant?.tresorerie?.length || 0,
                    passifCapitauxPropres: bilanN.passif?.capitauxPropres?.length || 0,
                    passifDettes: bilanN.passif?.dettes?.length || 0
                  });

                  // Fonction helper pour afficher une ligne de rubrique/sous-total
                  const renderTotalRow = (label, totalN, totalN1, colSpan = 1, isMainTotal = false) => {
                    const variation = totalN1 !== null ? totalN - totalN1 : null;
                    const bgColor = isMainTotal ? (label.includes('ACTIF') ? 'bg-blue-100' : 'bg-purple-100') : 'bg-gray-50';
                    const textColor = label.includes('ACTIF') ? 'text-blue-700' : 'text-purple-700';
                    
                    return (
                      <tr className={`${bgColor} font-bold`}>
                        <td colSpan={colSpan} className={`px-3 py-2 text-right ${textColor}`}>{label}</td>
                        {showBilanN && (
                          <td className={`px-3 py-2 text-right font-mono ${textColor}`}>
                            {formatCurrencyNoDecimals(totalN)}
                          </td>
                        )}
                        {showBilanN1 && parseResult2 && (
                          <td className={`px-3 py-2 text-right font-mono ${textColor}`}>
                            {totalN1 !== null ? formatCurrencyNoDecimals(totalN1) : '-'}
                          </td>
                        )}
                        {showBilanComparaison && parseResult2 && (
                          <td className={`px-3 py-2 text-right font-mono text-xs ${
                            variation === null ? 'text-gray-400' : 
                            (variation >= 0 ? 'text-green-600' : 'text-red-600')
                          }`}>
                            {variation !== null ? (
                              <span className={variation >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {variation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(variation)}
                              </span>
                            ) : '-'}
                          </td>
                        )}
                      </tr>
                    );
                  };

                  // Fonction helper pour afficher une sous-rubrique
                  const renderSubRubrique = (label, items, totalN, totalN1) => {
                    if (items.length === 0) return null;
                    
                    return (
                      <>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={2 + (showBilanN ? 1 : 0) + (showBilanN1 && parseResult2 ? 1 : 0) + (showBilanComparaison && parseResult2 ? 1 : 0)} className="px-3 py-1 text-left text-gray-700">{label}</td>
                        </tr>
                        {items.map((item, idx) => {
                          const itemN1 = bilanN1?.actif?.immobilise?.find(i => i.classe === item.classe) ||
                                        bilanN1?.actif?.circulant?.stocks?.find(i => i.classe === item.classe) ||
                                        bilanN1?.actif?.circulant?.creances?.find(i => i.classe === item.classe) ||
                                        bilanN1?.actif?.circulant?.tresorerie?.find(i => i.classe === item.classe) ||
                                        bilanN1?.passif?.capitauxPropres?.find(i => i.classe === item.classe) ||
                                        bilanN1?.passif?.dettes?.find(i => i.classe === item.classe);
                          const itemVariation = itemN1 ? item.solde - itemN1.solde : null;

                          return (
                            <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                              <td className="px-3 py-1 font-mono text-xs pl-6">{item.classe}</td>
                              <td 
                                className="px-3 py-1 cursor-pointer hover:text-indigo-600 hover:underline transition-colors pl-6"
                                onClick={() => setSelectedClasse(selectedClasse?.type === (item.classe.startsWith('2') || item.classe.startsWith('3') || item.classe.startsWith('5') || ['41', '42', '43', '45', '46', '47', '48'].includes(item.classe) ? 'actif' : 'passif') && selectedClasse?.classe === item.classe ? null : { type: (item.classe.startsWith('2') || item.classe.startsWith('3') || item.classe.startsWith('5') || ['41', '42', '43', '45', '46', '47', '48'].includes(item.classe) ? 'actif' : 'passif'), classe: item.classe })}
                                title="Cliquez pour voir le détail par compte"
                              >
                                {item.libelle}
                              </td>
                              {showBilanN && (
                                <td className="px-3 py-1 text-right font-mono text-xs">
                                  {formatCurrencyNoDecimals(item.solde)}
                                </td>
                              )}
                              {showBilanN1 && parseResult2 && (
                                <td className="px-3 py-1 text-right font-mono text-xs">
                                  {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                                </td>
                              )}
                              {showBilanComparaison && parseResult2 && (
                                <td className={`px-3 py-1 text-right font-mono text-xs ${
                                  itemVariation === null ? 'text-gray-400' : 
                                  (itemVariation >= 0 ? 'text-green-600' : 'text-red-600')
                                }`}>
                                  {itemVariation !== null ? (
                                    <>
                                      {itemVariation >= 0 ? '+' : ''}{formatCurrencyNoDecimals(itemVariation)}
                                    </>
                                  ) : '-'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {renderTotalRow(`Total ${label}`, totalN, totalN1, 2, false)}
                      </>
                    );
                  };

                  const colSpanHeader = 2 + (showBilanN ? 1 : 0) + (showBilanN1 && parseResult2 ? 1 : 0) + (showBilanComparaison && parseResult2 ? 1 : 0);

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Actif */}
                      <div>
                        <h5 className="font-bold text-blue-700 mb-3 text-center bg-blue-50 py-2 rounded">ACTIF</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Classe</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé</th>
                                {showBilanN && (
                                  <th className="px-3 py-2 text-right font-semibold text-gray-700">N</th>
                                )}
                                {showBilanN1 && parseResult2 && (
                                  <th className="px-3 py-2 text-right font-semibold text-gray-700">N-1</th>
                                )}
                                {showBilanComparaison && parseResult2 && (
                                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Var</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {/* ACTIF IMMOBILISÉ */}
                              <tr className="bg-blue-50 font-bold">
                                <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-blue-800">I - ACTIF IMMOBILISÉ</td>
                              </tr>
                              {bilanN.actif.immobilise.map((item, idx) => {
                                const itemN1 = bilanN1?.actif?.immobilise?.find(i => i.classe === item.classe);
                                const itemVariation = itemN1 ? item.solde - itemN1.solde : null;

                                return (
                                  <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                                    <td className="px-3 py-1 font-mono text-xs pl-6">{item.classe}</td>
                                    <td 
                                      className="px-3 py-1 cursor-pointer hover:text-indigo-600 hover:underline transition-colors pl-6"
                                      onClick={() => setSelectedClasse(selectedClasse?.type === 'actif' && selectedClasse?.classe === item.classe ? null : { type: 'actif', classe: item.classe })}
                                      title="Cliquez pour voir le détail par compte"
                                    >
                                      {item.libelle}
                                    </td>
                                    {showBilanN && (
                                      <td className="px-3 py-1 text-right font-mono text-xs">{formatCurrencyNoDecimals(item.solde)}</td>
                                    )}
                                    {showBilanN1 && parseResult2 && (
                                      <td className="px-3 py-1 text-right font-mono text-xs">
                                        {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                                      </td>
                                    )}
                                    {showBilanComparaison && parseResult2 && (
                                      <td className={`px-3 py-1 text-right font-mono text-xs ${
                                        itemVariation === null ? 'text-gray-400' : 
                                        (itemVariation >= 0 ? 'text-green-600' : 'text-red-600')
                                      }`}>
                                        {itemVariation !== null ? (itemVariation >= 0 ? '+' : '') + formatCurrencyNoDecimals(itemVariation) : '-'}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                              {renderTotalRow('Total I - ACTIF IMMOBILISÉ', bilanN.actif.totalImmobilise, bilanN1?.actif?.totalImmobilise, 2, false)}

                              {/* ACTIF CIRCULANT */}
                              <tr className="bg-blue-50 font-bold">
                                <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-blue-800">II - ACTIF CIRCULANT</td>
                              </tr>
                              
                              {/* Stocks */}
                              {renderSubRubrique('A - Stocks', bilanN.actif.circulant.stocks, bilanN.actif.totalStocks, bilanN1?.actif?.totalStocks)}
                              
                              {/* Créances */}
                              {renderSubRubrique('B - Créances', bilanN.actif.circulant.creances, bilanN.actif.totalCreances, bilanN1?.actif?.totalCreances)}
                              
                              {/* Trésorerie */}
                              {renderSubRubrique('C - Trésorerie', bilanN.actif.circulant.tresorerie, bilanN.actif.totalTresorerie, bilanN1?.actif?.totalTresorerie)}
                              
                              {renderTotalRow('Total II - ACTIF CIRCULANT', bilanN.actif.totalCirculant, bilanN1?.actif?.totalCirculant, 2, false)}
                              
                              {/* Total Actif */}
                              {renderTotalRow('TOTAL ACTIF', bilanN.actif.total, bilanN1?.actif?.total, 2, true)}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Passif */}
                      <div>
                        <h5 className="font-bold text-purple-700 mb-3 text-center bg-purple-50 py-2 rounded">PASSIF</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Classe</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé</th>
                                {showBilanN && (
                                  <th className="px-3 py-2 text-right font-semibold text-gray-700">N</th>
                                )}
                                {showBilanN1 && parseResult2 && (
                                  <th className="px-3 py-2 text-right font-semibold text-gray-700">N-1</th>
                                )}
                                {showBilanComparaison && parseResult2 && (
                                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Var</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {/* CAPITAUX PROPRES */}
                              <tr className="bg-purple-50 font-bold">
                                <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">I - CAPITAUX PROPRES / FINANCEMENT PERMANENT</td>
                              </tr>
                              {bilanN.passif.capitauxPropres.map((item, idx) => {
                                const itemN1 = bilanN1?.passif?.capitauxPropres?.find(i => i.classe === item.classe);
                                const itemVariation = itemN1 ? item.solde - itemN1.solde : null;

                                return (
                                  <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                                    <td className="px-3 py-1 font-mono text-xs pl-6">{item.classe}</td>
                                    <td 
                                      className="px-3 py-1 cursor-pointer hover:text-indigo-600 hover:underline transition-colors pl-6"
                                      onClick={() => setSelectedClasse(selectedClasse?.type === 'passif' && selectedClasse?.classe === item.classe ? null : { type: 'passif', classe: item.classe })}
                                      title="Cliquez pour voir le détail par compte"
                                    >
                                      {item.libelle}
                                    </td>
                                    {showBilanN && (
                                      <td className="px-3 py-1 text-right font-mono text-xs">{formatCurrencyNoDecimals(item.solde)}</td>
                                    )}
                                    {showBilanN1 && parseResult2 && (
                                      <td className="px-3 py-1 text-right font-mono text-xs">
                                        {itemN1 ? formatCurrencyNoDecimals(itemN1.solde) : '-'}
                                      </td>
                                    )}
                                    {showBilanComparaison && parseResult2 && (
                                      <td className={`px-3 py-1 text-right font-mono text-xs ${
                                        itemVariation === null ? 'text-gray-400' : 
                                        (itemVariation >= 0 ? 'text-green-600' : 'text-red-600')
                                      }`}>
                                        {itemVariation !== null ? (itemVariation >= 0 ? '+' : '') + formatCurrencyNoDecimals(itemVariation) : '-'}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                              {renderTotalRow('Total I - CAPITAUX PROPRES', bilanN.passif.totalCapitauxPropres, bilanN1?.passif?.totalCapitauxPropres, 2, false)}

                              {/* PASSIF CIRCULANT */}
                              <tr className="bg-purple-50 font-bold">
                                <td colSpan={colSpanHeader} className="px-3 py-2 text-left text-purple-800">II - PASSIF CIRCULANT</td>
                              </tr>
                              
                              {/* Dettes */}
                              {renderSubRubrique('A - Dettes', bilanN.passif.dettes, bilanN.passif.totalDettes, bilanN1?.passif?.totalDettes)}
                              
                              {renderTotalRow('Total II - PASSIF CIRCULANT', bilanN.passif.totalDettes, bilanN1?.passif?.totalDettes, 2, false)}
                              
                              {/* Total Passif */}
                              {renderTotalRow('TOTAL PASSIF', bilanN.passif.total, bilanN1?.passif?.total, 2, true)}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Détail par compte pour une classe sélectionnée */}
                {selectedClasse && (selectedClasse.type === 'actif' || selectedClasse.type === 'passif') && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-800">
                        Détail par compte: {selectedClasse.type === 'actif' ? 'Actif' : 'Passif'} - Classe {selectedClasse.classe}
                        {generateBilan() && (
                          <span className="ml-2 text-gray-600">
                            ({selectedClasse.type === 'actif' 
                              ? generateBilan().actif.find(a => a.classe === selectedClasse.classe)?.libelle
                              : generateBilan().passif.find(p => p.classe === selectedClasse.classe)?.libelle})
                          </span>
                        )}
                      </h4>
                      <button
                        onClick={() => setSelectedClasse(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Numéro de compte</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Libellé du compte</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Débit</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Crédit</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Solde</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getBilanDetails(selectedClasse.type, selectedClasse.classe).map((account, idx) => (
                            <tr key={idx} className="border-t border-gray-200 hover:bg-gray-100">
                              <td className="px-3 py-2 font-mono text-xs">{account.compteNum}</td>
                              <td className="px-3 py-2">{account.compteLibelle}</td>
                              <td className="px-3 py-2 text-right font-mono">
                                {account.totalDebit > 0 ? formatCurrency(account.totalDebit) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {account.totalCredit > 0 ? formatCurrency(account.totalCredit) : '-'}
                              </td>
                              <td className={`px-3 py-2 text-right font-mono font-bold ${
                                selectedClasse.type === 'actif' 
                                  ? 'text-blue-600' 
                                  : 'text-purple-600'
                              }`}>
                                {formatCurrency(account.solde)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold">
                          <tr>
                            <td colSpan="2" className="px-3 py-2 text-right">Total:</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatCurrency(
                                getBilanDetails(selectedClasse.type, selectedClasse.classe).reduce((sum, acc) => sum + acc.totalDebit, 0)
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatCurrency(
                                getBilanDetails(selectedClasse.type, selectedClasse.classe).reduce((sum, acc) => sum + acc.totalCredit, 0)
                              )}
                            </td>
                            <td className={`px-3 py-2 text-right font-mono ${
                              selectedClasse.type === 'actif' 
                                ? 'text-blue-700' 
                                : 'text-purple-700'
                            }`}>
                              {formatCurrency(
                                getBilanDetails(selectedClasse.type, selectedClasse.classe).reduce((sum, acc) => sum + acc.solde, 0)
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Programme de travail */}
            {analysisCategory === 'programme' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="text-indigo-600" size={20} />
                    Programme de travail
                  </h4>
                  {!programmeTravail && !loadingProgramme && parseResult && AIService.getApiKey() && (
                    <button
                      onClick={async () => {
                        setLoadingProgramme(true);
                        try {
                          const context = {
                            parseResult,
                            cyclesResult,
                            sig: generateSIG(),
                            bilan: generateBilan(),
                            compteResultat: generateCompteResultat(),
                            entrepriseInfo
                          };
                          const programme = await AIService.generateProgrammeTravail(context);
                          setProgrammeTravail(programme);
                          
                          // Essayer de parser le JSON si c'est du JSON valide
                          try {
                            // Extraire le JSON du texte (peut être dans un bloc de code)
                            let jsonStr = programme;
                            const jsonMatch = programme.match(/```json\s*([\s\S]*?)\s*```/);
                            if (jsonMatch) {
                              jsonStr = jsonMatch[1];
                            } else {
                              // Essayer de trouver du JSON brut
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
                          setError(`Erreur lors de la génération du programme : ${error.message}`);
                        } finally {
                          setLoadingProgramme(false);
                        }
                      }}
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
                    {!parseResult && (
                      <p className="text-xs text-gray-400">Chargez d'abord un fichier FEC pour générer le programme</p>
                    )}
                    {parseResult && !AIService.getApiKey() && (
                      <p className="text-xs text-yellow-600 mt-2">⚠️ Configurez votre clé API OpenRouter dans l'assistant IA pour générer le programme</p>
                    )}
                  </div>
                )}

                {programmeTravail && (
                  <div>
                    {programmeTravailData ? (
                      <ProgrammeTravailTemplate
                        data={programmeTravailData}
                        onUpdate={(updatedData) => {
                          setProgrammeTravailData(updatedData);
                        }}
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
            )}

            {/* Soldes Intermédiaires de Gestion */}
            {analysisCategory === 'sig' && (() => {
              const sigData = generateSIG();
              if (!sigData) {
                console.warn('sigData est null ou undefined');
                return (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                      <BarChart3 size={20} />
                      Soldes Intermédiaires de Gestion (SIG)
                    </h4>
                    <div className="text-center text-gray-500 py-8">Aucune donnée disponible</div>
                  </div>
                );
              }

              // Log pour débogage
              console.log('SIG Data:', sigData);

              return (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <BarChart3 size={20} />
                    Soldes Intermédiaires de Gestion (SIG)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Indicateur</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Formule</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-200 hover:bg-gray-100">
                          <td className="px-3 py-2 font-medium">Marge commerciale</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">707 - 607</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.margeCommerciale || 0)}</td>
                        </tr>
                      <tr className="border-t border-gray-200 hover:bg-gray-100">
                        <td className="px-3 py-2 font-medium">Production de l'exercice</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">70 (hors 707) - 60 (hors 607, 606)</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.productionExercice || 0)}</td>
                      </tr>
                      <tr className="border-t border-gray-200 hover:bg-gray-100">
                        <td className="px-3 py-2 font-medium">Valeur ajoutée</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Marge commerciale + Production</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(sigData.valeurAjoutee || 0)}</td>
                      </tr>
                      <tr className="border-t border-gray-200 hover:bg-gray-100 bg-yellow-50">
                        <td className="px-3 py-2 font-medium">Excédent Brut d'Exploitation (EBE)</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Valeur ajoutée + Subventions - Impôts - Charges personnel</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-yellow-700">{formatCurrency(sigData.ebe || 0)}</td>
                      </tr>
                      <tr className="border-t border-gray-200 hover:bg-gray-100">
                        <td className="px-3 py-2 font-medium">Résultat d'exploitation</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">EBE + Reprises (78) + Transferts (79) + Autres produits (75) - Dotations (68) - Autres charges (65)</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.resultatExploitation || 0)}</td>
                      </tr>
                      <tr className="border-t border-gray-200 hover:bg-gray-100 bg-blue-50">
                        <td className="px-3 py-2 font-medium">Résultat courant avant impôt</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Résultat d'exploitation + Produits financiers (76) - Charges financières (66)</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(sigData.resultatCourantAvantImpot || 0)}</td>
                      </tr>
                      <tr className="border-t border-gray-200 hover:bg-gray-100">
                        <td className="px-3 py-2 font-medium">Résultat exceptionnel</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Produits exceptionnels (77) - Charges exceptionnelles (67)</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(sigData.resultatExceptionnel || 0)}</td>
                      </tr>
                      {((sigData.participationSalaries !== 0 && sigData.participationSalaries) || (sigData.impotBenefices !== 0 && sigData.impotBenefices)) && (
                        <>
                          {(sigData.participationSalaries !== 0 && sigData.participationSalaries) && (
                            <tr className="border-t border-gray-200 hover:bg-gray-100">
                              <td className="px-3 py-2 font-medium">Participation des salariés</td>
                              <td className="px-3 py-2 text-gray-600 text-xs">Compte 69 (hors 695)</td>
                              <td className="px-3 py-2 text-right font-mono text-red-600">- {formatCurrency(sigData.participationSalaries || 0)}</td>
                            </tr>
                          )}
                          {(sigData.impotBenefices !== 0 && sigData.impotBenefices) && (
                            <tr className="border-t border-gray-200 hover:bg-gray-100">
                              <td className="px-3 py-2 font-medium">Impôt sur les bénéfices</td>
                              <td className="px-3 py-2 text-gray-600 text-xs">Compte 695</td>
                              <td className="px-3 py-2 text-right font-mono text-red-600">- {formatCurrency(sigData.impotBenefices || 0)}</td>
                            </tr>
                          )}
                        </>
                      )}
                      <tr className="border-t-2 border-gray-400 hover:bg-gray-100 bg-indigo-50">
                        <td className="px-3 py-2 font-bold">Résultat net</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Résultat courant avant impôt + Résultat exceptionnel - Participation - Impôt</td>
                        <td className={`px-3 py-2 text-right font-mono font-bold text-lg ${
                          (sigData.resultatNet || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(sigData.resultatNet || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </div>
  );
};

export default FecParserDemo;
