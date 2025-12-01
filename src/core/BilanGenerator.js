import { getAccountLabel } from '../utils/accountLabels';
import {
  SEUILS,
  CLASSES_COMPTES,
  COMPTES_CORRECTEURS,
  STRUCTURE_BILAN,
  MAPPING_AMORTISSEMENTS,
  REGLES_CALCUL
} from '../constants/accounting-constants';

export class BilanGenerator {
  
  static generateBilan(parseResult) {
    if (!parseResult?.data?.length) return null;

    // 1. Calculer les soldes (Source de vérité unique)
    const soldes = this._calculerSoldesTousComptes(parseResult.data);

    // 2. Calculer le résultat
    const resultat = this._calculerResultat(soldes);

    // 3. Indexer les amortissements
    const indexAmort = this._indexerAmortissements(soldes);

    // 4. Structures pour accumuler les lignes
    const actifItems = [];
    const passifItems = [];
    const comptesTraites = new Set();

    // 5. TRAITEMENT DES COMPTES SPÉCIAUX (Banques, Tiers, TVA)
    // On passe 'soldes' directement pour être sûr de tout scanner
    this._traiterComptesSpeciaux(soldes, actifItems, passifItems, comptesTraites);

    // 6. AFFECTATION STANDARD (pour le reste)
    this._affecterComptesAuBilan(soldes, actifItems, passifItems, comptesTraites);

    // 7. Ajouter le résultat
    this._ajouterResultatAuPassif(passifItems, resultat);

    // 8. Structurer en grandes masses
    const bilan = this._structurerBilanGrandesMasses(actifItems, passifItems, indexAmort);
    
    // 9. Valider
    bilan.validation = this._validerBilan(bilan);

    return bilan;
  }

  // --- LOGIQUE MÉTIER ---

  static _calculerSoldesTousComptes(fecData) {
    const cache = new Map();
    fecData.forEach(row => {
      const num = row.compteNum;
      if (!num) return;
      if (!cache.has(num)) cache.set(num, { compteNum: num, debit: 0, credit: 0 });
      const c = cache.get(num);
      c.debit += (row.debit || 0);
      c.credit += (row.credit || 0);
    });
    cache.forEach(c => c.solde = c.debit - c.credit);
    return Object.fromEntries(cache);
  }

  static _traiterComptesSpeciaux(soldes, actifItems, passifItems, comptesTraites) {
    // On cumule les montants par catégorie
    const agregats = {
      bq_actif: 0, bq_passif: 0,
      tva_actif: 0, tva_passif: 0,
      clt_actif: 0, clt_passif: 0,
      frn_actif: 0, frn_passif: 0
    };

    Object.values(soldes).forEach(c => {
      const num = c.compteNum;
      const solde = c.solde;

      // BANQUES (51)
      if (num.startsWith('51')) {
        if (solde > 0) agregats.bq_actif += solde;
        else agregats.bq_passif += Math.abs(solde);
        comptesTraites.add(num);
      }
      
      // TVA (445)
      else if (num.startsWith('445')) {
        if (solde > 0) agregats.tva_actif += solde;
        else agregats.tva_passif += Math.abs(solde);
        comptesTraites.add(num);
      }

      // CLIENTS (411 + 41x sauf 419)
      else if (num.startsWith('411') || (num.startsWith('41') && !num.startsWith('419'))) {
        if (solde > 0) agregats.clt_actif += solde;
        else agregats.clt_passif += Math.abs(solde);
        comptesTraites.add(num);
      }

      // FOURNISSEURS (401 + 40x sauf 409)
      else if (num.startsWith('401') || (num.startsWith('40') && !num.startsWith('409'))) {
        if (solde > 0) agregats.frn_actif += solde;
        else agregats.frn_passif += Math.abs(solde);
        comptesTraites.add(num);
      }
    });

    // Création des lignes agrégées
    if (agregats.bq_actif > 0) this._ajouterLigneAgregee(actifItems, '51', 'Banques et disponibilités', agregats.bq_actif);
    if (agregats.bq_passif > 0) this._ajouterLigneAgregee(passifItems, '51', 'Concours bancaires courants', agregats.bq_passif);

    if (agregats.tva_actif > 0) this._ajouterLigneAgregee(actifItems, '44', 'État - TVA déductible', agregats.tva_actif);
    if (agregats.tva_passif > 0) this._ajouterLigneAgregee(passifItems, '44', 'État - Taxes sur le chiffre d\'affaires', agregats.tva_passif);

    if (agregats.clt_actif > 0) this._ajouterLigneAgregee(actifItems, '41', 'Clients et comptes rattachés', agregats.clt_actif);
    if (agregats.clt_passif > 0) this._ajouterLigneAgregee(passifItems, '41', 'Clients créditeurs', agregats.clt_passif);

    if (agregats.frn_actif > 0) this._ajouterLigneAgregee(actifItems, '40', 'Fournisseurs débiteurs', agregats.frn_actif);
    if (agregats.frn_passif > 0) this._ajouterLigneAgregee(passifItems, '40', 'Fournisseurs et comptes rattachés', agregats.frn_passif);
  }

