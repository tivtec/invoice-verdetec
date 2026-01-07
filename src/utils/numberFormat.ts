const usdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const normalizeAmount = (value: unknown) => {
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const formatInvoiceAmount = (value: unknown, currency?: string) => {
  const amount = normalizeAmount(value);
  const normalizedCurrency = (currency || '').toUpperCase();
  if (normalizedCurrency.includes('US')) {
    return usdFormatter.format(amount);
  }
  return amount.toFixed(2);
};
