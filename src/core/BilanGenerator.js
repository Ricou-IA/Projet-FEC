// BilanGenerator.js - Version simplifiée et fiable
import { getAccountLabel } from './AccountClassifier';

/**
 * RÈGLES COMPTABLES PCG POUR LE BILAN
 * 
 * ACTIF (ce que l'entreprise possède) :
 * - Classe 2 : Immobilisations (valeur brute - amortissements = valeur nette)
 * - Classe 3 : Stocks
 * - Classe 4 : Créances (solde débiteur uniquement)
 * - Classe 5 : Trésorerie active (solde débiteur uniquement)
 * 
 * PASSIF (comment l'entreprise finance son actif) :
 * - Classe 1 : Capitaux propres (+ résultat)
 * - Classe 4 : Dettes (solde créditeur uniquement)
 * - Classe 5 : Trésorerie passive (solde créditeur uniquement)
 * 
 * COMPTES CORRECTEURS :
 * - Classe 28x et 29x : Amortissements et dépréciations (à soustraire de l'actif)
 * 
 * RÉSULTAT :
 * - Classe 7 (produits) - Classe 6 (charges) = Résultat net → au passif (compte 12)
 */

export class BilanGenerator {
  
  /**
   * Point d'entrée principal - génère le bilan complet
   */
  static generateBilan(parseResult) {
    if (!parseResult?.data?.length) return null;

    // ÉTAPE 1 : Calculer les soldes de tous les comptes
    const soldes = this._calculerSoldesTousComptes(parseResult.data);

    // ÉTAPE 2 : Calculer le résultat (classe 6 et 7)
    const resultat = this._calculerResultat(soldes);

    // ÉTAPE 3 : Extraire les amortissements (28x et 29x)
    const amortissements = this._extraireAmortissements(soldes);

    // ÉTAPE 4 : Affecter les comptes à l'actif ou au passif
    const { actif, passif } = this._affecterComptesAuBilan(soldes, amortissements);

    // ÉTAPE 5 : Ajouter le résultat au passif
    this._ajouterResultatAuPassif(passif, resultat);

    // ÉTAPE 6 : Structurer et calculer les totaux
    const bilan = this._structurerBilan(actif, passif);

    // ÉTAPE 7 : Valider l'équilibre
    bilan.validation = this._validerBilan(bilan);

    return bilan;
  }

  /**
   * ÉTAPE 1 : Calcule le solde de chaque compte (débit - crédit)
   */
  static _calculerSoldesTousComptes(fecData) {
    const soldes = {};

    fecData.forEach(row => {
      const compteNum = row.compteNum || '';
      if (!compteNum) return;

      if (!soldes[compteNum]) {
        soldes[compteNum] = {
          compteNum,
          compteLibelle: row.compteLibelle || getAccountLabel(compteNum),
          debit: 0,
          credit: 0,
          solde: 0
        };
      }

      soldes[compteNum].debit += row.debit || 0;
      soldes[compteNum].credit += row.credit || 0;
    });

    // Calculer le solde final (débit - crédit)
    Object.values(soldes).forEach(compte => {
      compte.solde = compte.debit - compte.credit;
    });

    return soldes;
  }

  /**
   * ÉTAPE 2 : Calcule le résultat (Produits - Charges)
   */
  static _calculerResultat(soldes) {
    let produits = 0;  // Classe 7
    let charges = 0;   // Classe 6

    Object.values(soldes).forEach(compte => {
      const classe = compte.compteNum[0];

      if (classe === '7') {
        // Produits : solde créditeur normal → credit - debit
        produits += compte.credit - compte.debit;
      } else if (classe === '6') {
        // Charges : solde débiteur normal → debit - credit
        charges += compte.debit - compte.credit;
      }
    });

    return produits - charges;
  }

