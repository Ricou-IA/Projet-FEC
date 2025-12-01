import { useMemo } from 'react';
import BilanGenerator from '../core/BilanGenerator';
import { ResultatGenerator } from '../core/ResultatGenerator.jsx';
import { SIGGenerator } from '../core/SIGGenerator';
import { CashFlowGenerator } from '../core/CashFlowGenerator'; // Import nouveau

export const useFECDataGenerators = (parseResult1, parseResult2, cyclesResult2) => {
  
  // Générateur de Compte de Résultat
  const generateCompteResultat = useMemo(() => {
    return (parseResultParam = null) => {
      const result = parseResultParam || parseResult1;
      if (!result || !result.data) return null;
      try {
        return ResultatGenerator.generateCompteResultat(result);
      } catch (error) {
        console.error('Erreur Compte de Résultat:', error);
        return null;
      }
    };
  }, [parseResult1]);

  // Générateur de Bilan
  const generateBilan = useMemo(() => {
    return (parseResultParam = null) => {
      const result = parseResultParam || parseResult1;
      if (!result || !result.data) return null;
      try {
        return BilanGenerator.generateBilan(result);
      } catch (error) {
        console.error('Erreur Bilan:', error);
        return null;
      }
    };
  }, [parseResult1]);

  const generateSIG = useMemo(() => {
    return (parseResultParam = null) => {
      const result = parseResultParam || parseResult1;
      if (!result || !result.data) return null;
      try {
        return SIGGenerator.generateSIG(result);
      } catch (error) {
        console.error('Erreur SIG:', error);
        return null;
      }
    };
  }, [parseResult1]);

  // --- NOUVEAU : Générateur de Flux de Trésorerie ---
  const generateCashFlow = useMemo(() => {
    return () => {
      // Le Cash Flow nécessite obligatoirement N et N-1
      if (!parseResult1 || !parseResult2) return null;
      
      try {
        return CashFlowGenerator.generateCashFlow(parseResult1, parseResult2);
      } catch (error) {
        console.error('Erreur CashFlow:', error);
        return null;
      }
    };
  }, [parseResult1, parseResult2]);

  return {
    generateCompteResultat,
    generateBilan,
    generateSIG,
    generateCashFlow // Export
  };
};