  static _ajouterLigneAgregee(itemsList, numero, libelle, montant) {
    itemsList.push({
      numero: numero,
      libelle: libelle,
      brut: montant,
      amort: 0,
      net: montant,
      racineOrigine: numero,
      isAgregat: true
    });
  }

  static _affecterComptesAuBilan(soldes, actifItems, passifItems, comptesTraites) {
    Object.values(soldes).forEach(c => {
      const num = c.compteNum;
      if (comptesTraites.has(num)) return;

      const classe = num[0];
      const sousClasse = num.substring(0, 2);
      const solde = c.solde;

      if (['6', '7'].includes(classe)) return;
      if (num.startsWith('28') || num.startsWith('29') || num.startsWith('39') || num.startsWith('49') || num.startsWith('59')) return;
      if (Math.abs(solde) < SEUILS.SOLDE_NUL) return;

      const libelle = getAccountLabel(sousClasse) || `Classe ${sousClasse}`;
      const item = this._createItem(sousClasse, libelle, Math.abs(solde), sousClasse);

      if (classe === '1') {
        const isCorrecteur = COMPTES_CORRECTEURS.ACTIF.some(p => num.startsWith(p));
        if (isCorrecteur && solde > 0) actifItems.push(item);
        else passifItems.push(item);
      } 
      else if (['2', '3'].includes(classe)) {
        if (solde > 0) actifItems.push(item);
      }
      else { 
        if (solde > 0) actifItems.push(item);
        else passifItems.push(item);
      }
    });
  }

  static _createItem(numero, libelle, montant, racineOrigine) {
    return { numero, libelle, brut: montant, amort: 0, net: montant, racineOrigine };
  }

  static _ajouterResultatAuPassif(passifItems, resultat) {
    const libelle = resultat >= 0 ? 'Résultat de l\'exercice (bénéfice)' : 'Résultat de l\'exercice (perte)';
    passifItems.push(this._createItem('12', libelle, resultat, '12'));
  }

