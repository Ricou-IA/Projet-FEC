import { ResultatGenerator } from './ResultatGenerator.jsx';

class BilanGenerator {
  constructor(parser) {
    this.parser = parser;
    this.actif = {
      immobilise: { titre: 'I - ACTIF IMMOBILISÉ', groupes: [] },
      circulant: { titre: 'II - ACTIF CIRCULANT', groupes: [] }
    };
    this.passif = {
      capitauxPropres: { titre: 'I - CAPITAUX PROPRES', groupes: [] },
      dettesFinancieres: { titre: 'II - DETTES FINANCIÈRES', groupes: [] },
      passifCirculant: { titre: 'III - PASSIF CIRCULANT', groupes: [] }
    };
  }

  generer(parseResult = null) {
    // Calculer les amortissements avant de traiter les immobilisations
    const amortissements = this._calculerAmortissements();
    
    this._traiterClasse1(); // Capital et réserves
    this._traiterClasse2(amortissements); // Immobilisations avec amortissements
    this._traiterClasse3(); // Stocks
    this._traiterClasse4(); // Tiers (NON COMPENSÉ)
    this._traiterClasse5(); // Financier
    
    // Calculer et ajouter le résultat de l'exercice en utilisant ResultatGenerator
    if (parseResult) {
      const resultat = this._calculerResultatExercice(parseResult);
      this._ajouterResultatAuPassif(resultat);
    }
    
    return {
      actif: this.actif,
      passif: this.passif
    };
  }

  _traiterClasse1() {
    const comptes = this.parser.getComptesByClasse('1');
    
    const groupe = {
      titre: 'Capital et réserves',
      comptes: []
    };

    comptes.forEach(compte => {
      const numero = compte.numero;
      
      // Comptes correcteurs à l'actif
      if (['109', '119', '129', '139', '169'].some(c => numero.startsWith(c))) {
        this._ajouterAuGroupe(this.actif.immobilise, {
          numero: compte.numero,
          libelle: compte.libelle,
          montant: Math.abs(compte.solde)
        });
      } 
      // Exclure le résultat de l'exercice (120/129) - il sera ajouté séparément
      else if (numero.startsWith('120') || numero.startsWith('129')) {
        // Ne pas ajouter le compte 120/129 ici, il sera ajouté via _ajouterResultatAuPassif
        return;
      }
      // Autres comptes au passif
      else {
        groupe.comptes.push({
          numero: compte.numero,
          libelle: compte.libelle,
          montant: Math.abs(compte.solde)
        });
      }
    });

    if (groupe.comptes.length > 0) {
      this.passif.capitauxPropres.groupes.push(groupe);
    }
  }

  _traiterClasse2(amortissements = {}) {
    const comptes = this.parser.getComptesByClasse('2');
    
    const groupes = {
      '20': { titre: 'Immobilisations incorporelles', amortPrefix: '280' },
      '21': { titre: 'Immobilisations corporelles', amortPrefix: '281' },
      '26': { titre: 'Participations et créances rattachées', amortPrefix: '296' },
      '27': { titre: 'Autres immobilisations financières', amortPrefix: '297' }
    };

    Object.entries(groupes).forEach(([prefix, config]) => {
      const comptesGroupe = comptes.filter(c => c.numero.startsWith(prefix));
      
      if (comptesGroupe.length > 0) {
        const groupe = {
          titre: config.titre,
          comptes: comptesGroupe.map(c => {
            const brut = c.solde > 0 ? c.solde : 0;
            // Calculer les amortissements pour ce compte
            const amort = this._calculerAmortissementPourCompte(c.numero, amortissements, config.amortPrefix);
            const net = Math.max(0, brut - amort);
            
            const compteAvecAmort = {
              numero: c.numero,
              libelle: c.libelle,
              montant: net, // Afficher la valeur nette
              brut: brut,
              amortissements: amort,
              net: net
            };
            
            // Debug pour tous les comptes d'immobilisations
            console.log(`BilanGenerator - Compte ${c.numero} (${config.titre}): Brut=${brut}, Amort=${amort}, Net=${net}, amortPrefix=${config.amortPrefix}`);
            
            return compteAvecAmort;
          })
        };
        
        this.actif.immobilise.groupes.push(groupe);
      }
    });
  }