  /**
   * ÉTAPE 3 : Extrait les amortissements (28x et 29x)
   */
  static _extraireAmortissements(soldes) {
    const amortissements = {
      '20': 0, '21': 0, '22': 0, '23': 0, '26': 0, '27': 0
    };

    Object.values(soldes).forEach(compte => {
      const compteNum = compte.compteNum;
      
      // Les amortissements ont un solde créditeur → on prend la valeur absolue du crédit net
      const montantAmortissement = Math.max(0, compte.credit - compte.debit);

      // Mapping des amortissements vers les immobilisations
      if (compteNum.startsWith('280') || compteNum.startsWith('290')) {
        amortissements['20'] += montantAmortissement;
      } else if (compteNum.startsWith('281') || compteNum.startsWith('291')) {
        amortissements['21'] += montantAmortissement;
      } else if (compteNum.startsWith('282') || compteNum.startsWith('292')) {
        amortissements['22'] += montantAmortissement;
      } else if (compteNum.startsWith('293')) {
        amortissements['23'] += montantAmortissement;
      } else if (compteNum.startsWith('296')) {
        amortissements['26'] += montantAmortissement;
      } else if (compteNum.startsWith('297')) {
        amortissements['27'] += montantAmortissement;
      }
    });

    return amortissements;
  }

  /**
   * ÉTAPE 4 : Affecte chaque compte à l'actif ou au passif
   * 
   * RÈGLE SIMPLE :
   * - Classe 1 : PASSIF (capitaux propres)
   * - Classe 2 : ACTIF (immobilisations)
   * - Classe 3 : ACTIF (stocks)
   * - Classe 4 : DÉCOMPENSATION selon type de compte (voir détails ci-dessous)
   * - Classe 5 : Selon solde (débiteur→ACTIF, créditeur→PASSIF)
   * - Classe 28x, 29x : Exclus (déjà traités dans amortissements)
   * - Classe 6, 7 : Exclus (déjà traités dans résultat)
   * 
   * RÈGLE SPÉCIALE CLASSE 4 - DÉCOMPENSATION DES COMPTES DE TIERS :
   * 
   * Pour les comptes 401 (Fournisseurs) et 411 (Clients) :
   * → Gestion PAR COMPTE AUXILIAIRE (pas de compensation entre auxiliaires)
   * → Chaque compte auxiliaire est affecté selon son propre solde
   * 
   * Exemples :
   * - 401DUPONT avec solde créditeur -1000€ → PASSIF (dette fournisseur)
   * - 401DUPONT avec solde débiteur +500€ → ACTIF (avance/acompte versé)
   * - 401MARTIN avec solde créditeur -2000€ → PASSIF (dette fournisseur)
   * → Total 401 au PASSIF : 3000€ (1000 + 2000)
   * → Total 401 à l'ACTIF : 500€
   * → PAS de compensation entre DUPONT et MARTIN
   * 
   * - 411CLIENT1 avec solde débiteur +1500€ → ACTIF (créance client)
   * - 411CLIENT1 avec solde créditeur -200€ → PASSIF (avance/acompte reçu)
   * - 411CLIENT2 avec solde débiteur +3000€ → ACTIF (créance client)
   * → Total 411 à l'ACTIF : 4500€ (1500 + 3000)
   * → Total 411 au PASSIF : 200€
   * → PAS de compensation entre CLIENT1 et CLIENT2
   * 
   * Pour les autres comptes de classe 4 (40x, 42x, 43x, 44x, etc.) :
   * → Gestion PAR SOLDE GLOBAL de la sous-classe
   * → Compensation normale des débits et crédits
   * 
   * Exemples :
   * - 437100 (Charges sociales URSSAF) : -5000€ → PASSIF
   * - 445660 (TVA déductible) : +1200€ → ACTIF
   * - 445710 (TVA collectée) : -3000€ → PASSIF
   */
  static _affecterComptesAuBilan(soldes, amortissements) {
    const actif = {};
    const passif = {};

    Object.values(soldes).forEach(compte => {
      const compteNum = compte.compteNum;
      const classe = compteNum[0];
      const sousClasse = compteNum.substring(0, 2);
      const racineCompte = compteNum.substring(0, 3);
      const solde = compte.solde;

      // Ignorer les comptes soldés (< 1 centime)
      if (Math.abs(solde) < 0.01) return;

      // Exclure les comptes déjà traités
      if (classe === '6' || classe === '7') return; // Résultat
      if (compteNum.startsWith('28') || compteNum.startsWith('29')) return; // Amortissements

      // AFFECTATION PAR CLASSE
      if (classe === '1') {
        // Classe 1 : Toujours PASSIF (capitaux propres)
        this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
        
      } else if (classe === '2') {
        // Classe 2 : Toujours ACTIF (immobilisations)
        // Valeur brute = solde débiteur
        if (solde > 0) {
          this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
        }
        
      } else if (classe === '3') {
        // Classe 3 : Toujours ACTIF (stocks)
        if (solde > 0) {
          this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
        }
        
      } else if (classe === '4') {
        // Classe 4 : DÉCOMPENSATION selon type de compte
        
        // CAS SPÉCIAL : Comptes 401 (Fournisseurs) et 411 (Clients)
        // → Gestion PAR COMPTE AUXILIAIRE sans compensation
        if (racineCompte === '401' || racineCompte === '411') {
          // Chaque compte auxiliaire est affecté selon son propre solde
          if (solde > 0) {
            // Solde débiteur
            // 401 débiteur → ACTIF (avances/acomptes versés aux fournisseurs)
            // 411 débiteur → ACTIF (créances clients)
            this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
          } else if (solde < 0) {
            // Solde créditeur
            // 401 créditeur → PASSIF (dettes fournisseurs)
            // 411 créditeur → PASSIF (avances/acomptes reçus des clients)
            this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
          }
        } else {
          // AUTRES COMPTES DE CLASSE 4 : Gestion par solde global
          // Compensation normale (un seul solde par sous-classe)
          if (solde > 0) {
            // Solde débiteur → ACTIF (créances diverses, TVA déductible, etc.)
            this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
          } else if (solde < 0) {
            // Solde créditeur → PASSIF (dettes fiscales, sociales, TVA collectée, etc.)
            this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
          }
        }
        
      } else if (classe === '5') {
        // Classe 5 : Selon le solde (banques, caisse, etc.)
        if (solde > 0) {
          // Solde débiteur → ACTIF (trésorerie active)
          this._ajouterAuGroupe(actif, sousClasse, compte, solde, 'actif');
        } else if (solde < 0) {
          // Solde créditeur → PASSIF (découverts bancaires)
          this._ajouterAuGroupe(passif, sousClasse, compte, Math.abs(solde), 'passif');
        }
      }
    });

    // Appliquer les amortissements aux immobilisations (totaux par sous-classe)
    this._appliquerAmortissements(actif, amortissements);

    // Enrichir chaque compte d'immobilisation avec ses amortissements individuels
    this._enrichirImmobilisationsAvecAmortissements(actif, soldes);

    return { actif, passif };
  }

