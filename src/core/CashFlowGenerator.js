/**
 * GÉNÉRATEUR DE TABLEAU DE FLUX DE TRÉSORERIE (Méthode Variation Brute & Retraitement Cessions)
 * Mise à jour : Calcul des Investissements par variation brute décomposée + VNC.
 */
export class CashFlowGenerator {
  constructor() {
    this.cache = new Map();
  }

  _getSolde(data, prefixes) {
    if (!data) return 0;
    return data.reduce((acc, item) => {
      const compteStr = item.compteNum.toString();
      const match = prefixes.some(p => compteStr.startsWith(p));
      if (match) {
        return acc + item.solde; 
      }
      return acc;
    }, 0);
  }

  generate(parseResultN, parseResultN1) {
    if (!parseResultN || !parseResultN1) return null;

    const dataN = parseResultN.data;
    const dataN1 = parseResultN1.data;

    // =================================================================================
    // 1. CALCUL DE LA CAF (Inchangé)
    // =================================================================================
    const produits = Math.abs(this._getSolde(dataN, ['7']));
    const charges = this._getSolde(dataN, ['6']);
    const resultatNet = produits - charges;

    const dotations = this._getSolde(dataN, ['68']); 
    const reprises = Math.abs(this._getSolde(dataN, ['78'])); 

    // Retraitement des cessions pour la CAF
    const vnc = this._getSolde(dataN, ['675']); // Charge non décaissée
    const prixCession = Math.abs(this._getSolde(dataN, ['775'])); // Produit d'investissement

    const caf = resultatNet + dotations + vnc - reprises - prixCession;
    
    // Pour l'affichage de la ligne de neutralisation
    const neutralisationCessions = prixCession - vnc;


    // =================================================================================
    // 2. VARIATION DU BFR (Inchangé)
    // =================================================================================
    const calcFluxBFR = (prefixes, isAsset) => {
        const soldeN = this._getSolde(dataN, prefixes);
        const soldeN1 = this._getSolde(dataN1, prefixes);
        const variationBilan = soldeN - soldeN1; 
        return -variationBilan; // Augmentation du bilan = Besoin en cash (-)
    };

    const varStocks = calcFluxBFR(['3'], true);
    const varClients = calcFluxBFR(['41'], true);
    const varFournisseurs = calcFluxBFR(['40'], false); 
    const varSocialFiscal = calcFluxBFR(['42', '43', '44'], false);
    const varAutresBFR = calcFluxBFR(['45', '46', '47', '48'], true);

    const fluxBFR = varStocks + varClients + varFournisseurs + varSocialFiscal + varAutresBFR;


    // =================================================================================
    // 3. FLUX D'INVESTISSEMENT (Refondu : Variation Brute Décomposée)
    // =================================================================================

    // A. Calcul des Variations Brutes par catégorie (Actif Classe 2 sans les 28/29)
    const calcVarBrute = (prefixes) => {
        const brutN = this._getSolde(dataN, prefixes);
        const brutN1 = this._getSolde(dataN1, prefixes);
        return brutN - brutN1;
    };

    const varBruteIncorp = calcVarBrute(['20']);       // Incorporelles
    const varBruteCorp = calcVarBrute(['21', '23']);   // Corporelles
    const varBruteFi = calcVarBrute(['26', '27']);     // Financières

    // B. Reconstitution des Acquisitions
    // Formule : Variation Brute = Acquisitions - Sorties (Valeur d'origine)
    // Problème : Le FEC ne donne pas la valeur d'origine des sorties, mais la VNC (675).
    // Approximation standard : On utilise la VNC (675) comme proxy de la valeur de sortie,
    // ou on considère que c'est le "retraitement des cessions" demandé.
    // Acquisitions = (Somme des Variations Brutes) + VNC (pour combler le trou de la sortie)
    
    const variationBruteTotale = varBruteIncorp + varBruteCorp + varBruteFi;
    const acquisitionsEstimees = variationBruteTotale + vnc; 

    // C. Calcul du Flux
    // Flux = - (Acquisitions) + (Prix de Cession 775)
    const fluxInvest = -(acquisitionsEstimees) + prixCession;


    // =================================================================================
    // 4. FLUX DE FINANCEMENT (Inchangé)
    // =================================================================================
    const fluxCapital = calcFluxBFR(['101', '104', '108'], false);
    const fluxEmprunts = calcFluxBFR(['16'], false);
    const fluxFinancement = fluxCapital + fluxEmprunts;


    // =================================================================================
    // 5. SYNTHÈSE
    // =================================================================================
    const variationCalculee = caf + fluxBFR + fluxInvest + fluxFinancement;
    
    const getTresoNette = (d) => this._getSolde(d, ['50', '51', '52', '53', '54', '58']);
    const tresoN = getTresoNette(dataN);
    const tresoN1 = getTresoNette(dataN1);
    const variationReelle = tresoN - tresoN1;
    const ecart = Math.abs(variationCalculee - variationReelle);

    return {
      caf: {
        resultatNet,
        dotations,
        reprises,
        plusMoinsValue: neutralisationCessions,
        montant: caf
      },
      bfr: {
        varStocks,
        varClients,
        varFournisseurs,
        varSocialFiscal,
        varAutresBFR,
        flux: fluxBFR
      },
      invest: {
        // On passe les détails pour un affichage précis si besoin, 
        // mais pour le waterfall principal, on utilise variationImmoNette comme somme des acquisitions
        variationImmoNette: acquisitionsEstimees, 
        
        // Détails optionnels si tu veux les afficher dans ta vue :
        details: {
            incorp: varBruteIncorp,
            corp: varBruteCorp,
            fi: varBruteFi,
            retraitementVNC: vnc
        },
        
        variationImmoFinanciere: 0, // Intégré dans le calcul global des acquisitions ci-dessus
        flux: fluxInvest
      },
      fi: {
        varCapital: fluxCapital,
        varEmprunts: fluxEmprunts,
        flux: fluxFinancement
      },
      synthese: {
        fte: caf + fluxBFR,
        fti: fluxInvest,
        ftf: fluxFinancement,
        variationNette: variationCalculee,
        tresorerieOuverture: tresoN1,
        tresorerieCloture: tresoN,
        variationReelle: variationReelle,
        ecart: ecart,
        equilibre: ecart < 1.0
      }
    };
  }

  static generateCashFlow(parseResultN, parseResultN1) {
    const generator = new CashFlowGenerator();
    return generator.generate(parseResultN, parseResultN1);
  }
}

export const generateCashFlow = (n, n1) => CashFlowGenerator.generateCashFlow(n, n1);
export default CashFlowGenerator;