  _calculerAmortissements() {
    const amortissements = {};
    
    // Récupérer tous les comptes pour trouver les 28x et 29x
    const allComptes = [];
    for (let i = 0; i < 10; i++) {
      const comptes = this.parser.getComptesByClasse(String(i));
      allComptes.push(...comptes);
    }
    
    console.log('BilanGenerator - Recherche des comptes d\'amortissement (28x et 29x)');
    console.log('  Total comptes analysés:', allComptes.length);
    
    // Mapping des amortissements vers les immobilisations
    const mapping = {
      '280': '20', // Amortissements des immobilisations incorporelles
      '281': '21', // Amortissements des immobilisations corporelles
      '282': '22', // Amortissements des immobilisations mises en concession
      '296': '26', // Dépréciations des participations
      '297': '27', // Dépréciations des autres immobilisations financières
      '290': '20', // Dépréciations des immobilisations incorporelles
      '291': '21', // Dépréciations des immobilisations corporelles
      '292': '22', // Dépréciations des immobilisations mises en concession
      '293': '23'  // Dépréciations des immobilisations en cours
    };
    
    const comptesAmortTrouves = [];
    
    allComptes.forEach(compte => {
      const numero = compte.numero;
      
      // Vérifier si c'est un compte d'amortissement (commence par 28 ou 29)
      if (!numero.startsWith('28') && !numero.startsWith('29')) {
        return;
      }
      
      comptesAmortTrouves.push({
        numero,
        debit: compte.debit,
        credit: compte.credit,
        solde: compte.solde
      });
      
      // Les comptes 28x correspondent aux comptes 2x (le 3e chiffre reste identique)
      // Exemples:
      // - 28510000 -> 20510000 (285 -> 205)
      // - 281540000 -> 21540000 (281 -> 215)
      // - 28051000 -> 2051000 (280 -> 205)
      // - 29051000 -> 2051000 (290 -> 205, dépréciation)
      
      // Extraire le 3e chiffre pour déterminer la classe d'immobilisation
      if (numero.length >= 3) {
        const troisiemeChiffre = numero.charAt(2); // Le 3e chiffre (0, 1, 2, 3, 5, 6, 7, 9)
        const compteImmobPrefix = '2' + troisiemeChiffre; // 20, 21, 22, 23, 25, 26, 27, 29
        
        // Vérifier si ce préfixe est dans le mapping (pour validation)
        const prefix3 = numero.substring(0, 3);
        if (mapping[prefix3]) {
          // Si le compte d'amortissement a plus de 3 chiffres, prendre le suffixe
          if (numero.length > 3) {
            let suffixe = numero.substring(3); // Tout après 280, 281, etc.
            
            // Les comptes d'amortissement ont souvent un 0 supplémentaire à la fin
            // Ex: 285100000 (9 caractères) -> 20510000 (8 caractères)
            // Mais il faut aussi gérer le cas où le compte d'amortissement a 8 caractères
            // Ex: 28051000 (8 caractères) -> 20510000 (8 caractères)
            // Le suffixe après 280 est "51000" (5 caractères)
            
            // D'après les logs, 28051000 -> 20510000
            // Le suffixe "51000" doit devenir "10000" pour avoir le compte "20510000"
            // Donc il faut enlever le premier chiffre du suffixe et ajouter un 0 à la fin
            // Mais attendez, le 3e chiffre de 28051000 est 0, donc compteImmobPrefix = "20"
            // Pour avoir "20510000", il faut que le préfixe soit "205", pas "20"
            // Donc le 3e chiffre du compte d'immobilisation vient du suffixe, pas du compte d'amortissement !
            
            // En fait, la logique est : pour 28051000
            // - Les 3 premiers chiffres "280" indiquent que c'est un amortissement d'immobilisations incorporelles (classe 20)
            // - Le suffixe "51000" contient le numéro du compte d'immobilisation : "51000" -> "5100" -> compte "20510000"
            // Le compte d'immobilisation est "20510000", donc le suffixe devrait être "51000" -> "10000"
            // Mais ça ne correspond pas...
            
            // Regardons différemment : peut-être que le compte d'amortissement 28051000 correspond à plusieurs comptes
            // Ou peut-être que la correspondance est : 28051000 -> tous les comptes 2051xxxx
            
            // Stocker l'amortissement avec la clé correspondant au compte d'immobilisation
            // D'après les logs : 28051000 -> doit correspondre à 20510000
            // Le compte d'amortissement 28051000 a :
            // - Préfixe "280" (amortissement d'immobilisations incorporelles)
            // - Suffixe "51000" (5 caractères)
            // Le compte d'immobilisation 20510000 a :
            // - Préfixe "205" (immobilisations incorporelles, sous-classe 5)
            // - Suffixe "10000" (5 caractères)
            
            // La correspondance : le 3e chiffre du compte d'immobilisation (5) vient du premier chiffre du suffixe "51000"
            // Donc : suffixe "51000" -> enlever le premier chiffre "5" -> "10000"
            // Et le préfixe devient "205" au lieu de "20"
            
            // Correction : extraire le 3e chiffre du compte d'immobilisation depuis le suffixe
            let suffixeImmob = suffixe;
            let prefixeImmob = compteImmobPrefix;
            
            // Si le suffixe a au moins 1 caractère, le premier chiffre indique la sous-classe
            // Ex: 28051000 -> suffixe "51000", premier chiffre "5" -> préfixe "205", suffixe "10000"
            if (suffixe.length > 0) {
              const sousClasse = suffixe.charAt(0);
              prefixeImmob = compteImmobPrefix + sousClasse; // "20" + "5" = "205"
              suffixeImmob = suffixe.substring(1); // Enlever le premier chiffre "5" -> "10000"
            }
            
            // Si le suffixe se termine par 0, on peut l'enlever pour avoir une correspondance plus courte
            // Mais on stocke d'abord avec la clé complète
            const compteImmobAttendu = prefixeImmob + suffixeImmob;
            
            const montantAmort = Math.max(0, compte.credit - compte.debit);
            
            if (!amortissements[compteImmobAttendu]) {
              amortissements[compteImmobAttendu] = 0;
            }
            amortissements[compteImmobAttendu] += montantAmort;
            
            // Stocker aussi avec une clé plus courte (sans le dernier 0) pour correspondance flexible
            if (suffixeImmob.endsWith('0') && suffixeImmob.length > 1) {
              const compteImmobCourt = prefixeImmob + suffixeImmob.slice(0, -1);
              if (!amortissements[compteImmobCourt]) {
                amortissements[compteImmobCourt] = 0;
              }
              amortissements[compteImmobCourt] += montantAmort;
            }
            
            console.log(`  Amortissement trouvé: ${numero} -> ${compteImmobAttendu}${suffixeImmob.endsWith('0') && suffixeImmob.length > 1 ? ' (et ' + (prefixeImmob + suffixeImmob.slice(0, -1)) + ')' : ''}, montant: ${montantAmort} (débit: ${compte.debit}, crédit: ${compte.credit})`);
          } else {
            // Si le compte d'amortissement est juste 280, 281, etc., on l'applique à tous les comptes de la classe
            // On stocke avec la clé du préfixe pour une correspondance partielle
            const cle = compteImmobPrefix;
            if (!amortissements[cle]) {
              amortissements[cle] = 0;
            }
            const montantAmort = Math.max(0, compte.credit - compte.debit);
            amortissements[cle] += montantAmort;
            
            console.log(`  Amortissement global trouvé: ${numero} -> ${cle}, montant: ${montantAmort}`);
          }
        }
      }
    });
    
    console.log('BilanGenerator - Comptes d\'amortissement trouvés:', comptesAmortTrouves.length);
    if (comptesAmortTrouves.length > 0) {
      console.log('  Détails:', comptesAmortTrouves);
    }
    console.log('BilanGenerator - Amortissements calculés:', amortissements);
    
    return amortissements;
  }

