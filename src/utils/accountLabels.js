import libellesData from '../data/regles-affectation-comptes.json';

/**
 * Récupère le libellé d'un compte pour affichage
 * @param {string} compteNum - Numéro de compte (ex: "60", "641", "70")
 * @returns {string} Libellé du compte
 */
export function getAccountLabel(compteNum) {
  if (!compteNum) return `Compte ${compteNum || 'inconnu'}`;
  
  const compteStr = String(compteNum).trim();
  if (compteStr.length === 0) return `Compte ${compteNum}`;
  
  const classe = compteStr[0];
  const racine3 = compteStr.length >= 3 ? compteStr.substring(0, 3) : null;
  const racine2 = compteStr.substring(0, 2);
  
  // Chercher dans classe 6
  if (classe === '6') {
    // Chercher d'abord le compte exact (3 chiffres pour les enfants comme 641)
    if (racine3 && libellesData.libellesComptes?.classe6?.[racine3]) {
      return libellesData.libellesComptes.classe6[racine3].libelle;
    }
    // Sinon chercher le compte parent (2 chiffres comme 64)
    if (libellesData.libellesComptes?.classe6?.[racine2]) {
      return libellesData.libellesComptes.classe6[racine2].libelle;
    }
  }
  
  // Chercher dans classe 7
  if (classe === '7') {
    // Chercher d'abord le compte exact (3 chiffres pour les enfants comme 701)
    if (racine3 && libellesData.libellesComptes?.classe7?.[racine3]) {
      return libellesData.libellesComptes.classe7[racine3].libelle;
    }
    // Sinon chercher le compte parent (2 chiffres comme 70)
    if (libellesData.libellesComptes?.classe7?.[racine2]) {
      return libellesData.libellesComptes.classe7[racine2].libelle;
    }
  }
  
  // Fallback : retourner "Compte XX"
  return `Compte ${compteStr}`;
}

/**
 * Récupère la structure de présentation du compte de résultat
 * @returns {Object} Structure avec sections, lignes et libellés
 */
export function getCompteResultatStructure() {
  return libellesData.libellesComptes?.presentationCompteResultat || null;
}

/**
 * Vérifie si un compte est un compte enfant (détail d'un compte parent)
 * @param {string} compteNum - Numéro de compte (ex: "641", "645")
 * @returns {boolean} true si c'est un compte enfant
 */
export function isChildAccount(compteNum) {
  if (!compteNum) return false;
  
  const compteStr = String(compteNum).trim();
  if (compteStr.length < 2) return false;
  
  const classe = compteStr[0];
  const racine3 = compteStr.length >= 3 ? compteStr.substring(0, 3) : null;
  const racine2 = compteStr.substring(0, 2);
  
  // Chercher dans classe 6
  if (classe === '6') {
    // Chercher d'abord le compte exact à 3 chiffres (pour les enfants comme 641, 681)
    if (racine3 && libellesData.libellesComptes?.classe6?.[racine3]) {
      const config3 = libellesData.libellesComptes.classe6[racine3];
      if (config3.displayAsChild === true) {
        return true;
      }
      // Si le compte existe mais n'est pas enfant, ce n'est pas un enfant
      if (config3.displayAsChild !== undefined) {
        return false;
      }
    }
    // Chercher le compte parent à 2 chiffres
    if (libellesData.libellesComptes?.classe6?.[racine2]) {
      const config2 = libellesData.libellesComptes.classe6[racine2];
      return config2.displayAsChild === true;
    }
    return false;
  }
  
  // Chercher dans classe 7
  if (classe === '7') {
    // Chercher d'abord le compte exact à 3 chiffres (pour les enfants comme 701, 791)
    if (racine3 && libellesData.libellesComptes?.classe7?.[racine3]) {
      const config3 = libellesData.libellesComptes.classe7[racine3];
      if (config3.displayAsChild === true) {
        return true;
      }
      // Si le compte existe mais n'est pas enfant, ce n'est pas un enfant
      if (config3.displayAsChild !== undefined) {
        return false;
      }
    }
    // Chercher le compte parent à 2 chiffres
    if (libellesData.libellesComptes?.classe7?.[racine2]) {
      const config2 = libellesData.libellesComptes.classe7[racine2];
      return config2.displayAsChild === true;
    }
    return false;
  }
  
  return false;
}

/**
 * Obtient le compte parent d'un compte enfant
 * @param {string} compteNum - Numéro de compte (ex: "641", "645")
 * @returns {string|null} Numéro du compte parent ou null
 */
export function getParentAccount(compteNum) {
  if (!compteNum) return null;
  
  const compteStr = String(compteNum).trim();
  const classe = compteStr[0];
  const racine3 = compteStr.substring(0, 3);
  const racine2 = compteStr.substring(0, 2);
  
  // Chercher dans classe 6
  if (classe === '6') {
    const config3 = libellesData.libellesComptes?.classe6?.[racine3];
    const config2 = libellesData.libellesComptes?.classe6?.[racine2];
    const config = config3 || config2;
    return config?.parent || null;
  }
  
  // Chercher dans classe 7
  if (classe === '7') {
    const config3 = libellesData.libellesComptes?.classe7?.[racine3];
    const config2 = libellesData.libellesComptes?.classe7?.[racine2];
    const config = config3 || config2;
    return config?.parent || null;
  }
  
  return null;
}

/**
 * Calcule le total d'une section en excluant les comptes enfants (évite le double comptage)
 * @param {Array} comptes - Liste des comptes { numero: string, montant: number }
 * @param {Array} sectionComptes - Liste des codes de comptes de la section (ex: ["60", "61", "62", "681"])
 * @returns {number} Total de la section
 */
export function calculateSectionTotal(comptes, sectionComptes) {
  return comptes
    .filter(compte => {
      const compteNum = compte.numero;
      
      // Vérifier si le compte appartient à la section (soit par sa racine 2 chiffres, soit directement)
      const racine2 = compteNum.substring(0, 2);
      const isInSectionByRacine = sectionComptes.includes(racine2);
      const isInSectionDirect = sectionComptes.includes(compteNum);
      const isInSection = isInSectionByRacine || isInSectionDirect;
      
      // EXCLURE les comptes enfants (évite le double comptage)
      // Même si le compte enfant est listé directement dans sectionComptes (ex: "681"),
      // il doit être exclu du total car il est déjà compté dans son parent (ex: "68")
      const isChild = isChildAccount(compteNum);
      
      // Ne garder que les comptes de la section qui ne sont PAS des enfants
      // Exemple : si on a "681" dans sectionComptes mais "681" est un enfant de "68",
      // on exclut "681" du total car il est déjà dans "68"
      return isInSection && !isChild;
    })
    .reduce((sum, compte) => sum + (compte.montant || 0), 0);
}

