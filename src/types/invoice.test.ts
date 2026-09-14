import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompanyData } from './invoice.ts';

test('uses the updated Rio Negrinho exporter details', () => {
  const company = getCompanyData('insumos', 'insumos_rio_negrinho');

  assert.equal(company.name, 'INSUMOS HIDROSSEMEADURA VERDETEC LTDA');
  assert.equal(company.cnpj, '41.183.017/0001-09');
  assert.equal(company.address, 'EST MFR 169, nº 2821, Águas Claras, Rio Negrinho – SC');
  assert.equal(company.zipCode, '89.299-899');
  assert.equal(company.phone, '(47) 3255-0655');
  assert.equal('tradeName' in company ? company.tradeName : undefined, 'VERDETEC');
  assert.equal('email' in company ? company.email : undefined, 'contato@verdetec.com');
});

test('keeps the Itajai branch contact details unchanged', () => {
  const company = getCompanyData('insumos', 'insumos_itajai');

  assert.equal(company.address, 'Rua Vergílio Cadore, 9259, Campeche, Itajaí, SC, Brasil');
  assert.equal(company.zipCode, '88318-995');
  assert.equal(company.phone, '+55 (47) 3308-8805');
  assert.equal('email' in company, false);
});