  static _structurerBilanGrandesMasses(actifItems, passifItems, indexAmort) {
    const processItems = (items) => {
      const map = new Map();
      items.forEach(item => {
        const key = item.numero;
        if (!map.has(key)) map.set(key, { ...item, brut: 0, amort: 0, net: 0 });
        const entry = map.get(key);
        entry.brut += item.brut;
        
        const amortAssocie = indexAmort[item.racineOrigine] || 0;
        if (amortAssocie > 0) {
            entry.amort += amortAssocie;
            indexAmort[item.racineOrigine] = 0; 
        }
      });

      return Array.from(map.values()).map(item => {
        const amort = indexAmort[item.numero] || item.amort;
        item.amort = amort;
        item.net = item.brut - amort;
        return item;
      }).sort((a, b) => a.numero.localeCompare(b.numero));
    };

    const actifFinal = processItems(actifItems);
    const passifFinal = processItems(passifItems);

    const G_ACTIF = {
      IMMO: ['20','21','22','23','25','26','27'],
      CIRC: ['31','32','33','34','35','37', '40','41','42','43','44','45','46','47'],
      TRESO: ['50','51','52','53','54','58']
    };
    
    const G_PASSIF = {
      CAP: ['10','11','12','13','14'],
      DET_LT: ['16','17'],
      PAS_COUR: ['40','41','42','43','44','45','46','47','48'], // 51 exclu
      TRESO_PAS: ['51']
    };

    const filter = (list, codes) => list.filter(i => codes.includes(i.numero));
    const sumNet = (list) => list.reduce((acc, i) => acc + i.net, 0);

    const structure = {
      actif: {
        immobilise: { titre: "ACTIF IMMOBILISÉ", groupes: [{ titre: "Immobilisations", comptes: filter(actifFinal, G_ACTIF.IMMO) }] },
        circulant: { titre: "ACTIF CIRCULANT", groupes: [{ titre: "Stocks & Créances", comptes: filter(actifFinal, G_ACTIF.CIRC) }] },
        tresorerie: { titre: "TRÉSORERIE ACTIVE", groupes: [{ titre: "Disponibilités", comptes: filter(actifFinal, G_ACTIF.TRESO) }] }
      },
      passif: {
        capitaux: { titre: "CAPITAUX PROPRES", groupes: [{ titre: "Capitaux", comptes: filter(passifFinal, G_PASSIF.CAP) }] },
        dettes_lt: { titre: "DETTES FINANCIÈRES", groupes: [{ titre: "Emprunts", comptes: filter(passifFinal, G_PASSIF.DET_LT) }] },
        passif_courant: { titre: "PASSIF CIRCULANT", groupes: [{ titre: "Dettes d'exploitation", comptes: filter(passifFinal, G_PASSIF.PAS_COUR) }] },
        tresorerie_passive: { titre: "TRÉSORERIE PASSIVE", groupes: [{ titre: "Concours bancaires", comptes: filter(passifFinal, G_PASSIF.TRESO_PAS) }] }
      }
    };

    structure.actif.total = sumNet(actifFinal);
    structure.passif.total = sumNet(passifFinal);

    return structure;
  }

  static _indexerAmortissements(soldes) {
    const index = {};
    Object.values(soldes).forEach(c => {
      const num = c.compteNum;
      if (!num.startsWith('28') && !num.startsWith('29') && !num.startsWith('39') && !num.startsWith('49') && !num.startsWith('59')) return;
      
      const montant = Math.max(0, c.credit - c.debit);
      if (montant === 0) return;

      let target = null;
      if (num.startsWith('28') || num.startsWith('29')) {
        const racine3 = num.substring(0, 3);
        target = MAPPING_AMORTISSEMENTS[racine3] || ('2' + num.charAt(2));
      } else if (num.startsWith('39')) target = '3' + num.charAt(2);
      else if (num.startsWith('49')) target = '4' + num.charAt(2);
      else if (num.startsWith('59')) target = '5' + num.charAt(2);

      if (target) index[target] = (index[target] || 0) + montant;
    });
    return index;
  }

  static _calculerResultat(soldes) {
    let res = 0;
    Object.values(soldes).forEach(c => {
      if (c.compteNum.startsWith('7')) res += (c.credit - c.debit);
      else if (c.compteNum.startsWith('6')) res -= (c.debit - c.credit);
    });
    return res;
  }

  static _validerBilan(bilan) {
    const ecart = Math.abs(bilan.actif.total - bilan.passif.total);
    return { isValid: ecart <= SEUILS.EQUILIBRE_BILAN, ecart };
  }
}

export const generateBilan = (parseResult) => BilanGenerator.generateBilan(parseResult);
export default BilanGenerator;