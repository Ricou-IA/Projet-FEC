# 📊 FEC Analyzer V2.1

> Outil d'analyse de Fichiers des Écritures Comptables (FEC) pour les experts-comptables et les entreprises.

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![React](https://img.shields.io/badge/React-19.1-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Fonctionnalités

### Analyse des données FEC
- **Import de fichiers FEC** : Support des fichiers `.txt` au format FEC normalisé
- **Comparaison N / N-1** : Chargez deux exercices pour une analyse comparative
- **Validation automatique** : Vérification de l'équilibre de la balance

### Vues disponibles

| Vue | Description |
|-----|-------------|
| 🔄 **Cycles** | Répartition par cycles d'audit (Achats, Ventes, Trésorerie...) |
| 📊 **Bilan** | Actif / Passif avec comparaison N-1 |
| 📈 **Compte de Résultat** | Charges / Produits détaillés |
| 📉 **SIG** | Soldes Intermédiaires de Gestion (Marge, VA, EBE, Résultat) |
| 💰 **Cash Flow** | Tableau des flux de trésorerie (nécessite N et N-1) |

### Fonctionnalités additionnelles
- 🔍 Recherche d'entreprise par SIREN (API entreprise.data.gouv.fr)
- 📥 Export de la balance comptable au format Excel
- 📁 Fichier FEC d'exemple téléchargeable
- 🎨 Interface moderne et responsive

---

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm 9+

### Installation

```bash
# Cloner le projet
git clone <url-du-repo>
cd fecv2

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Compiler pour la production
npm run build
```

---

## 📁 Structure du projet

```
fecv2/
├── src/
│   ├── components/          # Composants React
│   │   ├── index.js         # Barrel export
│   │   ├── AppHeader.jsx
│   │   ├── AnalysisTabs.jsx
│   │   ├── BilanView.jsx
│   │   ├── CashFlowView.jsx
│   │   ├── CompteResultatView.jsx
│   │   ├── CyclesView.jsx
│   │   ├── SIGView.jsx
│   │   └── ...
│   │
│   ├── config/              # Configuration centralisée
│   │   ├── index.js
│   │   ├── ui.config.js     # Labels, couleurs, messages
│   │   ├── app.config.js    # Paramètres techniques
│   │   └── navigation.config.js
│   │
│   ├── core/                # Logique métier
│   │   ├── index.js         # Barrel export
│   │   ├── FECParser.js     # Parser de fichiers FEC
│   │   ├── BilanGenerator.js
│   │   ├── ResultatGenerator.js
│   │   ├── SIGGenerator.js
│   │   └── CashFlowGenerator.js
│   │
│   ├── hooks/               # Hooks personnalisés
│   │   ├── index.js         # Barrel export
│   │   ├── useFECDataGenerators.js
│   │   ├── useAccountDetails.js
│   │   ├── useEntrepriseSearch.js
│   │   └── useToast.js
│   │
│   ├── utils/               # Utilitaires
│   │   ├── index.js         # Barrel export
│   │   ├── formatters.js
│   │   ├── fecCycleAnalyzer.js
│   │   ├── balanceExporter.js
│   │   └── ...
│   │
│   ├── App.jsx              # Composant principal
│   └── main.jsx             # Point d'entrée
│
├── public/
├── package.json
└── vite.config.js
```

---

## 🔧 Configuration

### Modifier les labels et couleurs

Éditez `src/config/ui.config.js` :

```javascript
export const APP_LABELS = {
  TITLE: 'Mon titre personnalisé',
  SUBTITLE: 'Ma description'
};

export const CHART_COLORS = {
  PRIMARY: '#3B82F6',
  // ...
};
```

### Modifier les paramètres techniques

Éditez `src/config/app.config.js` :

```javascript
export const FILE_CONFIG = {
  MAX_SIZE_MB: 100,  // Augmenter la taille max
  // ...
};
```

### Modifier la navigation

Éditez `src/config/navigation.config.js` pour ajouter/retirer des onglets.

---

## 📖 Utilisation

### 1. Charger un fichier FEC

1. Cliquez sur la zone "Exercice N"
2. Sélectionnez votre fichier FEC (.txt)
3. Le fichier est automatiquement analysé

### 2. Comparer avec N-1 (optionnel)

1. Cliquez sur la zone "Exercice N-1"
2. Sélectionnez le fichier FEC de l'exercice précédent
3. Les vues affichent maintenant la comparaison

### 3. Naviguer entre les vues

Utilisez les onglets pour basculer entre :
- Cycles d'audit
- Bilan
- Compte de Résultat
- SIG
- Cash Flow (nécessite N et N-1)

### 4. Exporter la balance

Cliquez sur "Exporter Balance" pour télécharger un fichier Excel.

---

## 🛠️ Développement

### Scripts disponibles

```bash
npm run dev      # Serveur de développement
npm run build    # Compilation production
npm run preview  # Prévisualisation du build
npm run lint     # Vérification du code
```

### Ajouter un composant

1. Créer le fichier dans `src/components/`
2. L'ajouter dans `src/components/index.js`
3. L'importer via `import { MonComposant } from './components'`

### Ajouter un hook

1. Créer le fichier dans `src/hooks/`
2. L'ajouter dans `src/hooks/index.js`
3. L'importer via `import { useMonHook } from './hooks'`

---

## 📊 Technologies utilisées

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 19.1 | Framework UI |
| Vite | 6.3 | Build tool |
| Tailwind CSS | 4.1 | Styling |
| Recharts | 3.3 | Graphiques |
| Lucide React | 0.552 | Icônes |
| XLSX | 0.18 | Export Excel |
| D3 | 7.9 | Visualisations |

---

## 📝 Changelog

### V2.1.0 (Décembre 2024)
- ✅ Suppression du module IA (code mort)
- ✅ Nettoyage des dépendances npm
- ✅ Centralisation de la configuration
- ✅ Optimisation des performances (useCallback, useMemo)
- ✅ Barrel exports pour imports simplifiés
- ✅ Documentation complète

### V2.0.0
- Version initiale avec toutes les vues

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

---

## 📄 Licence

MIT © 2024

---

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur le dépôt.