  _calculerAmortissementPourCompte(numeroCompte, amortissements, amortPrefix) {
    // Chercher les amortissements correspondants
    // Utiliser un Set pour éviter de compter le même amortissement plusieurs fois
    const clesUtilisees = new Set();
    let totalAmort = 0;
    
    const ajouterAmortissement = (cle) => {
      if (!clesUtilisees.has(cle) && amortissements[cle]) {
        clesUtilisees.add(cle);
        totalAmort += amortissements[cle];
        console.log(`    Trouvé amortissement pour ${numeroCompte} avec clé: ${cle}, montant: ${amortissements[cle]}`);
        return true; // Indique qu'on a trouvé quelque chose
      }
      return false;
    };
    
    console.log(`  Recherche amortissement pour compte: ${numeroCompte}, amortPrefix: ${amortPrefix}`);
    console.log(`  Clés disponibles dans amortissements:`, Object.keys(amortissements).filter(k => k.startsWith('20') || k.startsWith('21') || k.startsWith('26') || k.startsWith('27')));
    
    // 1. Chercher d'abord avec le compte exact
    if (ajouterAmortissement(numeroCompte)) {
      return totalAmort; // Si trouvé, on s'arrête là
    }
    
    // 2. Chercher avec des variantes en enlevant des 0 à la fin
    // Ex: 20510000 -> 2051000, 205100, 20510, 2051, 205
    let compteVariante = numeroCompte;
    while (compteVariante.length > 2 && compteVariante.endsWith('0')) {
      compteVariante = compteVariante.slice(0, -1);
      if (ajouterAmortissement(compteVariante)) {
        return totalAmort; // Si trouvé, on s'arrête
      }
    }
    
    // 3. Chercher avec le préfixe d'amortissement correspondant
    // Ex: pour compte 20510000, chercher avec préfixe 285 (28 + 3e chiffre 5)
    const troisiemeChiffre = numeroCompte.charAt(2); // Le 3e chiffre du compte (ex: 5 pour 20510000)
    const prefixeAmort = '28' + troisiemeChiffre; // 285 pour compte 205
    const prefixeDepreciation = '29' + troisiemeChiffre; // 295 pour compte 205
    const suffixe = numeroCompte.substring(3); // Les chiffres après 205 (ex: 10000 pour 20510000)
    
    // Chercher avec le préfixe d'amortissement + suffixe
    const compteAmortExact = prefixeAmort + suffixe; // 285 + 10000 = 28510000
    if (ajouterAmortissement(compteAmortExact)) {
      return totalAmort;
    }
    
    // Chercher avec préfixe d'amortissement + suffixe + 0
    const compteAmortAvec0 = compteAmortExact + '0';
    if (ajouterAmortissement(compteAmortAvec0)) {
      return totalAmort;
    }
    
    // Chercher avec dépréciations
    const compteDepreciationExact = prefixeDepreciation + suffixe;
    if (ajouterAmortissement(compteDepreciationExact)) {
      return totalAmort;
    }
    
    const compteDepreciationAvec0 = compteDepreciationExact + '0';
    if (ajouterAmortissement(compteDepreciationAvec0)) {
      return totalAmort;
    }
    
    // 4. Chercher avec des variantes du suffixe (en enlevant des 0)
    let suffixeVariante = suffixe;
    while (suffixeVariante.length > 0 && suffixeVariante.endsWith('0')) {
      suffixeVariante = suffixeVariante.slice(0, -1);
      const compteAmortVariante = prefixeAmort + suffixeVariante;
      if (ajouterAmortissement(compteAmortVariante)) {
        return totalAmort;
      }
      const compteDepreciationVariante = prefixeDepreciation + suffixeVariante;
      if (ajouterAmortissement(compteDepreciationVariante)) {
        return totalAmort;
      }
    }
    
    // 5. Correspondance par préfixe de classe (si amortissement global pour toute la classe)
    // Ex: amortissement 280 pour tous les comptes 20x
    // On l'utilise seulement si on n'a pas trouvé d'amortissement spécifique
    if (totalAmort === 0) {
      const prefixeClasse = numeroCompte.substring(0, 2); // 20, 21, etc.
      ajouterAmortissement(prefixeClasse);
    }
    
    if (totalAmort === 0) {
      console.log(`    Aucun amortissement trouvé pour ${numeroCompte}`);
    }
    
    return totalAmort;
  }

