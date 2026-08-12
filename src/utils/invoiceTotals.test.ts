import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateInvoiceTotals, sanitizeOptionalInvoiceAmount } from './invoiceTotals.ts';

test('adds all optional commercial costs independently of the Incoterm', () => {
  const totals = calculateInvoiceTotals({
    subtotal: 1_000,
    freightCost: 100,
    insuranceCost: 25,
    importDutiesAndTaxes: 75,
  });

  assert.equal(totals.totalAmount, 1_200);
});

test('keeps the discount limited to the merchandise subtotal', () => {
  const totals = calculateInvoiceTotals({
    subtotal: 100,
    freightCost: 20,
    insuranceCost: 10,
    importDutiesAndTaxes: 5,
    applyDiscount: true,
    discountAmount: 150,
  });

  assert.equal(totals.discountValue, 100);
  assert.equal(totals.totalAmount, 35);
});

test('treats blank optional costs as absent and accepts decimal commas', () => {
  assert.equal(sanitizeOptionalInvoiceAmount(''), undefined);
  assert.equal(sanitizeOptionalInvoiceAmount('12,50'), 12.5);
  assert.equal(sanitizeOptionalInvoiceAmount(-1), undefined);
});
