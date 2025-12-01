/**
 * Barrel export pour tous les composants
 * 
 * Permet des imports simplifiés :
 * import { AppHeader, FileUploadZone, BilanView } from './components';
 * 
 * @module components
 */

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS DE LAYOUT
// ═══════════════════════════════════════════════════════════════════════════
export { default as AppHeader } from './AppHeader';
export { default as FileUploadZone } from './FileUploadZone';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS DE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
export { default as AnalysisTabs } from './AnalysisTabs';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS D'AFFICHAGE DE DONNÉES
// ═══════════════════════════════════════════════════════════════════════════
export { default as BalanceStats } from './BalanceStats';
export { default as EntrepriseSearch } from './EntrepriseSearch';

// ═══════════════════════════════════════════════════════════════════════════
// VUES PRINCIPALES (Onglets)
// ═══════════════════════════════════════════════════════════════════════════
export { default as BilanView } from './BilanView';
export { default as CashFlowView } from './CashFlowView';
export { default as CompteResultatView } from './CompteResultatView';
export { default as CyclesView } from './CyclesView';
export { default as SIGView } from './SIGView';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════
export { default as Toast } from './Toast';
export { default as ToastContainer } from './ToastContainer';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS SPÉCIALISÉS
// ═══════════════════════════════════════════════════════════════════════════
export { default as RevenueSankey } from './RevenueSankey';
export { default as SeuilParamsModal } from './SeuilParamsModal';
