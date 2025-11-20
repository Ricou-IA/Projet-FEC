# 📋 Guide de Migration - AppOriginal.jsx

## 🎯 Situation Actuelle

**AppOriginal.jsx** (4,113 lignes) contient encore TOUT le code original.  
**App.jsx** (~420 lignes) contient la nouvelle structure refactorisée mais n'utilise PAS encore tous les composants extraits.

## ✅ Ce qui a été fait

### Composants créés et fonctionnels
- ✅ `AppHeader.jsx` - En-tête
- ✅ `FileUploadZone.jsx` - Upload fichiers
- ✅ `BalanceStats.jsx` - Statistiques balance
- ✅ `EntrepriseSearch.jsx` - Recherche SIREN
- ✅ `AnalysisTabs.jsx` - Onglets navigation
- ✅ `SIGView.jsx` - Affichage SIG
- ✅ `ProgrammeView.jsx` - Programme de travail

### Hooks créés et fonctionnels
- ✅ `useEntrepriseSearch.js` - Recherche entreprise
- ✅ `useFECDataGenerators.js` - Génération données comptables
- ✅ `useAccountDetails.js` - Détails des comptes

### Helpers créés
- ✅ `helpers/resultatHelpers.js` - Helpers Compte de Résultat

## ⏳ Ce qui reste à faire

### Composants à extraire depuis AppOriginal.jsx

#### 1. CyclesView.jsx
**Lignes dans AppOriginal.jsx :** 1762-2577 (~815 lignes)

Ce composant est le plus gros. Il contient :
- Graphique de répartition par cycle
- Détail par compte du cycle sélectionné
- Graphique mensuel de saisonnalité
- Export Excel

**Action :** Extraire vers `src/components/CyclesView.jsx`

#### 2. CompteResultatView.jsx
**Lignes dans AppOriginal.jsx :** 2579-3485 (~906 lignes)

Contient :
- Affichage en 3 colonnes (Charges/Produits/Résultats)
- Catégories : Exploitation, Financier, Exceptionnel
- Comparaison N vs N-1
- Détail par compte

**Action :** Extraire vers `src/components/CompteResultatView.jsx`

#### 3. BilanView.jsx
**Lignes dans AppOriginal.jsx :** 3487-3897 (~410 lignes)

Contient :
- Affichage Actif/Passif
- Comparaison N vs N-1
- Détail par compte

**Action :** Extraire vers `src/components/BilanView.jsx`

## 🔄 Options pour continuer

### Option 1 : Finaliser complètement (RECOMMANDÉ)
1. Extraire CyclesView depuis AppOriginal.jsx (lignes 1762-2577)
2. Extraire CompteResultatView depuis AppOriginal.jsx (lignes 2579-3485)
3. Extraire BilanView depuis AppOriginal.jsx (lignes 3487-3897)
4. Mettre à jour App.jsx pour utiliser tous les composants
5. Tester que tout fonctionne
6. **Supprimer AppOriginal.jsx** (ou le renommer en `AppOriginal.jsx.backup`)

### Option 2 : Migration progressive
1. Garder AppOriginal.jsx fonctionnel
2. Extraire un composant à la fois
3. Tester chaque composant individuellement
4. Une fois tous extraits, supprimer AppOriginal.jsx

## 📝 Comment AppOriginal.jsx est utilisé maintenant

**Actuellement :** AppOriginal.jsx n'est PAS utilisé dans le nouveau code. C'est un **fichier de référence/backup**.

**App.jsx** utilise déjà :
- Les nouveaux composants UI (Header, FileUploadZone, etc.)
- Les hooks personnalisés
- SIGView et ProgrammeView

**Mais App.jsx** a encore des placeholders pour :
- CyclesView
- CompteResultatView  
- BilanView

## ✅ Prochaine étape immédiate

**Pour finaliser la refactorisation :**

1. Extraire CyclesView depuis AppOriginal.jsx vers `src/components/CyclesView.jsx`
2. Extraire CompteResultatView vers `src/components/CompteResultatView.jsx`
3. Extraire BilanView vers `src/components/BilanView.jsx`
4. Importer et utiliser ces 3 composants dans App.jsx
5. Tester
6. Supprimer AppOriginal.jsx (ou le renommer en backup)

**Une fois fait, AppOriginal.jsx ne servira plus à rien et pourra être supprimé.**

## 🚨 Important

**App.jsx actuel fonctionne PARTIELLEMENT :**
- ✅ Upload fichiers
- ✅ Statistiques balance
- ✅ Recherche entreprise
- ✅ SIG
- ✅ Programme de travail
- ❌ Cycles (placeholder)
- ❌ Compte de Résultat (placeholder)
- ❌ Bilan (placeholder)

**Pour que tout fonctionne, il faut extraire les 3 composants manquants.**


