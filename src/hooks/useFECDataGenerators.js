import { useMemo } from 'react';
import { BilanGenerator } from '../core/BilanGenerator';
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

        const convertItem = (item) => {
          // BilanGenerator retourne des items avec 'sousClasse' qui est mappé vers 'classe' dans _extraireParClasses
          const classe = item.classe || item.sousClasse || '';
          
          return {
            classe,
            libelle: item.libelle || '',
            brut: item.brut !== undefined ? item.brut : 0,
            amortissements: item.amortissements !== undefined ? item.amortissements : 0,
            net: item.net !== undefined ? item.net : (item.solde || 0),
            totalDebit: item.totalDebit || 0,
            totalCredit: item.totalCredit || 0,
            solde: item.net !== undefined ? item.net : (item.solde || 0), // Compatibilité descendante
            // Préserver tous les comptes avec leurs propriétés complètes (type, totalDebit, totalCredit, solde, montant, brut, amortissements, net, vetuste)
            comptes: (item.comptes || []).map(compte => {
              // Calculer le solde si nécessaire
              const solde = compte.solde !== undefined 
                ? compte.solde 
                : ((compte.totalDebit || 0) - (compte.totalCredit || 0));
              
              // Déduire le type si non présent (basé sur le solde)
              const type = compte.type || (solde > 0 ? 'actif' : solde < 0 ? 'passif' : 'actif');
              
              return {
                compteNum: compte.compteNum || '',
                compteLibelle: compte.compteLibelle || '',
                totalDebit: compte.totalDebit !== undefined ? compte.totalDebit : (compte.debit || 0),
                totalCredit: compte.totalCredit !== undefined ? compte.totalCredit : (compte.credit || 0),
                solde: solde,
                montant: compte.montant !== undefined ? compte.montant : Math.abs(solde),
                type: type, // Préserver le type ou le déduire
                // Propriétés pour les immobilisations (déjà enrichies par _enrichirImmobilisationsAvecAmortissements)
                brut: compte.brut !== undefined ? compte.brut : (compte.montant || 0),
                amortissements: compte.amortissements !== undefined ? compte.amortissements : 0,
                net: compte.net !== undefined ? compte.net : (compte.brut !== undefined ? (compte.brut - (compte.amortissements || 0)) : solde),
                vetuste: compte.vetuste !== undefined ? compte.vetuste : 0
              };
            })
          };
        };

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
        const provisions = Array.isArray(bilan.passif?.provisions) 
          ? bilan.passif.provisions.map(convertItem) 
          : [];
        const dettesLongTerme = Array.isArray(bilan.passif?.dettesLongTerme) 
          ? bilan.passif.dettesLongTerme.map(convertItem) 
          : [];
        const dettesCourtTerme = Array.isArray(bilan.passif?.dettesCourtTerme) 
          ? bilan.passif.dettesCourtTerme.map(convertItem) 
          : [];
        const tresoreriePassif = Array.isArray(bilan.passif?.tresorerie) 
          ? bilan.passif.tresorerie.map(convertItem) 
          : [];
        
        // Compatibilité avec l'ancienne structure (dettes = dettesLongTerme + dettesCourtTerme)
        const dettes = [...dettesLongTerme, ...dettesCourtTerme];

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
            provisions: provisions,
            dettesLongTerme: dettesLongTerme,
            dettesCourtTerme: dettesCourtTerme,
            tresorerie: tresoreriePassif,
            dettes: dettes, // Compatibilité avec l'ancienne structure
            totalCapitauxPropres: bilan.passif?.totalCapitauxPropres || 0,
            totalProvisions: bilan.passif?.totalProvisions || 0,
            totalDettesLongTerme: bilan.passif?.totalDettesLongTerme || 0,
            totalDettesCourtTerme: bilan.passif?.totalDettesCourtTerme || 0,
            totalTresorerie: bilan.passif?.totalTresorerie || 0,
            totalPassifCirculant: bilan.passif?.totalPassifCirculant || 0,
            totalDettes: (bilan.passif?.totalDettesLongTerme || 0) + (bilan.passif?.totalDettesCourtTerme || 0), // Compatibilité
            total: bilan.passif?.total || 0
          }
        };
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