  _calculerResultatExercice(parseResult) {
    // Utiliser ResultatGenerator pour calculer le résultat de l'exercice
    // Cela garantit la cohérence avec l'onglet "Résultat"
    try {
      const compteResultat = ResultatGenerator.generateCompteResultat(parseResult);
      
      // Le résultat net est dans resultatsIntermediaires.net.montant
      const resultatNet = compteResultat?.resultatsIntermediaires?.net?.montant || 0;
      
      console.log('BilanGenerator - Résultat exercice depuis ResultatGenerator:', resultatNet);
      
      return resultatNet;
    } catch (error) {
      console.error('Erreur lors du calcul du résultat avec ResultatGenerator:', error);
      return 0;
    }
  }

  _ajouterResultatAuPassif(resultat) {
    // Trouver ou créer le groupe "Résultat de l'exercice" dans les capitaux propres
    let groupeResultat = this.passif.capitauxPropres.groupes.find(g => 
      g.titre === 'Résultat de l\'exercice'
    );
    
    if (!groupeResultat) {
      groupeResultat = {
        titre: 'Résultat de l\'exercice',
        comptes: []
      };
      // Insérer le résultat juste après "Capital et réserves" si il existe
      const indexCapital = this.passif.capitauxPropres.groupes.findIndex(g => 
        g.titre === 'Capital et réserves'
      );
      if (indexCapital >= 0) {
        this.passif.capitauxPropres.groupes.splice(indexCapital + 1, 0, groupeResultat);
      } else {
        // Sinon, l'ajouter à la fin
        this.passif.capitauxPropres.groupes.push(groupeResultat);
      }
    }
    
    // Ajouter le compte de résultat
    groupeResultat.comptes.push({
      numero: resultat >= 0 ? '120' : '129',
      libelle: resultat >= 0 ? 'Résultat de l\'exercice (bénéfice)' : 'Résultat de l\'exercice (perte)',
      montant: Math.abs(resultat)
    });
  }

