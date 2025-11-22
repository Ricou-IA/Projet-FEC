# FEC Analyzer - Version Corrigée PCG 2025

## 🎯 Vue d'ensemble

Application d'analyse de fichiers FEC (Fichier des Écritures Comptables) conforme au Plan Comptable Général (PCG) 2025.

**Version:** 2.0 - Corrigée et optimisée  
**Date:** 22 Novembre 2025  
**Statut:** ✅ Conforme PCG 2025

---

## ✨ Nouveautés de cette version

### ✅ Corrections majeures
1. **Affichage des soldes du passif en valeur absolue** - Conforme à l'article 112-2 du PCG
2. **Gestion des comptes correcteurs de classe 1** - Affectation correcte à l'actif (109, 119, 129, 139, 169)
3. **Amélioration de la validation du bilan** - Détection des comptes non affectés

### 🆕 Nouveaux fichiers
- `src/constants/accounting-constants.js` - Constantes comptables centralisées
- `docs/README-AUDIT.md` - Documentation de l'audit complet
- `docs/AUDIT-COMPLET.md` - Rapport détaillé de l'audit
- `docs/OPTIMISATIONS-REACT.md` - Guide d'optimisation des performances

---

## 🚀 Démarrage rapide

### Installation
```bash
npm install
```

### Lancement en développement
```bash
npm run dev
```

### Build de production
```bash
npm run build
```

---

## 📊 Fonctionnalités principales

- ✅ **Bilan comptable** conforme PCG 2025
- ✅ **Compte de résultat** avec classification E/F/Ex
- ✅ **Analyse par cycles** (Achats, Ventes, Personnel, etc.)
- ✅ **SIG** (Soldes Intermédiaires de Gestion)
- ✅ **Comparaison N vs N-1**

---

## 📖 Documentation

Toute la documentation est disponible dans le dossier `docs/` :

- **[README-AUDIT.md](docs/README-AUDIT.md)** - Vue d'ensemble de l'audit
- **[AUDIT-COMPLET.md](docs/AUDIT-COMPLET.md)** - Rapport détaillé
- **[OPTIMISATIONS-REACT.md](docs/OPTIMISATIONS-REACT.md)** - Guide d'optimisation

---

## ✅ Conformité PCG 2025

**Articles appliqués:**
- Art. 112-2 - Non-compensation actif/passif
- Art. 821-1 - Modèle de bilan
- Art. 1141-1 - Classification des comptes

**Comptes correcteurs gérés:**
- 109, 119, 129, 139, 169 → Affectés à l'actif

---

**🎉 Projet conforme PCG 2025 - Prêt pour la production**
