/**
 * FECParser.js - Version Optimisée Mémoire & Agrégation
 * Lit le fichier en streaming et agrège les soldes par compte à la volée.
 * Gère l'unicité des auxiliaires pour éviter la compensation abusive.
 */

export class FECParser {
  /**
   * Parse le fichier FEC et retourne les comptes agrégés (Balance)
   * @param {File} file - Le fichier FEC brut
   * @param {Function} onProgress - Callback pour la barre de progression
   * @returns {Promise<{data: Array, ...}>} Données agrégées compatibles avec BilanGenerator
   */
  static async parse(file, onProgress) {
    return new Promise((resolve, reject) => {
      // Utilisation d'un Worker pour ne pas geler l'interface
      const workerCode = `
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

        self.onmessage = function(e) {
          const file = e.data;
          const comptes = new Map(); // Stockage des comptes agrégés
          
          let rowCount = 0;
          let totalDebit = 0;
          let totalCredit = 0;
          let minDate = null;
          let maxDate = null;
          let headers = null;

          // Configuration flexible pour détecter le format
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'ISO-8859-1', // Encodage par défaut (à ajuster si besoin)
            step: function(results) {
              rowCount++;
              const row = results.data;
              
              // 1. Détection des en-têtes
              if (!headers) headers = results.meta.fields;

              // 2. Normalisation des noms de colonnes (casse, accents)
              const getCol = (name) => {
                return row[Object.keys(row).find(k => k.toLowerCase().startsWith(name.toLowerCase()))];
              };

              const compteNum = getCol('CompteNum');
              // Si pas de numéro de compte, on ignore la ligne
              if (!compteNum) return;

              // RECUPERATION DE L'AUXILIAIRE POUR CLÉ UNIQUE
              const compteAuxNum = getCol('CompteAuxNum') || getCol('AuxNum') || '';
              const compteAuxLib = getCol('CompteAuxLib') || getCol('AuxLib') || '';
              
              // CRÉATION D'UNE CLÉ UNIQUE COMPOSITE [COMPTE + AUX]
              // Crucial pour la non-compensation des tiers (Art 112-2 PCG)
              const uniqueKey = compteAuxNum ? \`\${compteNum}_\${compteAuxNum}\` : compteNum;

              const compteLibelle = getCol('CompteLib') || '';
              
              // Nettoyage des montants (virgule ou point)
              const parseAmount = (val) => {
                if (!val) return 0;
                return parseFloat(val.toString().replace(/\\s/g, '').replace(',', '.')) || 0;
              };

              const debit = parseAmount(getCol('Debit'));
              const credit = parseAmount(getCol('Credit'));

              // 3. Agrégation
              if (!comptes.has(uniqueKey)) {
                comptes.set(uniqueKey, {
                  uniqueId: uniqueKey,
                  compteNum: compteNum,
                  compteLibelle: compteLibelle,
                  compteAuxNum: compteAuxNum,
                  compteAuxLib: compteAuxLib,
                  debit: 0,
                  credit: 0,
                  count: 0
                });
              }

              const compte = comptes.get(uniqueKey);
              compte.debit += debit;
              compte.credit += credit;
              compte.count += 1;

              // Totaux globaux
              totalDebit += debit;
              totalCredit += credit;

              // Gestion des dates pour les métadonnées
              const dateStr = getCol('EcritureDate') || getCol('DateEcriture');
              if (dateStr && dateStr.length === 8) {
                if (!minDate || dateStr < minDate) minDate = dateStr;
                if (!maxDate || dateStr > maxDate) maxDate = dateStr;
              }

              // Feedback progression tous les 5000 lignes
              if (rowCount % 5000 === 0) {
                self.postMessage({ type: 'progress', count: rowCount });
              }
            },
            complete: function() {
              // Conversion de la Map en tableau pour le retour
              const dataAgregee = Array.from(comptes.values());
              
              // Calcul final des soldes
              dataAgregee.forEach(c => c.solde = c.debit - c.credit);

              // Conversion des dates min/max
              const formatDate = (d) => d ? new Date(d.substring(0,4), d.substring(4,6)-1, d.substring(6,8)) : null;

              self.postMessage({
                type: 'complete',
                result: {
                  success: true,
                  rowsCount: rowCount,
                  totalDebit,
                  totalCredit,
                  balance: Math.abs(totalDebit - totalCredit),
                  minDate: formatDate(minDate),
                  maxDate: formatDate(maxDate),
                  // Tableau optimisé : 1 ligne par Compte/Auxiliaire
                  data: dataAgregee 
                }
              });
            },
            error: function(err) {
              self.postMessage({ type: 'error', error: err });
            }
          });
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      worker.onmessage = (event) => {
        const { type, result, count, error } = event.data;
        if (type === 'progress' && onProgress) {
          onProgress(count);
        } else if (type === 'complete') {
          resolve(result);
          worker.terminate();
        } else if (type === 'error') {
          reject(error);
          worker.terminate();
        }
      };

      worker.postMessage(file);
    });
  }
}

export default FECParser;