  /**
   * Ajoute un compte à un groupe (regroupement par sous-classe = 2 chiffres)
   */
  static _ajouterAuGroupe(structure, sousClasse, compte, montant, type = 'actif') {
    if (!structure[sousClasse]) {
      structure[sousClasse] = {
        sousClasse,
        libelle: getAccountLabel(sousClasse) || `Classe ${sousClasse}`,
        comptes: [],
        brut: 0,
        amortissements: 0,
        net: 0
      };
    }

    // Conserver toutes les informations du compte original
    structure[sousClasse].comptes.push({
      compteNum: compte.compteNum,
      compteLibelle: compte.compteLibelle,
      totalDebit: compte.debit || 0,
      totalCredit: compte.credit || 0,
      solde: compte.solde || 0,
      montant: montant,
      type: type  // 'actif' ou 'passif'
    });

    structure[sousClasse].brut += montant;
    structure[sousClasse].net += montant;
  }

  /**
   * Applique les amortissements aux immobilisations
   * ET calcule les amortissements pour chaque compte individuel
   */
  static _appliquerAmortissements(actif, amortissements) {
    Object.keys(amortissements).forEach(sousClasse => {
      if (actif[sousClasse] && amortissements[sousClasse] > 0) {
        actif[sousClasse].amortissements = amortissements[sousClasse];
        actif[sousClasse].net = actif[sousClasse].brut - amortissements[sousClasse];
      }
    });
  }

