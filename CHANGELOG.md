# 📝 Changelog - FEC Analyzer

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [2.1.0] - 2024-12-02

### 🗑️ Supprimé
- **Module IA complet** : Suppression de 4 fichiers non fonctionnels
  - `src/services/aiService.js` (~15 KB)
  - `src/components/AgentPanel.jsx` (~8 KB)
  - `src/components/ProgrammeView.jsx` (~5 KB)
  - `src/components/ProgrammeTravailTemplate.jsx` (~3 KB)
- **Dépendance npm** : `@ant-design/plots` (non utilisée)
- **Code mort** : Imports et références au module IA dans `App.jsx`, `AppHeader.jsx`, `AnalysisTabs.jsx`

### ✨ Ajouté
- **Configuration centralisée** (`src/config/`)
  - `ui.config.js` : Labels, couleurs, messages
  - `app.config.js` : Paramètres techniques
  - `navigation.config.js` : Structure des onglets
- **Barrel exports** : Fichiers `index.js` pour imports simplifiés
  - `src/components/index.js`
  - `src/hooks/index.js`
  - `src/core/index.js`
  - `src/utils/index.js`
- **Documentation**
  - `README.md` complet
  - `ARCHITECTURE.md` détaillée
  - `CHANGELOG.md`

### ⚡ Optimisé
- **Handlers mémorisés** : `useCallback` sur tous les handlers de `App.jsx`
  - `handleFileUpload1`
  - `handleFileUpload2`
  - `handleCreateSampleFile`
  - `handleExportBalance`
  - `handleCloseError`
- **Générateurs mémorisés** : `useMemo` dans `useFECDataGenerators.js` (déjà en place)

### 🔧 Modifié
- **AppHeader.jsx** : Suppression du bouton "Assistant IA"
- **AnalysisTabs.jsx** : Suppression de l'onglet "Programme", utilisation de la config centralisée
- **App.jsx** : Imports simplifiés via barrel exports

### 📊 Impact
- **Réduction du code** : ~31 KB de code mort supprimé
- **Maintenabilité** : Configuration centralisée, imports simplifiés
- **Performance** : Handlers et générateurs mémorisés

---

## [2.0.0] - 2024-11

### ✨ Ajouté
- Vue Cycles d'audit
- Vue Bilan avec comparaison N/N-1
- Vue Compte de Résultat
- Vue SIG (Soldes Intermédiaires de Gestion)
- Vue Cash Flow (Tableau des Flux de Trésorerie)
- Recherche entreprise par SIREN
- Export balance comptable Excel
- Fichier FEC d'exemple

### 🔧 Technique
- React 19.1
- Vite 6.3
- Tailwind CSS 4.1
- Recharts pour les graphiques
- Web Worker pour le parsing FEC

---

## [1.0.0] - 2024-10

### ✨ Première version
- Parser de fichiers FEC
- Affichage de la balance
- Interface de base
