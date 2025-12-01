# 🏗️ Architecture - FEC Analyzer V2.1

> Documentation technique de l'architecture du projet.

---

## 📐 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                          App.jsx                                 │
│                    (Composant principal)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Hooks      │  │   Config     │  │     Components       │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤  │
│  │ useFEC...    │  │ ui.config    │  │ AppHeader            │  │
│  │ useToast     │  │ app.config   │  │ AnalysisTabs         │  │
│  │ useAccount   │  │ navigation   │  │ *View (5 vues)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                        Core                                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  FECParser  │  BilanGen  │  SIGGen  │  CashFlowGen       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                       Utils                                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  formatters  │  colors  │  balanceExporter  │  sampleFEC │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des dossiers

### `/src/components/`

Composants React de l'interface utilisateur.

| Fichier | Rôle | Props principales |
|---------|------|-------------------|
| `AppHeader.jsx` | En-tête de l'application | `hasData` |
| `AnalysisTabs.jsx` | Navigation par onglets | `category`, `onCategoryChange` |
| `FileUploadZone.jsx` | Zones d'upload N et N-1 | `file1`, `file2`, `onFileUpload*` |
| `BalanceStats.jsx` | Statistiques de la balance | `parseResult1`, `parseResult2` |
| `EntrepriseSearch.jsx` | Recherche SIREN | `siren`, `onSearch` |
| `CyclesView.jsx` | Vue cycles d'audit | `cyclesResult1`, `cyclesResult2` |
| `BilanView.jsx` | Vue bilan comptable | `generateBilan`, `parseResult*` |
| `CompteResultatView.jsx` | Vue compte de résultat | `generateCompteResultat` |
| `SIGView.jsx` | Vue SIG | `generateSIG`, `parseResult*` |
| `CashFlowView.jsx` | Vue tableau des flux | `generateCashFlow` |
| `Toast.jsx` | Notification unitaire | `message`, `type` |
| `ToastContainer.jsx` | Conteneur des toasts | `toasts`, `onRemove` |

---

### `/src/config/`

Configuration centralisée de l'application.

| Fichier | Contenu |
|---------|---------|
| `ui.config.js` | Labels, couleurs, messages, formats |
| `app.config.js` | Paramètres techniques (tailles, timeouts, API) |
| `navigation.config.js` | Structure des onglets de navigation |
| `index.js` | Barrel export |

**Exemple d'utilisation :**

```javascript
import { APP_LABELS, CHART_COLORS } from './config';
import { FILE_CONFIG } from './config/app.config';
```

---

### `/src/core/`

Logique métier et générateurs de documents comptables.

| Fichier | Rôle | Entrée | Sortie |
|---------|------|--------|--------|
| `FECParser.js` | Parse les fichiers FEC | `File` | `{ data, balance, rowsCount }` |
| `BilanGenerator.js` | Génère le bilan | `parseResult` | `{ actif, passif, total* }` |
| `ResultatGenerator.js` | Génère le compte de résultat | `parseResult` | `{ charges, produits }` |
| `SIGGenerator.js` | Calcule les SIG | `parseResult` | `{ marge, VA, EBE, ... }` |
| `CashFlowGenerator.js` | Calcule les flux | `parseResult1, parseResult2` | `{ CAF, BFR, ... }` |

**Diagramme de flux :**

```
Fichier FEC (.txt)
       │
       ▼
  ┌─────────────┐
  │  FECParser  │
  └─────────────┘
       │
       ▼
  parseResult { data, balance }
       │
       ├────────────────┬────────────────┬────────────────┐
       ▼                ▼                ▼                ▼
 ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
 │ BilanGen  │   │ ResultGen │   │  SIGGen   │   │ CashFlow  │
 └───────────┘   └───────────┘   └───────────┘   └───────────┘
       │                │                │                │
       ▼                ▼                ▼                ▼
    Bilan          Résultat           SIG            Cash Flow
```

---

### `/src/hooks/`

Hooks React personnalisés pour la logique réutilisable.

| Hook | Rôle | Retour |
|------|------|--------|
| `useFECDataGenerators` | Mémorise les fonctions de génération | `{ generateBilan, generateSIG, ... }` |
| `useAccountDetails` | Détails des comptes par cycle | `{ getCycleDetailsByAccount, ... }` |
| `useEntrepriseSearch` | Recherche entreprise par SIREN | `{ siren, entrepriseInfo, search }` |
| `useToast` | Gestion des notifications | `{ toasts, success, error }` |
| `useMonthlyData` | Données mensuelles des cycles | `{ monthlyData }` |

