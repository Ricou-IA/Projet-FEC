/**
 * Color Utilities
 * 
 * Fonctions utilitaires pour manipuler les couleurs
 * 
 * @module utils/colors
 */

/**
 * Convertit une couleur hex en RGB
 * 
 * @param {string} hex - Couleur au format hexadécimal (#RRGGBB)
 * @returns {Object} Objet {r, g, b} avec valeurs 0-255
 */
export const hexToRgb = (hex) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return { r, g, b };
};

/**
 * Convertit RGB en HSL
 * 
 * @param {number} r - Rouge (0-255)
 * @param {number} g - Vert (0-255)
 * @param {number} b - Bleu (0-255)
 * @returns {Object} Objet {h, s, l} avec valeurs 0-1
 */
export const rgbToHsl = (r, g, b) => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
      default:
        h = 0;
    }
  }
  
  return { h, s, l };
};

/**
 * Convertit HSL en RGB
 * 
 * @param {number} h - Teinte (0-1)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Luminosité (0-1)
 * @returns {Object} Objet {r, g, b} avec valeurs 0-255
 */
export const hslToRgb = (h, s, l) => {
  const hue2rgb = (p, q, t) => {
    let tVal = t;
    if (tVal < 0) tVal += 1;
    if (tVal > 1) tVal -= 1;
    if (tVal < 1/6) return p + (q - p) * 6 * tVal;
    if (tVal < 1/2) return q;
    if (tVal < 2/3) return p + (q - p) * (2/3 - tVal) * 6;
    return p;
  };
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // Achromatique
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

/**
 * Convertit RGB en hex
 * 
 * @param {number} r - Rouge (0-255)
 * @param {number} g - Vert (0-255)
 * @param {number} b - Bleu (0-255)
 * @returns {string} Couleur au format #RRGGBB
 */
export const rgbToHex = (r, g, b) => {
  const toHex = (x) => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Rend une couleur plus vive en augmentant la saturation
 * 
 * @param {string} hexColor - Couleur au format hexadécimal
 * @param {number} amount - Quantité d'augmentation (0-1, par défaut 0.25)
 * @returns {string} Nouvelle couleur au format hexadécimal
 */
export const brightenColor = (hexColor, amount = 0.25) => {
  // Convertir hex en RGB
  const { r, g, b } = hexToRgb(hexColor);
  
  // Convertir RGB en HSL
  let { h, s, l } = rgbToHsl(r, g, b);
  
  // Augmenter la saturation et légèrement la luminosité
  s = Math.min(1, s + amount);
  l = Math.min(0.85, l + amount * 0.05);
  
  // Convertir HSL en RGB
  const { r: rNew, g: gNew, b: bNew } = hslToRgb(h, s, l);
  
  // Convertir en hex
  return rgbToHex(rNew, gNew, bNew);
};

/**
 * Assombrit une couleur en diminuant la luminosité
 * 
 * @param {string} hexColor - Couleur au format hexadécimal
 * @param {number} amount - Quantité de diminution (0-1, par défaut 0.25)
 * @returns {string} Nouvelle couleur au format hexadécimal
 */
export const darkenColor = (hexColor, amount = 0.25) => {
  const { r, g, b } = hexToRgb(hexColor);
  let { h, s, l } = rgbToHsl(r, g, b);
  
  l = Math.max(0, l - amount);
  
  const { r: rNew, g: gNew, b: bNew } = hslToRgb(h, s, l);
  return rgbToHex(rNew, gNew, bNew);
};

/**
 * Ajuste la transparence d'une couleur
 * 
 * @param {string} hexColor - Couleur au format hexadécimal
 * @param {number} alpha - Transparence (0-1)
 * @returns {string} Couleur au format rgba()
 */
export const hexToRgba = (hexColor, alpha = 1) => {
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Retourne une couleur de contraste (noir ou blanc) pour un arrière-plan donné
 * 
 * @param {string} hexColor - Couleur d'arrière-plan
 * @returns {string} '#000000' ou '#FFFFFF'
 */
export const getContrastColor = (hexColor) => {
  const { r, g, b } = hexToRgb(hexColor);
  
  // Calcul de la luminance selon la formule YIQ
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

/**
 * Génère une palette de couleurs à partir d'une couleur de base
 * 
 * @param {string} baseColor - Couleur de base
 * @param {number} count - Nombre de couleurs à générer
 * @returns {string[]} Tableau de couleurs hexadécimales
 */
export const generatePalette = (baseColor, count = 5) => {
  const { r, g, b } = hexToRgb(baseColor);
  const { h, s, l } = rgbToHsl(r, g, b);
  
  const palette = [];
  const step = 0.6 / (count - 1); // Variation de luminosité
  
  for (let i = 0; i < count; i++) {
    const newL = Math.max(0.2, Math.min(0.8, l - 0.3 + (step * i)));
    const { r: rNew, g: gNew, b: bNew } = hslToRgb(h, s, newL);
    palette.push(rgbToHex(rNew, gNew, bNew));
  }
  
  return palette;
};
