/**
 * FEC Cycle Analyzer
 * * Analyse et découpe un FEC selon les cycles comptables CNCC
 * Conforme aux recommandations de la Compagnie Nationale des Commissaires aux Comptes
 * Utilise le mapping officiel depuis regles-affectation-comptes.json
 * * @module core/FECCycleAnalyzer
 */

import { CYCLES_DEFINITION } from '../constants/cycles.js';
import reglesAffectation from '../data/regles-affectation-comptes.json';

/**
 * Classe d'analyse des cycles comptables dans un FEC
 */
export class FECCycleAnalyzer {
  constructor() {
    // Charger les métadonnées des cycles (nom, description, couleur)
    this.cyclesDefinition = CYCLES_DEFINITION;
    
    // Charger le mapping des comptes depuis le JSON (source officielle CNCC)
    this.cyclesMapping = this._loadCyclesMapping();
    
    // Construire un index inversé pour recherche rapide : compte -> cycle
    this.compteToCycleIndex = this._buildCompteToCycleIndex();
    
    // Règles de priorisation pour les comptes ambigus (ex: 44 peut être PERSONNEL ou ETAT_TAXES)
    // Les comptes les plus spécifiques doivent être vérifiés en premier
    this.comptePriorities = this._buildPriorities();
  }

  /**
   * Charge le mapping des cycles depuis le JSON
   * @private
   */
  _loadCyclesMapping() {
    const mapping = reglesAffectation?.utilisationPourFEC?.analyseCycles?.mapping || {};
    
    // Valider que le mapping existe
    if (Object.keys(mapping).length === 0) {
      console.warn('FECCycleAnalyzer: Aucun mapping de cycles trouvé dans le JSON. Utilisation du mapping par défaut.');
      return {};
    }
    
    return mapping;
  }

  /**
   * Construit un index inversé : compte -> cycle
   * Pour recherche rapide O(1) au lieu de O(n)
   * @private
   */
  _buildCompteToCycleIndex() {
    const index = {};
    const prefixLengths = {}; // Pour gérer les conflits de préfixes
    
    for (const [cycleCode, comptes] of Object.entries(this.cyclesMapping)) {
      for (const comptePattern of comptes) {
        // Traiter les patterns avec wildcards (ex: "41x" -> préfixe "41")
        if (comptePattern.endsWith('x')) {
          const prefix = comptePattern.slice(0, -1);
          
          // Si le préfixe existe déjà, garder le plus long préfixe en priorité
          if (!index[prefix] || (prefixLengths[prefix] || 0) < prefix.length) {
            index[prefix] = { cycle: cycleCode, isPrefix: true };
            prefixLengths[prefix] = prefix.length;
          }
        } else {
          // Compte exact - toujours prioritaire sur les préfixes
          if (!index[comptePattern]) {
            index[comptePattern] = { cycle: cycleCode, isPrefix: false };
          }
          
          // Si c'est un compte court (2 chiffres), c'est aussi un préfixe potentiel
          // mais seulement si pas déjà défini comme compte exact
          if (comptePattern.length === 2) {
            const prefixKey = comptePattern + '_prefix';
            if (!index[prefixKey]) {
              index[prefixKey] = { cycle: cycleCode, isPrefix: true };
              prefixLengths[comptePattern] = 2;
            }
          }
        }
      }
    }
    
    return index;
  }

  /**
   * Construit les règles de priorité pour les comptes ambigus
   * Les comptes les plus spécifiques (plus longs) ont priorité
   * @private
   */
  _buildPriorities() {
    // Comptes spécifiques qui doivent avoir priorité
    // Ex: 4456 (TVA déductible) doit être ETAT_TAXES et non PERSONNEL
    const priorities = {
      '4456': 'ETAT_TAXES',
      '4457': 'ETAT_TAXES',
      '4455': 'ETAT_TAXES',
      '445': 'ETAT_TAXES',
      '44': 'ETAT_TAXES', // Par défaut, 44 = ETAT_TAXES si pas de sous-compte spécifique
    };
    
    return priorities;
  }

