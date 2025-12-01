/**
 * GÉNÉRATEUR DE SIG (Soldes Intermédiaires de Gestion) - PCG 2025
 * * Calcule les soldes en cascade à partir des balances agrégées.
 * Gère la distinction critique entre activité commerciale (Négoce) et activité de production.
 */

export class SIGGenerator {
  constructor() {
    // Patterns de comptes pour les calculs
    this.RULES = {
      // 1. MARGE COMMERCIALE
      VENTES_MARCHANDISES: ['707', '7097'],
      COUT_ACHAT_MARCHANDISES: ['607', '6037', '6097', '6087'],

      // 2. PRODUCTION DE L'EXERCICE
      PRODUCTION_VENDUE: ['701', '702', '703', '704', '705', '706', '708', '709'], // Sauf 707/7097
      PRODUCTION_STOCKEE: ['71'],
      PRODUCTION_IMMOBILISEE: ['72'],

      // 3. CONSOMMATIONS DE L'EXERCICE EN PROVENANCE DE TIERS
      ACHATS_MATIERES: ['601', '602', '6031', '6032', '6091', '6092', '6081', '6082'],
      AUTRES_ACHATS_CHARGES_EXTERNES: ['604', '605', '606', '61', '62'],

      // 4. VALEUR AJOUTEE (Subventions d'exploit. souvent exclues ici, ajoutées après pour EBE)
      
      // 5. EBE
      SUBVENTIONS_EXPLOITATION: ['74'],
      IMPOTS_TAXES: ['63'],
      CHARGES_PERSONNEL: ['64'],

      // 6. RESULTAT D'EXPLOITATION
      REPRISES_TRANSFERTS_EXPL: ['781', '791', '75'],
      DOTATIONS_AUTRES_CHARGES_EXPL: ['681', '65'],

      // 7. RESULTAT FINANCIER
      PRODUITS_FINANCIERS: ['76', '786', '796'],
      CHARGES_FINANCIERES: ['66', '686'],

      // 8. RESULTAT EXCEPTIONNEL
      PRODUITS_EXCEPTIONNELS: ['77', '787', '797'],
      CHARGES_EXCEPTIONNELLES: ['67', '687'],

      // 9. PARTICIPATION & IS
      PARTICIPATION_IMPOTS: ['69']
    };
  }

  /**
   * Calcule la somme des soldes pour une liste de préfixes
   * @param {Array} comptes - Liste des comptes agrégés
   * @param {Array} prefixes - Liste des racines de comptes à inclure
   * @param {String} sens - 'C' (Crédit=Positif) ou 'D' (Débit=Positif)
   */
  _somme(comptes, prefixes, sens = 'D') {
    return comptes.reduce((total, compte) => {
      // Vérifier si le compte matche l'un des préfixes
      // On exclut spécifiquement ceux qui pourraient être des faux positifs si besoin
      // Ici on utilise une logique simple de "startsWith"
      const match = prefixes.some(p => compte.compteNum.startsWith(p));
      
      // Gestion spécifique pour exclure 707 si on cherche 70 globalement (cas PRODUCTION_VENDUE)
      if (match) {
        // Exclusions spécifiques pour ne pas compter deux fois
        if (prefixes.includes('70') && !prefixes.includes('707') && (compte.compteNum.startsWith('707') || compte.compteNum.startsWith('7097'))) {
          return total;
        }
        
        // Calcul du solde orienté
        let montant = 0;
        if (sens === 'C') {
          // Pour les produits : Crédit - Débit
          montant = compte.credit - compte.debit;
        } else {
          // Pour les charges : Débit - Crédit
          montant = compte.debit - compte.credit;
        }
        return total + montant;
      }
      return total;
    }, 0);
  }

