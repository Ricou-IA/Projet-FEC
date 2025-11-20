/**
 * Formatters - Utilitaires de formatage
 */

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatCurrencyNoDecimals = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('fr-FR').format(num);
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