  /**
   * Trouve le cycle comptable correspondant à un compte et un journal
   * Utilise le mapping officiel CNCC depuis le JSON
   * * @param {string} compteNum - Numéro de compte
   * @param {string} journalCode - Code journal (optionnel, utilisé en fallback)
   * @returns {string} Code du cycle (ex: 'ACHATS_FOURNISSEURS')
   */
  findCycleForCompte(compteNum, journalCode = '') {
    if (!compteNum) return 'OPERATIONS_DIVERSES';

    const compte = String(compteNum).trim();
    
    // 1. Vérifier les priorités explicites (comptes ambigus)
    // Les comptes les plus longs en premier (plus spécifiques)
    const priorityKeys = Object.keys(this.comptePriorities)
      .sort((a, b) => b.length - a.length);
    
    for (const priorityKey of priorityKeys) {
      if (compte.startsWith(priorityKey)) {
        return this.comptePriorities[priorityKey];
      }
    }

    // 2. Chercher dans l'index inversé (mapping JSON)
    // Chercher d'abord les correspondances exactes, puis les préfixes
    const compteExact = this.compteToCycleIndex[compte];
    if (compteExact && !compteExact.isPrefix) {
      return compteExact.cycle;
    }

    // 3. Chercher par préfixe dans le mapping JSON (du plus long au plus court)
    // Pour optimiser, chercher d'abord dans l'index, puis dans le mapping direct
    for (let i = compte.length; i >= 1; i--) {
      const prefix = compte.substring(0, i);
      
      // Vérifier l'index inversé
      const prefixMatch = this.compteToCycleIndex[prefix];
      if (prefixMatch && prefixMatch.isPrefix) {
        return prefixMatch.cycle;
      }
      
      // Vérifier aussi dans le mapping direct (pour les cas non indexés)
      for (const [cycleCode, comptes] of Object.entries(this.cyclesMapping)) {
        for (const comptePattern of comptes) {
          if (comptePattern.endsWith('x')) {
            const patternPrefix = comptePattern.slice(0, -1);
            if (compte.startsWith(patternPrefix)) {
              return cycleCode;
            }
          } else if (compte.startsWith(comptePattern)) {
            // Vérifier que le pattern est assez long pour éviter les faux positifs
            // Ex: éviter que "1" matche "10" alors que c'est "12" qui devrait matcher
            if (comptePattern.length >= 2 || compte.length <= 2) {
              return cycleCode;
            }
          }
        }
      }
    }

    // 4. Si pas trouvé par compte, essayer par journal (fallback)
    if (journalCode) {
      const journal = journalCode.toUpperCase().trim();
      for (const [cycleCode, cycleInfo] of Object.entries(this.cyclesDefinition)) {
        if (cycleInfo.journaux && cycleInfo.journaux.some(j => j.toUpperCase() === journal)) {
          return cycleCode;
        }
      }
    }

    return 'OPERATIONS_DIVERSES';
  }

  /**
   * Analyse un FEC et enrichit les données avec les cycles
   * * @param {Array} data - Données FEC parsées
   * @returns {Object} Objet contenant les données enrichies et les statistiques par cycle
   */
  analyzeFec(data) {
    if (!data || data.length === 0) {
      return {
        dataWithCycles: [],
        statsParCycle: this._getEmptyStats()
      };
    }

    // Créer une copie des données avec les cycles
    const dataWithCycles = data.map(row => {
      const cycleCode = this.findCycleForCompte(row.compteNum, row.journalCode);
      const cycleInfo = this.cyclesDefinition[cycleCode];

      return {
        ...row,
        cycle: cycleCode,
        cycleNom: cycleInfo?.nom || 'Inconnu',
        cycleColor: cycleInfo?.color || '#CCCCCC'
      };
    });

    // Calculer les statistiques par cycle
    const statsParCycle = this._calculateCycleStats(dataWithCycles, data.length);

    return {
      dataWithCycles,
      statsParCycle
    };
  }