  /**
   * Calcule les amortissements détaillés pour chaque compte d'immobilisation
   * Retourne un objet { compteNum: montantAmortissement }
   */
  static _calculerAmortissementsDetailles(soldesComptes) {
    const amortissementsParCompte = {};

    // Parcourir tous les comptes d'amortissements
    Object.values(soldesComptes).forEach(compte => {
      const compteNum = compte.compteNum || '';
      
      // Les comptes d'amortissements commencent par 28 ou 29
      if (!compteNum.startsWith('28') && !compteNum.startsWith('29')) return;

      // Le montant d'amortissement = solde créditeur
      const montantAmortissement = Math.max(0, compte.credit - compte.debit);
      if (montantAmortissement < 0.01) return;

      // Extraire le suffixe pour identifier le compte d'immobilisation correspondant
      // Ex: 28051000 → cherche 20510000
      // Pattern: 28xyz → 2xyz (en rajoutant un 0 à la fin si nécessaire)
      
      const prefixe = compteNum.substring(0, 2); // "28" ou "29"
      const suffixe = compteNum.substring(2);    // "051000"
      
      // Mapping des préfixes d'amortissements vers les classes d'immobilisations
      const classeMappings = {
        '280': '20', '290': '20',  // Immobilisations incorporelles
        '281': '21', '291': '21',  // Constructions
        '282': '22', '292': '22',  // Installations techniques
        '283': '23', '293': '23',  // Immobilisations en cours
        '296': '26',               // Participations
        '297': '27'                // Autres immobilisations financières
      };

      const prefixeComplet = compteNum.substring(0, 3); // "280", "281", etc.
      const classeImmob = classeMappings[prefixeComplet];
      
      if (!classeImmob) return;

      // Construire le numéro de compte d'immobilisation attendu
      // Ex: 28051000 → 20510000
      const compteImmobAttendu = classeImmob + suffixe + '0';
      
      // Ajouter l'amortissement pour ce compte
      if (!amortissementsParCompte[compteImmobAttendu]) {
        amortissementsParCompte[compteImmobAttendu] = 0;
      }
      amortissementsParCompte[compteImmobAttendu] += montantAmortissement;
    });

    return amortissementsParCompte;
  }

  /**
   * Enrichit les comptes d'immobilisations avec leurs amortissements individuels
   */
  static _enrichirImmobilisationsAvecAmortissements(actif, soldesComptes) {
    // Calculer les amortissements détaillés
    const amortissementsParCompte = this._calculerAmortissementsDetailles(soldesComptes);

    // Parcourir les immobilisations (classes 20-27)
    ['20', '21', '22', '23', '26', '27'].forEach(sousClasse => {
      if (!actif[sousClasse] || !actif[sousClasse].comptes) return;

      // Enrichir chaque compte avec ses amortissements
      actif[sousClasse].comptes = actif[sousClasse].comptes.map(compte => {
        const compteNum = compte.compteNum || '';
        const brut = compte.montant || 0;
        const amortissements = amortissementsParCompte[compteNum] || 0;
        const net = brut - amortissements;
        const vetuste = brut > 0 ? Math.min(100, (amortissements / brut) * 100) : 0;

        return {
          ...compte,
          brut,
          amortissements,
          net,
          vetuste
        };
      });
    });
  }

  /**
   * ÉTAPE 5 : Ajoute le résultat au passif (compte 12)
   */
  static _ajouterResultatAuPassif(passif, resultat) {
    const sousClasse = '12';

    if (!passif[sousClasse]) {
      passif[sousClasse] = {
        sousClasse,
        libelle: 'Résultat de l\'exercice',
        comptes: [],
        brut: 0,
        amortissements: 0,
        net: 0
      };
    }

    passif[sousClasse].comptes.push({
      compteNum: '12',
      compteLibelle: resultat >= 0 ? 'Résultat de l\'exercice (bénéfice)' : 'Résultat de l\'exercice (perte)',
      totalDebit: 0,
      totalCredit: 0,
      solde: resultat,
      montant: resultat,
      type: 'passif'
    });

    passif[sousClasse].brut = resultat;
    passif[sousClasse].net = resultat;
  }

