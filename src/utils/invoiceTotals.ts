export interface InvoiceTotalsInput {
  subtotal: number;
  freightCost?: number | string | null;
  insuranceCost?: number | string | null;
  importDutiesAndTaxes?: number | string | null;
  applyDiscount?: boolean;
  discountAmount?: number | string | null;
}

export interface InvoiceTotals {
  subtotal: number;
  freightCost: number;
  insuranceCost: number;
  importDutiesAndTaxes: number;
  discountValue: number;
  totalAmountBeforeDiscount: number;
  totalAmount: number;
}

const parseAmount = (value: unknown): number | undefined => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = typeof value === 'string'
    ? Number(value.replace(',', '.'))
    : Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const sanitizeOptionalInvoiceAmount = (value: unknown): number | undefined => {
  const parsed = parseAmount(value);
  return parsed === undefined || parsed < 0 ? undefined : parsed;
};

const normalizeNonNegativeAmount = (value: unknown): number => {
  const parsed = parseAmount(value);
  return parsed === undefined ? 0 : Math.max(parsed, 0);
};

export const calculateInvoiceTotals = ({
  subtotal,
  freightCost,
  insuranceCost,
  importDutiesAndTaxes,
  applyDiscount,
  discountAmount,
}: InvoiceTotalsInput): InvoiceTotals => {
  const normalizedSubtotal = normalizeNonNegativeAmount(subtotal);
  const normalizedFreight = normalizeNonNegativeAmount(freightCost);
  const normalizedInsurance = normalizeNonNegativeAmount(insuranceCost);
  const normalizedImportDutiesAndTaxes = normalizeNonNegativeAmount(importDutiesAndTaxes);
  const normalizedDiscount = applyDiscount
    ? Math.min(normalizeNonNegativeAmount(discountAmount), normalizedSubtotal)
    : 0;
  const totalAmountBeforeDiscount =
    normalizedSubtotal +
    normalizedFreight +
    normalizedInsurance +
    normalizedImportDutiesAndTaxes;

  return {
    subtotal: normalizedSubtotal,
    freightCost: normalizedFreight,
    insuranceCost: normalizedInsurance,
    importDutiesAndTaxes: normalizedImportDutiesAndTaxes,
    discountValue: normalizedDiscount,
    totalAmountBeforeDiscount,
    totalAmount: Math.max(totalAmountBeforeDiscount - normalizedDiscount, 0),
  };
};
