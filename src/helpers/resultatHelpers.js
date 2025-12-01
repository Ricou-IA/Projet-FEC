/**
 * Helpers pour le rendu du Compte de Résultat
 */

/**
 * Classification des classes par catégorie selon le PCG
 */
export const classification = {
  exploitation: {
    charges: ['60', '61', '62', '63', '64', '65', '68', '69'],
    produits: ['70', '71', '75']
  },
  financier: {
    charges: ['66'],
    produits: ['76']
  },
  exceptionnel: {
    charges: ['67'],
    produits: ['77', '79']
  }
};

/**
 * Groupe les items (charges ou produits) par catégorie
 */
export const regrouperParCategorie = (items, type) => {
  if (!items || !Array.isArray(items)) {
    return {
      exploitation: [],
      financier: [],
      exceptionnel: []
    };
  }

  const result = {
    exploitation: [],
    financier: [],
    exceptionnel: []
  };

  items.forEach(item => {
    const classe = item.classe;
    const classeStr = String(classe || '');
    
    const matchExploitation = classification.exploitation[type] && 
      classification.exploitation[type].some(c => classeStr.startsWith(c));
    const matchFinancier = classification.financier[type] && 
      classification.financier[type].some(c => classeStr.startsWith(c));
    const matchExceptionnel = classification.exceptionnel[type] && 
      classification.exceptionnel[type].some(c => classeStr.startsWith(c));
    
    if (matchExploitation) {
      result.exploitation.push(item);
    } else if (matchFinancier) {
      result.financier.push(item);
    } else if (matchExceptionnel) {
      result.exceptionnel.push(item);
    }
  });

  return result;
};

/**
 * Calcule le total d'un tableau d'items
 */
export const calculerTotal = (items) => {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.solde || 0), 0);
};

/**
 * Calcule la variation et le pourcentage
 */
export const calculerVariation = (valeurN, valeurN1) => {
  const variation = valeurN1 !== null ? valeurN - valeurN1 : null;
  const variationPercent = variation !== null && valeurN1 !== 0 
    ? ((valeurN - valeurN1) / Math.abs(valeurN1)) * 100 
    : null;
  return { variation, variationPercent };
};


