/**
 * Formatters - Utilitaires de formatage
 * Toutes les valeurs monétaires utilisent des séparateurs de milliers (espaces en français)
 */

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true // Séparateurs de milliers (espaces)
  }).format(amount);
};

export const formatCurrencyNoDecimals = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true // Séparateurs de milliers (espaces)
  }).format(amount);
};

export const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('fr-FR', {
    useGrouping: true // Séparateurs de milliers (espaces)
  }).format(num);
};

export const formatPercent = (value) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('fr-FR');
};
