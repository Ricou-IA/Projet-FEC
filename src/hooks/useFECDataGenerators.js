import { useMemo } from 'react';
import BilanGenerator from '../core/BilanGenerator';
import { ResultatGenerator } from '../core/ResultatGenerator.jsx';
import { SIGGenerator } from '../core/SIGGenerator';

/**
 * Hook pour générer les données comptables (Bilan, Compte de Résultat, SIG)
 */
export const useFECDataGenerators = (parseResult1, parseResult2, cyclesResult2) => {
  const generateCompteResultat = useMemo(() => {
    return (parseResultParam = null) => {
      const result = parseResultParam || parseResult1;
      if (!result || !result.data) return null;

      try {
        const resultat = ResultatGenerator.generateCompteResultat(result);
        
        if (!resultat) {
          return null;
        }

        // Si c'est la structure hiérarchique, la convertir en structure plate
        if (resultat.formatHierarchique) {
          // Extraire tous les comptes de toutes les catégories de charges
          const chargesFlat = [];
          if (resultat.charges) {
            // Charges d'exploitation
            if (resultat.charges.exploitation?.comptes) {
              resultat.charges.exploitation.comptes.forEach(compte => {
                chargesFlat.push({
                  classe: compte.numero,
                  libelle: compte.libelle,
                  solde: compte.solde,
                  totalDebit: 0,
                  totalCredit: 0,
                  categorie: 'exploitation'
                });
              });
            }
            // Charges financières
            if (resultat.charges.financieres?.comptes) {
              resultat.charges.financieres.comptes.forEach(compte => {
                chargesFlat.push({
                  classe: compte.numero,
                  libelle: compte.libelle,
                  solde: compte.solde,
                  totalDebit: 0,
                  totalCredit: 0,
                  categorie: 'financier'
                });
              });
            }
            // Charges exceptionnelles
            if (resultat.charges.exceptionnelles?.comptes) {
              resultat.charges.exceptionnelles.comptes.forEach(compte => {
                chargesFlat.push({
                  classe: compte.numero,
                  libelle: compte.libelle,
                  solde: compte.solde,
                  totalDebit: 0,
                  totalCredit: 0,
                  categorie: 'exceptionnel'
                });
              });
            }
            // Participation et impôts
            if (resultat.charges.participationImpots?.comptes) {
              resultat.charges.participationImpots.comptes.forEach(compte => {
                chargesFlat.push({
                  classe: compte.numero,
                  libelle: compte.libelle,
                  solde: compte.solde,
                  totalDebit: 0,
                  totalCredit: 0,
                  categorie: 'participationImpots'
                });
              });
            }
          }

          // Extraire tous les comptes de toutes les catégories de produits
          const produitsFlat = [];
          if (resultat.produits) {
            // Produits d'exploitation
            if (resultat.produits.exploitation?.comptes) {
              resultat.produits.exploitation.comptes.forEach(compte => {
                produitsFlat.push({
                  classe: compte.numero,
                  libelle: compte.libelle,
                  solde: compte.solde,
                  totalDebit: 0,
                  totalCredit: 0,
                  categorie: 'exploitation'
                });
              });
            }
            // Produits financiers
            if (resultat.produits.financiers?.comptes) {
              resultat.produits.financiers.comptes.forEach(compte => {
                produitsFlat.push({
                  classe: compte.numero,
                  libelle: compte.libelle,
                  solde: compte.solde,
                  totalDebit: 0,
                  totalCredit: 0,
                  categorie: 'financier'
                });
              });
            }
            // Produits exceptionnels
            if (resultat.produits.exceptionnels?.comptes) {
              resultat.produits.exceptionnels.comptes.forEach(compte => {
                produitsFlat.push({
                  classe: compte.numero,
                  libelle: compte.libelle,
                  solde: compte.solde,
                  totalDebit: 0,
                  totalCredit: 0,
                  categorie: 'exceptionnel'
                });
              });
            }
          }
          
          const result = {
            ...resultat,
            charges: chargesFlat,
            produits: produitsFlat,
            totalCharges: resultat.validation?.totalCharges || 0,
            totalProduits: resultat.validation?.totalProduits || 0,
            resultatExercice: resultat.resultatsIntermediaires?.net?.montant || 0,
            chiffreAffaires: resultat.chiffreAffaires || 0
          };
          
          return result;
        }

        // Si c'est la structure formatée, la convertir
        if (resultat.formatFormate) {
          const charges = [];
          const produits = [];

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
          // ... (similaire pour autres catégories)

          return {
            charges,
            produits,
            chiffreAffaires: resultat.chiffreAffaires || 0,
            totalCharges: resultat.totalCharges || 0,
            totalProduits: resultat.totalProduits || 0,
            resultatExercice: resultat.resultatExercice || 0,
            formatFormate: true
          };
        }

        // Structure classique
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

        return {
          charges,
          produits,
          chiffreAffaires: resultat.chiffreAffaires || 0,
          totalCharges: resultat.totalCharges || 0,
          totalProduits: resultat.totalProduits || 0,
          resultatExercice: resultat.resultatExercice || 0
        };
      } catch (error) {
        console.error('Erreur lors de la génération du compte de résultat:', error);
        return null;
      }
    };
  }, [parseResult1]);

  const generateBilan = useMemo(() => {
    return (parseResultParam = null) => {
      const result = parseResultParam || parseResult1;
      if (!result || !result.data) return null;

      try {
        const bilan = BilanGenerator.generateBilan(result);
        
        if (!bilan) return null;

        // Retourner la structure originale de BilanGenerator
        // qui est compatible avec BilanView
        // Structure attendue: { actif: { immobilise: { titre, groupes }, circulant: { titre, groupes } }, passif: { ... } }
        return bilan;
      } catch (error) {
        console.error('Erreur lors de la génération du bilan:', error);
        return null;
      }
    };
  }, [parseResult1]);

  const generateSIG = useMemo(() => {
    return (parseResultParam = null) => {
      const result = parseResultParam || parseResult1;
      if (!result || !result.data) return null;

      try {
        const sig = SIGGenerator.generateSIG(result);
        
        if (!sig) return null;

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
  }, [parseResult1]);

  return {
    generateCompteResultat,
    generateBilan,
    generateSIG
  };
};


