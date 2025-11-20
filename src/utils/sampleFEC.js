export function createSampleFECFile() {
  const sampleContent = `JournalCode\tJournalLibelle\tEcritureNum\tEcritureDate\tCompteNum\tCompteLibelle\tCompteAuxNum\tCompteAuxLibelle\tPieceRef\tPieceDate\tEcritureLibelle\tDebit\tCredit\tEcritureLettrage\tDateLettrage\tValidDate\tMontantDevise\tIdevise
VT\tVentes\t2024-001\t20240115\t411000\tClients\tCLT001\tClient Alpha\tFA2024-001\t20240115\tFacture vente\t1200,00\t0,00\t\t\t20240115\t0,00\tEUR
VT\tVentes\t2024-001\t20240115\t707000\tVentes marchandises\t\t\tFA2024-001\t20240115\tFacture vente\t0,00\t1000,00\t\t\t20240115\t0,00\tEUR
VT\tVentes\t2024-001\t20240115\t445710\tTVA collectée\t\t\tFA2024-001\t20240115\tFacture vente\t0,00\t200,00\t\t\t20240115\t0,00\tEUR
BQ\tBanque\t2024-002\t20240120\t512000\tBanque\t\t\tVIR-001\t20240120\tReglement client\t1200,00\t0,00\tA\t20240120\t20240120\t0,00\tEUR
BQ\tBanque\t2024-002\t20240120\t411000\tClients\tCLT001\tClient Alpha\tVIR-001\t20240120\tReglement client\t0,00\t1200,00\tA\t20240120\t20240120\t0,00\tEUR
ACH\tAchats\t2024-003\t20240125\t401000\tFournisseurs\tFRS001\tFournisseur Beta\tFACH-001\t20240125\tFacture achat\t0,00\t600,00\t\t\t20240125\t0,00\tEUR
ACH\tAchats\t2024-003\t20240125\t607000\tAchats marchandises\t\t\tFACH-001\t20240125\tFacture achat\t500,00\t0,00\t\t\t20240125\t0,00\tEUR
ACH\tAchats\t2024-003\t20240125\t445660\tTVA déductible\t\t\tFACH-001\t20240125\tFacture achat\t100,00\t0,00\t\t\t20240125\t0,00\tEUR
AN\tÀ-nouveaux\t2024-004\t20240101\t101000\tCapital\t\t\tAN-001\t20240101\tÀ-nouveaux\t0,00\t10000,00\t\t\t20240101\t0,00\tEUR
PAI\tPaie\t2024-005\t20240131\t421000\tPersonnel\t\t\tSAL-001\t20240131\tSalaire janvier\t2500,00\t0,00\t\t\t20240131\t0,00\tEUR
PAI\tPaie\t2024-005\t20240131\t512000\tBanque\t\t\tSAL-001\t20240131\tSalaire janvier\t0,00\t2500,00\t\t\t20240131\t0,00\tEUR`;

  const blob = new Blob([sampleContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'exemple_fec.txt';
  a.click();
  window.URL.revokeObjectURL(url);
}