  _traiterClasse3() {
    const comptes = this.parser.getComptesByClasse('3');
    
    const groupe = {
      titre: 'A - Stocks',
      comptes: []
    };

    const groupes = {
      '31': 'Matières premières',
      '32': 'Autres approvisionnements',
      '33': 'En-cours de production de biens',
      '35': 'En-cours de production de services',
      '37': 'Stocks de marchandises'
    };

    Object.entries(groupes).forEach(([prefix, titre]) => {
      const comptesGroupe = comptes.filter(c => c.numero.startsWith(prefix));
      
      if (comptesGroupe.length > 0) {
        // Les stocks sont déjà regroupés par préfixe (31, 32, etc.), donc on garde ce regroupement
        groupe.comptes.push({
          numero: prefix,
          libelle: titre,
          montant: comptesGroupe.reduce((sum, c) => sum + (c.solde > 0 ? c.solde : 0), 0)
        });
      }
    });

    if (groupe.comptes.length > 0) {
      this.actif.circulant.groupes.push(groupe);
    }
  }

  _traiterClasse4() {
    const comptes = this.parser.getComptesByClasse('4');
    
    // Groupes pour l'actif
    const groupeCreances = {
      titre: 'B - Créances',
      comptes: []
    };

    // Groupes pour le passif
    const groupeDettes = {
      titre: 'A - Dettes',
      comptes: []
    };

    comptes.forEach(compte => {
      const numero = compte.numero;
      const hasAuxiliaires = compte.auxiliaires && compte.auxiliaires.size > 0;

      if (hasAuxiliaires) {
        // Décomposer en débiteurs/créditeurs (NON COMPENSÉ)
        const decomposition = this.parser.getAuxiliairesDecomposes(numero);
        
        // Ajouter les débiteurs à l'actif
        if (decomposition.totalDebiteurs > 0) {
          groupeCreances.comptes.push({
            numero: numero,
            libelle: compte.libelle,
            montant: decomposition.totalDebiteurs,
            auxiliaires: decomposition.debiteurs
          });
        }
        
        // Ajouter les créditeurs au passif
        if (decomposition.totalCrediteurs > 0) {
          groupeDettes.comptes.push({
            numero: numero,
            libelle: compte.libelle,
            montant: decomposition.totalCrediteurs,
            auxiliaires: decomposition.crediteurs
          });
        }
      } else {
        // Pas d'auxiliaires : traitement standard selon le solde
        if (numero.startsWith('40') || numero.startsWith('43') || 
            numero.startsWith('44571') || numero.startsWith('44578') ||
            numero.startsWith('487') || numero.startsWith('519')) {
          // Comptes normalement au passif
          if (compte.solde < 0) {
            groupeDettes.comptes.push({
              numero: numero,
              libelle: compte.libelle,
              montant: Math.abs(compte.solde)
            });
          } else if (compte.solde > 0) {
            // Cas anormal : fournisseur débiteur
            groupeCreances.comptes.push({
              numero: numero,
              libelle: compte.libelle,
              montant: compte.solde
            });
          }
        } 
        else if (numero.startsWith('41') || numero.startsWith('44566') || 
                 numero.startsWith('486')) {
          // Comptes normalement à l'actif
          if (compte.solde > 0) {
            groupeCreances.comptes.push({
              numero: numero,
              libelle: compte.libelle,
              montant: compte.solde
            });
          } else if (compte.solde < 0) {
            // Cas anormal : client créditeur
            groupeDettes.comptes.push({
              numero: numero,
              libelle: compte.libelle,
              montant: Math.abs(compte.solde)
            });
          }
        }
        else {
          // Autres comptes de classe 4 : selon le solde
          if (compte.solde > 0) {
            groupeCreances.comptes.push({
              numero: numero,
              libelle: compte.libelle,
              montant: compte.solde
            });
          } else if (compte.solde < 0) {
            groupeDettes.comptes.push({
              numero: numero,
              libelle: compte.libelle,
              montant: Math.abs(compte.solde)
            });
          }
        }
      }
    });

    // Ajouter les groupes aux sections appropriées
    if (groupeCreances.comptes.length > 0) {
      this.actif.circulant.groupes.push(groupeCreances);
    }

    if (groupeDettes.comptes.length > 0) {
      this.passif.passifCirculant.groupes.push(groupeDettes);
    }
  }

