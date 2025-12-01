/**
 * Configuration de la navigation
 * 
 * Structure des onglets et groupes de navigation.
 * Modifier ce fichier pour ajouter/retirer des onglets.
 * 
 * @module config/navigation.config
 */

import { 
    FileText, 
    BarChart3, 
    Scale, 
    PieChart, 
    Activity, 
    Briefcase,
    TrendingUp
  } from 'lucide-react';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURE DE NAVIGATION À 2 NIVEAUX
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Configuration de la navigation principale
   * 
   * Structure :
   * - Niveau 1 : Groupes (financials, audit)
   * - Niveau 2 : Onglets individuels dans chaque groupe
   * 
   * Pour ajouter un onglet :
   * 1. Ajouter l'entrée dans le groupe approprié
   * 2. Créer le composant correspondant
   * 3. Ajouter le rendu conditionnel dans App.jsx
   */
  export const NAVIGATION_STRUCTURE = {
    // ─────────────────────────────────────────────────────────────────────────
    // GROUPE 1 : Synthèse Financière
    // ─────────────────────────────────────────────────────────────────────────
    financials: {
      id: 'financials',
      label: 'Synthèse Financière',
      icon: FileText,
      color: 'blue',
      description: 'États financiers et indicateurs de performance',
      tabs: [
        { 
          id: 'resultat', 
          label: 'Compte de Résultat', 
          icon: BarChart3,
          description: 'Charges et produits de l\'exercice'
        },
        { 
          id: 'bilan', 
          label: 'Bilan', 
          icon: Scale,
          description: 'Actif et passif à la clôture'
        },
        { 
          id: 'sig', 
          label: 'Soldes Intermédiaires (SIG)', 
          icon: PieChart,
          description: 'Marge commerciale, VA, EBE, etc.'
        },
        { 
          id: 'cashflow', 
          label: 'Flux de Trésorerie', 
          icon: TrendingUp,
          description: 'Tableau des flux de trésorerie'
        },
      ]
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // GROUPE 2 : Audit & Analyse
    // ─────────────────────────────────────────────────────────────────────────
    audit: {
      id: 'audit',
      label: 'Audit & Analyse',
      icon: Briefcase,
      color: 'indigo',
      description: 'Outils d\'analyse et de contrôle',
      tabs: [
        { 
          id: 'cycles', 
          label: 'Répartition par cycle', 
          icon: Activity,
          description: 'Analyse par cycle d\'audit'
        },
        // Note: L'onglet "Programme de travail" a été supprimé (module IA non fonctionnel)
      ]
    }
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CATÉGORIE PAR DÉFAUT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Onglet affiché par défaut au chargement de l'application
   */
  export const DEFAULT_CATEGORY = 'cycles';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Trouve le groupe contenant un onglet donné
   * @param {string} tabId - ID de l'onglet recherché
   * @returns {string|null} - Clé du groupe ou null si non trouvé
   */
  export const findGroupByTabId = (tabId) => {
    return Object.keys(NAVIGATION_STRUCTURE).find(groupKey => 
      NAVIGATION_STRUCTURE[groupKey].tabs.some(tab => tab.id === tabId)
    ) || null;
  };
  
  /**
   * Obtient le premier onglet d'un groupe
   * @param {string} groupKey - Clé du groupe
   * @returns {string|null} - ID du premier onglet ou null
   */
  export const getFirstTabOfGroup = (groupKey) => {
    const group = NAVIGATION_STRUCTURE[groupKey];
    return group?.tabs[0]?.id || null;
  };
  
  /**
   * Liste tous les IDs d'onglets disponibles
   * @returns {string[]} - Tableau des IDs
   */
  export const getAllTabIds = () => {
    return Object.values(NAVIGATION_STRUCTURE)
      .flatMap(group => group.tabs.map(tab => tab.id));
  };
  
  /**
   * Vérifie si un ID d'onglet est valide
   * @param {string} tabId - ID à vérifier
   * @returns {boolean}
   */
  export const isValidTabId = (tabId) => {
    return getAllTabIds().includes(tabId);
  };