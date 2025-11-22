class FECParser {
  constructor() {
    this.lignes = [];
    this.comptes = new Map();
    this.comptesAuxiliaires = new Map();
  }

  parse(fecText) {
    const lignes = fecText.split('\n').filter(ligne => ligne.trim());
    
    if (lignes.length === 0) {
      throw new Error('Fichier FEC vide');
    }

    const entete = lignes[0].split('\t');
    
    for (let i = 1; i < lignes.length; i++) {
      const valeurs = lignes[i].split('\t');
      
      if (valeurs.length < entete.length) continue;

      const ligne = {};
      entete.forEach((col, index) => {
        ligne[col] = valeurs[index];
      });

      this.lignes.push(ligne);
      this._traiterLigne(ligne);
    }

    return this._genererBalances();
  }

  _traiterLigne(ligne) {
    const compteNum = ligne.CompteNum;
    const compteAux = ligne.CompAuxNum?.trim();
    const debit = this._parseAmount(ligne.Debit);
    const credit = this._parseAmount(ligne.Credit);

    // Traiter le compte principal
    if (!this.comptes.has(compteNum)) {
      this.comptes.set(compteNum, {
        numero: compteNum,
        libelle: ligne.CompteLib,
        debit: 0,
        credit: 0,
        solde: 0,
        auxiliaires: new Map()
      });
    }

    const compte = this.comptes.get(compteNum);
    compte.debit += debit;
    compte.credit += credit;
    compte.solde = compte.debit - compte.credit;

    // Pour les comptes de classe 4, gérer les auxiliaires
    if (compteNum.startsWith('4') && compteAux) {
      const cleAuxiliaire = `${compteNum}_${compteAux}`;
      
      if (!compte.auxiliaires.has(compteAux)) {
        compte.auxiliaires.set(compteAux, {
          numero: compteNum,
          auxiliaire: compteAux,
          libelle: ligne.CompAuxLib || compteAux,
          debit: 0,
          credit: 0,
          solde: 0
        });
      }

      const aux = compte.auxiliaires.get(compteAux);
      aux.debit += debit;
      aux.credit += credit;
      aux.solde = aux.debit - aux.credit;

      // Stocker aussi dans la map globale
      this.comptesAuxiliaires.set(cleAuxiliaire, aux);
    }
  }

  _parseAmount(value) {
    if (!value || value.trim() === '') return 0;
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  _genererBalances() {
    const comptes = Array.from(this.comptes.values());

    return {
      comptes: comptes,
      comptesAuxiliaires: this.comptesAuxiliaires,
      statistiques: {
        nombreLignes: this.lignes.length,
        nombreComptes: this.comptes.size,
        nombreAuxiliaires: this.comptesAuxiliaires.size
      }
    };
  }

  getComptesByClasse(classe) {
    return Array.from(this.comptes.values())
      .filter(c => c.numero.startsWith(classe))
      .sort((a, b) => a.numero.localeCompare(b.numero));
  }

  getAuxiliairesForCompte(compteNum) {
    const compte = this.comptes.get(compteNum);
    if (!compte || !compte.auxiliaires) return [];
    
    return Array.from(compte.auxiliaires.values());
  }

  // Nouvelle méthode pour séparer débiteurs et créditeurs (classe 4)
  getAuxiliairesDecomposes(compteNum) {
    const auxiliaires = this.getAuxiliairesForCompte(compteNum);
    
    const debiteurs = [];
    const crediteurs = [];
    
    auxiliaires.forEach(aux => {
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
}

export default FECParser;