  _traiterClasse5() {
    const comptes = this.parser.getComptesByClasse('5');
    
    const groupeTresorerie = {
      titre: 'C - Trésorerie',
      comptes: []
    };

    const groupeTresoreriePassive = {
      titre: 'B - Trésorerie passive',
      comptes: []
    };

    comptes.forEach(compte => {
      const numero = compte.numero;
      
      // 519 : Concours bancaires courants (toujours au passif)
      if (numero.startsWith('519')) {
        groupeTresoreriePassive.comptes.push({
          numero: numero,
          libelle: compte.libelle,
          montant: Math.abs(compte.solde)
        });
      }
      // Autres comptes de classe 5 : selon le solde
      else {
        if (compte.solde > 0) {
          groupeTresorerie.comptes.push({
            numero: numero,
            libelle: compte.libelle,
            montant: compte.solde
          });
        } else if (compte.solde < 0) {
          groupeTresoreriePassive.comptes.push({
            numero: numero,
            libelle: compte.libelle,
            montant: Math.abs(compte.solde)
          });
        }
      }
    });

    if (groupeTresorerie.comptes.length > 0) {
      this.actif.circulant.groupes.push(groupeTresorerie);
    }

    if (groupeTresoreriePassive.comptes.length > 0) {
      this.passif.passifCirculant.groupes.push(groupeTresoreriePassive);
    }
  }

