import {
  getAccountType,
  getResultatPosition,
  getAccountLabel
} from './AccountClassifier';
import reglesAffectation from '../data/regles-affectation-comptes.json';

/**
 * Générateur de Soldes Intermédiaires de Gestion (SIG) selon le Plan Comptable Général (PCG) 2025
 * Utilise AccountClassifier et les règles définies dans regles-affectation-comptes.json
 */
export class SIGGenerator {
  /**
   * Génère les SIG à partir des données FEC
   * @param {Object} parseResult - Résultat du parsing FEC contenant { data: [] }
   * @returns {Object|null} Structure des SIG ou null si pas de données
   */
  static generateSIG(parseResult) {
    if (!parseResult || !parseResult.data || parseResult.data.length === 0) {
      return null;
    }

    // Agrégation par compte avec calcul des soldes
    const comptes = {};
    parseResult.data.forEach(row => {
      const compteNum = row.compteNum || '';
      
      // Ne traiter que les comptes de COMPTE_RESULTAT
      if (getAccountType(compteNum) === 'COMPTE_RESULTAT') {
        if (!comptes[compteNum]) {
          comptes[compteNum] = {
            compteNum,
            compteLibelle: row.compteLibelle || getAccountLabel(compteNum),
            debit: 0,
            credit: 0
          };
        }
        comptes[compteNum].debit += row.debit || 0;
        comptes[compteNum].credit += row.credit || 0;
      }
    });

    // Fonction helper pour obtenir le solde d'un compte selon sa position (CHARGE ou PRODUIT)
    const getSolde = (compteNum) => {
      const compte = comptes[compteNum];
      if (!compte) return 0;
      const position = getResultatPosition(compteNum);
      if (position === 'CHARGE') {
        // Charges : solde débiteur = charge (positif si charge, négatif si reprise)
        return compte.debit - compte.credit;
      } else if (position === 'PRODUIT') {
        // Produits : solde créditeur = produit (positif si produit, négatif si annulation)
        return compte.credit - compte.debit;
      }
      return 0;
    };

    // Fonction helper pour vérifier si un compte correspond à un pattern
    const matchesPattern = (compteNum, pattern) => {
      if (pattern.endsWith('x')) {
        return compteNum.startsWith(pattern.slice(0, -1));
      }
      return compteNum.startsWith(pattern);
    };

    // Fonction helper pour calculer la somme des comptes selon une liste de patterns
    const sumByPatterns = (patterns) => {
      let total = 0;
      Object.keys(comptes).forEach(compteNum => {
        for (const pattern of patterns) {
          if (matchesPattern(compteNum, pattern)) {
            total += getSolde(compteNum);
            break; // Éviter de compter deux fois si plusieurs patterns matchent
          }
        }
      });
      return total;
    };

    // Utiliser les règles SIG du JSON pour calculer chaque SIG
    const sigRules = reglesAffectation.soldesIntermediairesGestion?.sig || [];
    
    // Initialiser la structure des SIG
    const sig = {
      margeCommerciale: 0,
      productionExercice: 0,
      valeurAjoutee: 0,
      ebe: 0,
      resultatExploitation: 0,
      resultatCourantAvantImpot: 0,
      resultatExceptionnel: 0,
      participationSalaries: 0,
      impotBenefices: 0,
      resultatNet: 0,
      // Détails pour traçabilité
      details: {}
    };

    // 1. Marge commerciale = Ventes de marchandises (707) - Coût d'achat des marchandises vendues (607 +/- 6037)
    // Selon le JSON : ["707", "607", "6037"]
    const ventesMarchandises = sumByPatterns(['707']);
    const coutAchatMarchandises = sumByPatterns(['607']);
    const variationStocksMarchandises = sumByPatterns(['6037']); // Peut être ajusté
    sig.margeCommerciale = ventesMarchandises - coutAchatMarchandises + variationStocksMarchandises;
    sig.details.margeCommerciale = {
      ventesMarchandises,
      coutAchatMarchandises,
      variationStocksMarchandises,
      formule: '707 - 607 + 6037'
    };

    // 2. Production de l'exercice = Production vendue (701+706+708) + Production stockée (713) + Production immobilisée (72)
    // Selon le JSON : ["701", "706", "708", "713", "72"]
    const productionVendue = sumByPatterns(['701', '706', '708']);
    const productionStockee = sumByPatterns(['713']);
    const productionImmobilisee = sumByPatterns(['72']);
    sig.productionExercice = productionVendue + productionStockee + productionImmobilisee;
    sig.details.productionExercice = {
      productionVendue,
      productionStockee,
      productionImmobilisee,
      formule: '(701+706+708) + 713 + 72'
    };

    // 3. Valeur ajoutée = Marge commerciale + Production de l'exercice - Consommations de l'exercice (60+61+62)
    // Selon le JSON : ["60", "61", "62"]
    const consommationsTiers = sumByPatterns(['60', '61', '62']);
    sig.valeurAjoutee = sig.margeCommerciale + sig.productionExercice - consommationsTiers;
    sig.details.valeurAjoutee = {
      margeCommerciale: sig.margeCommerciale,
      productionExercice: sig.productionExercice,
      consommationsTiers,
      formule: 'Marge + Production - (60+61+62)'
    };

    // 4. EBE = Valeur ajoutée + Subventions d'exploitation (74) - Impôts et taxes (63) - Charges de personnel (64)
    // Selon le JSON : ["74", "63", "64"]
    const subventions = sumByPatterns(['74']);
    const impots = sumByPatterns(['63']);
    const chargesPersonnel = sumByPatterns(['64']);
    sig.ebe = sig.valeurAjoutee + subventions - impots - chargesPersonnel;
    sig.details.ebe = {
      valeurAjoutee: sig.valeurAjoutee,
      subventions,
      impots,
      chargesPersonnel,
      formule: 'VA + 74 - 63 - 64'
    };

    // 5. Résultat d'exploitation = EBE + Autres produits (75+781+791) - Autres charges (65+681) - Dotations (681)
    // Selon le JSON : ["75", "781", "791", "65", "681"]
    // Note: 681 peut être compté deux fois (charges et dotations), mais c'est intentionnel selon le JSON
    const autresProduits = sumByPatterns(['75']);
    const reprisesExploitation = sumByPatterns(['781']);
    const transfertsExploitation = sumByPatterns(['791']);
    const autresCharges = sumByPatterns(['65']);
    const dotations = sumByPatterns(['681']);
    sig.resultatExploitation = sig.ebe + autresProduits + reprisesExploitation + transfertsExploitation 
                               - autresCharges - dotations;
    sig.details.resultatExploitation = {
      ebe: sig.ebe,
      autresProduits,
      reprisesExploitation,
      transfertsExploitation,
      autresCharges,
      dotations,
      formule: 'EBE + (75+781+791) - (65+681)'
    };

    // 6. Résultat courant avant impôt = Résultat d'exploitation + Résultat financier (76-66)
    // Selon le JSON : ["76", "66"]
    const produitsFinanciers = sumByPatterns(['76']);
    const chargesFinancieres = sumByPatterns(['66']);
    const resultatFinancier = produitsFinanciers - chargesFinancieres;
    sig.resultatCourantAvantImpot = sig.resultatExploitation + resultatFinancier;
    sig.details.resultatCourantAvantImpot = {
      resultatExploitation: sig.resultatExploitation,
      produitsFinanciers,
      chargesFinancieres,
      resultatFinancier,
      formule: 'Rés. exploit. + (76-66)'
    };

    // 7. Résultat de l'exercice = Résultat courant - Participation salariés (691) - Impôts sur bénéfices (695)
    // Note: Les produits/charges exceptionnels (77/67) ont été supprimés au 1er janvier 2025 selon le JSON
    // Selon le JSON : ["691", "695"]
    const participation = sumByPatterns(['691']);
    const impotBenefices = sumByPatterns(['695']);
    sig.participationSalaries = participation;
    sig.impotBenefices = impotBenefices;
    sig.resultatExceptionnel = 0; // Classe 77 supprimée en 2025
    sig.resultatNet = sig.resultatCourantAvantImpot + sig.resultatExceptionnel - participation - impotBenefices;
    sig.details.resultatNet = {
      resultatCourantAvantImpot: sig.resultatCourantAvantImpot,
      resultatExceptionnel: sig.resultatExceptionnel,
      participation,
      impotBenefices,
      formule: 'Rés. courant - 691 - 695'
    };

    return sig;
  }

}

// Export de la fonction principale pour compatibilité
export const generateSIG = (parseResult) => SIGGenerator.generateSIG(parseResult);