**Optimisations appliquées :**

```javascript
// useFECDataGenerators.js
const generateBilan = useMemo(() => {
  return (parseResultParam) => {
    // ... logique
  };
}, [parseResult1]); // Recalculé uniquement si parseResult1 change
```

---

### `/src/utils/`

Fonctions utilitaires pures (sans état React).

| Fichier | Fonctions exportées |
|---------|---------------------|
| `formatters.js` | `formatCurrency`, `formatDate`, `formatPercent` |
| `colors.js` | `hexToRgb`, `brightenColor`, `darkenColor`, ... |
| `fecCycleAnalyzer.js` | `analyzeFec` |
| `balanceExporter.js` | `exportBalanceComptable` |
| `sampleFEC.js` | `createSampleFECFile` |
| `seuilCalculator.js` | `calculerSeuilsAudit`, `formatSeuil` |

---

## 🔄 Flux de données

### 1. Chargement d'un fichier FEC

```
Utilisateur sélectionne un fichier
            │
            ▼
    handleFileUpload1()
            │
            ▼
    FECParser.parse(file)
            │
            ▼
    setParseResult1(result)
            │
            ▼
    analyzeFec(result.data)
            │
            ▼
    setCyclesResult1(analysis)
            │
            ▼
    Affichage des données
```

### 2. Navigation entre vues

```
Clic sur onglet "Bilan"
            │
            ▼
    setAnalysisCategory('bilan')
            │
            ▼
    Rendu conditionnel de BilanView
            │
            ▼
    BilanView appelle generateBilan()
            │
            ▼
    Affichage du bilan
```

---

## ⚡ Optimisations

### React.memo (potentiel)

Les composants lourds peuvent être wrappés avec `React.memo` :

```javascript
const BilanView = memo(function BilanView({ ... }) {
  // ...
});
```

### useCallback

Tous les handlers dans `App.jsx` sont mémorisés :

```javascript
const handleFileUpload1 = useCallback(async (event) => {
  // ...
}, [success, showError]);
```

### useMemo

Les générateurs dans `useFECDataGenerators` sont mémorisés :

```javascript
const generateBilan = useMemo(() => {
  return (parseResultParam) => BilanGenerator.generateBilan(/*...*/);
}, [parseResult1]);
```

---

## 🎨 Conventions de code

### Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Composants | PascalCase | `BilanView.jsx` |
| Hooks | camelCase avec `use` | `useToast.js` |
| Utils | camelCase | `formatters.js` |
| Config | SCREAMING_SNAKE_CASE | `APP_LABELS` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |

### Imports

Utiliser les barrel exports :

```javascript
// ✅ Bon
import { BilanView, SIGView } from './components';
import { useToast } from './hooks';

// ❌ Éviter
import BilanView from './components/BilanView';
import { useToast } from './hooks/useToast';
```

### Commentaires

- Tous les commentaires en **français**
- JSDoc pour les fonctions publiques
- Commentaires de section avec `// ═══════════`

---

## 🧪 Tests (à implémenter)

Structure recommandée :

```
src/
├── __tests__/
│   ├── core/
│   │   ├── FECParser.test.js
│   │   ├── BilanGenerator.test.js
│   │   └── ...
│   ├── hooks/
│   │   └── useToast.test.js
│   └── utils/
│       └── formatters.test.js
```

---

## 📦 Dépendances

### Production

| Package | Usage |
|---------|-------|
| `react` | Framework UI |
| `react-dom` | Rendu DOM |
| `recharts` | Graphiques |
| `lucide-react` | Icônes |
| `xlsx` | Export Excel |
| `d3` | Visualisations (Sankey) |

### Développement

| Package | Usage |
|---------|-------|
| `vite` | Build tool |
| `tailwindcss` | CSS utilitaire |
| `eslint` | Linting |

---

## 🔮 Évolutions futures

### V2.2 (planifié)
- [ ] Tests unitaires
- [ ] Contexte React global (`FECContext`)
- [ ] Mode sombre
- [ ] PWA (mode hors-ligne)

### V3.0 (idées)
- [ ] Comparaison multi-exercices (N, N-1, N-2)
- [ ] Import de fichiers Excel
- [ ] Rapports PDF automatiques
- [ ] Intégration API comptabilité