  _ajouterAuGroupe(section, compte) {
    if (!section.groupes) {
      section.groupes = [];
    }
    
    let groupe = section.groupes.find(g => g.titre === 'Autres');
    
    if (!groupe) {
      groupe = { titre: 'Autres', comptes: [] };
      section.groupes.push(groupe);
    }
    
    groupe.comptes.push(compte);
  }


  calculerTotaux() {
    const totalActif = this._calculerTotalSection(this.actif);
    const totalPassif = this._calculerTotalSection(this.passif);

    return {
      actif: totalActif,
      passif: totalPassif,
      equilibre: Math.abs(totalActif - totalPassif) < 0.01
    };
  }

  _calculerTotalSection(section) {
    let total = 0;
    
    Object.values(section).forEach(partie => {
      if (partie.groupes) {
        partie.groupes.forEach(groupe => {
          if (groupe.comptes) {
            total += groupe.comptes.reduce((sum, c) => sum + (c.montant || 0), 0);
          }
        });
      }
    });

    return total;
  }

  /**
   * Méthode statique pour générer un bilan à partir d'un parseResult
   * @param {Object} parseResult - Résultat du parsing FEC
   * @returns {Object} Bilan structuré
   */
  static generateBilan(parseResult) {
    if (!parseResult?.data || parseResult.data.length === 0) {
      return null;
    }

    // Créer un adaptateur de parser à partir des données
    const parserAdapter = {
      comptes: new Map(),
      comptesAuxiliaires: new Map(),
      
      getComptesByClasse(classe) {
        const comptes = [];
        this.comptes.forEach((compte, numero) => {
          if (numero.startsWith(classe)) {
            comptes.push(compte);
          }
        });
        return comptes.sort((a, b) => a.numero.localeCompare(b.numero));
      },
      
      getAuxiliairesDecomposes(compteNum) {
        const compte = this.comptes.get(compteNum);
        if (!compte || !compte.auxiliaires) {
          return {
            debiteurs: [],
            crediteurs: [],
            totalDebiteurs: 0,
            totalCrediteurs: 0
          };
        }
        
        const debiteurs = [];
        const crediteurs = [];
        
        compte.auxiliaires.forEach(aux => {
          if (aux.solde > 0) {
            debiteurs.push({ ...aux });
          } else if (aux.solde < 0) {
            crediteurs.push({ ...aux });
          }
        });

        return {
          debiteurs,
          crediteurs,
          totalDebiteurs: debiteurs.reduce((sum, aux) => sum + aux.solde, 0),
          totalCrediteurs: crediteurs.reduce((sum, aux) => sum + Math.abs(aux.solde), 0)
        };
      }
    };

    // Construire la structure de comptes à partir des données
    parseResult.data.forEach(ecriture => {
      const compteNum = ecriture.compteNum || '';
      const compteAux = ecriture.compteAuxNum?.trim();
      
      if (!parserAdapter.comptes.has(compteNum)) {
        parserAdapter.comptes.set(compteNum, {
          numero: compteNum,
          libelle: ecriture.compteLibelle || '',
          debit: 0,
          credit: 0,
          solde: 0,
          auxiliaires: new Map()
        });
      }

      const compte = parserAdapter.comptes.get(compteNum);
      compte.debit += (ecriture.debit || 0);
      compte.credit += (ecriture.credit || 0);
      compte.solde = compte.debit - compte.credit;

      // Gérer les auxiliaires pour la classe 4
      if (compteNum.startsWith('4') && compteAux) {
        if (!compte.auxiliaires.has(compteAux)) {
          compte.auxiliaires.set(compteAux, {
            numero: compteNum,
            auxiliaire: compteAux,
            libelle: ecriture.compteAuxLibelle || compteAux,
            debit: 0,
            credit: 0,
            solde: 0
          });
        }

        const aux = compte.auxiliaires.get(compteAux);
        aux.debit += (ecriture.debit || 0);
        aux.credit += (ecriture.credit || 0);
        aux.solde = aux.debit - aux.credit;
      }
    });

    // Créer une instance de BilanGenerator et générer le bilan
    const generator = new BilanGenerator(parserAdapter);
    return generator.generer(parseResult);
  }
}

export default BilanGenerator;