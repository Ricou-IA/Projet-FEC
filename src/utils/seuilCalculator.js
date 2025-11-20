import calculSeuilData from '../data/Calcul-seuil.json';

/**
 * Calcule le Seuil de Signification Global (SSG) et le Seuil de Remontée des Anomalies
 * selon les règles définies dans Calcul-seuil.json
 * 
 * @param {number} chiffreAffaires - Chiffre d'affaires HT
 * @param {number} totalBilan - Total du bilan (actif ou passif)
 * @returns {Object} { ssg, seuilRemontee, baseReference, bande, details }
 */
export function calculerSeuilsAudit(chiffreAffaires = 0, totalBilan = 0) {
  const framework = calculSeuilData.materiality_calculation_framework;
  const bands = framework.materiality_bands;
  const thresholdConfig = framework.anomaly_reporting_threshold;

  // Étape A : Base de référence = Max(CA HT, Total Bilan)
  const baseReference = Math.max(chiffreAffaires, totalBilan);

  // Trouver la tranche correspondante
  let bande = null;
  for (const band of bands) {
    const min = band.min_base;
    const max = band.max_base === null ? Infinity : band.max_base;
    
    if (baseReference >= min && baseReference <= max) {
      bande = band;
      break;
    }
  }

  if (!bande) {
    // Si aucune tranche trouvée (cas théorique), utiliser la dernière
    bande = bands[bands.length - 1];
  }

  // Étape B : Pourcentage de la tranche
  const pourcentage = bande.percentage_b;

  // Étape C : Calcul C = Base * Pourcentage
  const calculC = baseReference * pourcentage;

  // Étape D : Montant fixe de la tranche
  const montantFixe = bande.fixed_amount_a;

  // Étape E : SSG non arrondi = C + D
  const ssgNonArrondi = calculC + montantFixe;

  // Étape F : SSG arrondi
  const ssg = Math.round(ssgNonArrondi);

  // Seuil de remontée = 3% du SSG
  const seuilRemontee = Math.round(ssg * thresholdConfig.percentage_of_ssg);

  return {
    ssg,
    seuilRemontee,
    baseReference,
    bande,
    details: {
      chiffreAffaires,
      totalBilan,
      pourcentage,
      calculC,
      montantFixe,
      ssgNonArrondi
    }
  };
}

/**
 * Formate un montant pour l'affichage
 */
export function formatSeuil(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant);
}