  /**
   * ÉTAPE 6 : Structure le bilan selon le format PCG
   */
  static _structurerBilan(actifBrut, passifBrut) {
    // Extraire et organiser l'actif
    const immobilisations = this._extraireParClasses(actifBrut, ['20', '21', '22', '23', '26', '27']);
    const stocks = this._extraireParClasses(actifBrut, ['31', '32', '33', '34', '35', '37']);
    const creances = this._extraireParClasses(actifBrut, ['40', '41', '42', '43', '44', '45', '46', '47', '48']);
    const tresorerieActif = this._extraireParClasses(actifBrut, ['50', '51', '53', '54']);

    // Extraire et organiser le passif
    const capitauxPropres = this._extraireParClasses(passifBrut, ['10', '11', '12', '13', '14']);
    const provisions = this._extraireParClasses(passifBrut, ['15']);
    const dettesLongTerme = this._extraireParClasses(passifBrut, ['16', '17']);
    const dettesCourtTerme = this._extraireParClasses(passifBrut, ['40', '41', '42', '43', '44', '45', '46', '47', '48']);
    const tresoreriePassif = this._extraireParClasses(passifBrut, ['51', '52']);

    // Calculer les totaux
    const totalImmobilisations = this._calculerTotal(immobilisations);
    const totalStocks = this._calculerTotal(stocks);
    const totalCreances = this._calculerTotal(creances);
    const totalTresorerieActif = this._calculerTotal(tresorerieActif);
    const totalActifCirculant = totalStocks + totalCreances + totalTresorerieActif;
    const totalActif = totalImmobilisations + totalActifCirculant;

    const totalCapitauxPropres = this._calculerTotal(capitauxPropres);
    const totalProvisions = this._calculerTotal(provisions);
    const totalDettesLongTerme = this._calculerTotal(dettesLongTerme);
    const totalDettesCourtTerme = this._calculerTotal(dettesCourtTerme);
    const totalTresoreriePassif = this._calculerTotal(tresoreriePassif);
    const totalPassifCirculant = totalDettesCourtTerme + totalTresoreriePassif;
    const totalPassif = totalCapitauxPropres + totalProvisions + totalDettesLongTerme + totalPassifCirculant;

    return {
      actif: {
        immobilise: immobilisations,
        circulant: {
          stocks,
          creances,
          tresorerie: tresorerieActif
        },
        totalImmobilise: totalImmobilisations,
        totalStocks,
        totalCreances,
        totalTresorerie: totalTresorerieActif,
        totalCirculant: totalActifCirculant,
        total: totalActif
      },
      passif: {
        capitauxPropres,
        provisions,
        dettesLongTerme,
        dettesCourtTerme,
        tresorerie: tresoreriePassif,
        totalCapitauxPropres,
        totalProvisions,
        totalDettesLongTerme,
        totalDettesCourtTerme,
        totalTresorerie: totalTresoreriePassif,
        totalPassifCirculant,
        total: totalPassif
      },
      equilibre: {
        totalActif,
        totalPassif,
        ecart: totalActif - totalPassif
      }
    };
  }

  /**
   * Extrait les éléments d'une liste de sous-classes
   */
  static _extraireParClasses(structure, sousClasses) {
    return Object.values(structure)
      .filter(item => sousClasses.includes(item.sousClasse))
      .sort((a, b) => a.sousClasse.localeCompare(b.sousClasse))
      .map(item => ({
        classe: item.sousClasse,
        libelle: item.libelle,
        brut: item.brut || 0,
        amortissements: item.amortissements || 0,
        net: item.net || 0,
        comptes: item.comptes || []
      }));
  }

  /**
   * Calcule le total d'une catégorie
   */
  static _calculerTotal(items) {
    return items.reduce((sum, item) => sum + (item.net || 0), 0);
  }

  /**
   * ÉTAPE 7 : Valide l'équilibre du bilan
   */
  static _validerBilan(bilan) {
    const errors = [];
    const warnings = [];

    const totalActif = bilan.actif.total;
    const totalPassif = bilan.passif.total;
    const ecart = Math.abs(totalActif - totalPassif);

    // Vérifier l'équilibre
    if (ecart > 0.01) {
      errors.push(
        `Bilan non équilibré : Actif = ${totalActif.toFixed(2)}€, ` +
        `Passif = ${totalPassif.toFixed(2)}€, Écart = ${ecart.toFixed(2)}€`
      );
    }

    // Avertissements si passif négatif (perte)
    if (totalPassif < 0) {
      warnings.push('Capitaux propres négatifs : situation financière critique');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      equilibre: ecart <= 0.01
    };
  }
}

// Export de la fonction principale
export const generateBilan = (parseResult) => BilanGenerator.generateBilan(parseResult);