  /**
   * Génère les SIG pour un exercice donné
   */
  calculerSIG(parseResult) {
    if (!parseResult || !parseResult.data) return null;
    const comptes = parseResult.data;

    // 1. MARGE COMMERCIALE
    const ventesMarchandises = this._somme(comptes, this.RULES.VENTES_MARCHANDISES, 'C');
    const coutAchatMarchandises = this._somme(comptes, this.RULES.COUT_ACHAT_MARCHANDISES, 'D');
    const margeCommerciale = ventesMarchandises - coutAchatMarchandises;

    // 2. PRODUCTION DE L'EXERCICE
    const productionVendue = this._somme(comptes, this.RULES.PRODUCTION_VENDUE, 'C');
    const productionStockee = this._somme(comptes, this.RULES.PRODUCTION_STOCKEE, 'C'); // Variation (+/-)
    const productionImmobilisee = this._somme(comptes, this.RULES.PRODUCTION_IMMOBILISEE, 'C');
    const productionExercice = productionVendue + productionStockee + productionImmobilisee;

    // 3. VALEUR AJOUTEE
    const consommationTiers = this._somme(comptes, this.RULES.ACHATS_MATIERES, 'D') + 
                              this._somme(comptes, this.RULES.AUTRES_ACHATS_CHARGES_EXTERNES, 'D');
    const valeurAjoutee = margeCommerciale + productionExercice - consommationTiers;

    // 4. EBE (Excédent Brut d'Exploitation)
    const subventions = this._somme(comptes, this.RULES.SUBVENTIONS_EXPLOITATION, 'C');
    const impotsTaxes = this._somme(comptes, this.RULES.IMPOTS_TAXES, 'D');
    const chargesPersonnel = this._somme(comptes, this.RULES.CHARGES_PERSONNEL, 'D');
    const ebe = valeurAjoutee + subventions - impotsTaxes - chargesPersonnel;

    // 5. RESULTAT D'EXPLOITATION
    const autresProduits = this._somme(comptes, this.RULES.REPRISES_TRANSFERTS_EXPL, 'C');
    const autresCharges = this._somme(comptes, this.RULES.DOTATIONS_AUTRES_CHARGES_EXPL, 'D');
    const resultatExploitation = ebe + autresProduits - autresCharges;

    // 6. RESULTAT FINANCIER & RCAI
    const produitsFinanciers = this._somme(comptes, this.RULES.PRODUITS_FINANCIERS, 'C');
    const chargesFinancieres = this._somme(comptes, this.RULES.CHARGES_FINANCIERES, 'D');
    const resultatFinancier = produitsFinanciers - chargesFinancieres;
    const rcai = resultatExploitation + resultatFinancier;

    // 7. RESULTAT EXCEPTIONNEL
    const produitsExceptionnels = this._somme(comptes, this.RULES.PRODUITS_EXCEPTIONNELS, 'C');
    const chargesExceptionnelles = this._somme(comptes, this.RULES.CHARGES_EXCEPTIONNELLES, 'D');
    const resultatExceptionnel = produitsExceptionnels - chargesExceptionnelles;

    // 8. RESULTAT NET
    const participationIS = this._somme(comptes, this.RULES.PARTICIPATION_IMPOTS, 'D');
    const resultatNet = rcai + resultatExceptionnel - participationIS;

    return {
      margeCommerciale,
      productionExercice,
      valeurAjoutee,
      ebe,
      resultatExploitation,
      resultatFinancier,
      rcai,
      resultatExceptionnel,
      resultatNet,
      // Détails pour calculs de ratios si besoin
      details: {
        ventesMarchandises,
        coutAchatMarchandises,
        productionVendue,
        consommationTiers,
        chargesPersonnel,
        chiffreAffaires: ventesMarchandises + productionVendue
      }
    };
  }

  /**
   * Point d'entrée statique compatible avec l'ancien code
   */
  static generateSIG(parseResult) {
    const generator = new SIGGenerator();
    return generator.calculerSIG(parseResult);
  }
}

export const generateSIG = SIGGenerator.generateSIG;
export default SIGGenerator;