  /**
   * Calcule les statistiques pour chaque cycle
   * @private
   */
  _calculateCycleStats(dataWithCycles, totalRows) {
    const statsParCycle = {};

    // CORRECTION : Calculer le vrai total d'écritures sur tout le fichier
    const totalEcrituresReelles = dataWithCycles.reduce((acc, row) => acc + (row.count || 1), 0);

    for (const [cycleCode, cycleInfo] of Object.entries(this.cyclesDefinition)) {
      const dataCycle = dataWithCycles.filter(row => row.cycle === cycleCode);

      // CORRECTION : Sommer les 'count' pour avoir le vrai nombre d'écritures
      const nbEcritures = dataCycle.reduce((sum, row) => sum + (row.count || 1), 0);
      
      const totalDebit = dataCycle.reduce((sum, row) => sum + (row.debit || 0), 0);
      const totalCredit = dataCycle.reduce((sum, row) => sum + (row.credit || 0), 0);

      // Comptes et journaux uniques
      const comptesUniques = new Set(dataCycle.map(row => row.compteNum)).size;
      const journauxUniques = new Set(dataCycle.map(row => row.journalCode)).size;

      statsParCycle[cycleCode] = {
        nom: cycleInfo.nom,
        description: cycleInfo.description,
        color: cycleInfo.color,
        nbEcritures,
        // CORRECTION : Utilisation du total réel pour le pourcentage
        pourcentageEcritures: totalEcrituresReelles > 0 ? (nbEcritures / totalEcrituresReelles * 100) : 0,
        totalDebit,
        totalCredit,
        solde: totalDebit - totalCredit,
        comptesUniques,
        journauxUniques
      };
    }

    return statsParCycle;
  }

  /**
   * Retourne des statistiques vides pour initialisation
   * @private
   */
  _getEmptyStats() {
    const stats = {};
    for (const [cycleCode, cycleInfo] of Object.entries(this.cyclesDefinition)) {
      stats[cycleCode] = {
        nom: cycleInfo.nom,
        description: cycleInfo.description,
        color: cycleInfo.color,
        nbEcritures: 0,
        pourcentageEcritures: 0,
        totalDebit: 0,
        totalCredit: 0,
        solde: 0,
        comptesUniques: 0,
        journauxUniques: 0
      };
    }
    return stats;
  }

  /**
   * Récupère les informations d'un cycle
   * * @param {string} cycleCode - Code du cycle
   * @returns {Object|null} Informations du cycle ou null
   */
  getCycleInfo(cycleCode) {
    return this.cyclesDefinition[cycleCode] || null;
  }

  /**
   * Récupère le mapping des comptes pour un cycle donné
   * * @param {string} cycleCode - Code du cycle
   * @returns {Array} Liste des comptes associés au cycle
   */
  getCycleAccounts(cycleCode) {
    return this.cyclesMapping[cycleCode] || [];
  }

  /**
   * Récupère tous les cycles disponibles
   * * @returns {Object} Définitions de tous les cycles
   */
  getAllCycles() {
    return this.cyclesDefinition;
  }

  /**
   * Récupère le mapping officiel CNCC depuis le JSON
   * * @returns {Object} Mapping complet compte -> cycle
   */
  getCyclesMapping() {
    return this.cyclesMapping;
  }

  /**
   * Recharge le mapping depuis le JSON (utile pour les mises à jour dynamiques)
   */
  reloadMapping() {
    this.cyclesMapping = this._loadCyclesMapping();
    this.compteToCycleIndex = this._buildCompteToCycleIndex();
    this.comptePriorities = this._buildPriorities();
  }
}

// Export d'une instance par défaut
export default new FECCycleAnalyzer();