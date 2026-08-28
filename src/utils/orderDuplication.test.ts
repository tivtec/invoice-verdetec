import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDuplicatedInvoiceNumber,
  getDuplicatedAttachmentPath,
} from './orderDuplication.ts';

test('replaces the six-digit order suffix in duplicated invoice numbers', () => {
  assert.equal(buildDuplicatedInvoiceNumber('PI-260256', '260257'), 'PI-260257');
  assert.equal(buildDuplicatedInvoiceNumber('CI-260256', '260257'), 'CI-260257');
  assert.equal(buildDuplicatedInvoiceNumber('PL-260256', '260257'), 'PL-260257');
});

test('keeps nonstandard invoice numbers unique', () => {
  assert.equal(buildDuplicatedInvoiceNumber('SPECIAL-INVOICE', '260257'), 'SPECIAL-INVOICE-260257');
});

test('creates an isolated storage path while preserving the file extension', () => {
  assert.equal(
    getDuplicatedAttachmentPath('new-order-id', 'document.final.pdf', 'new-file-id'),
    'new-order-id/new-file-id.pdf',
  );
});
