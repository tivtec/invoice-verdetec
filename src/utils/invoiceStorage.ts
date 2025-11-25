import { Invoice } from '@/types/invoice';

const STORAGE_KEY = 'proforma_invoices';
const COUNTER_PREFIX = 'invoice_counter_';

export const getInvoices = (): Invoice[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveInvoice = (invoice: Invoice): void => {
  const invoices = getInvoices();
  const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
  
  if (existingIndex >= 0) {
    invoices[existingIndex] = invoice;
  } else {
    invoices.push(invoice);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
};

export const deleteInvoice = (id: string): void => {
  const invoices = getInvoices();
  const filtered = invoices.filter(inv => inv.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const getInvoiceById = (id: string): Invoice | undefined => {
  const invoices = getInvoices();
  return invoices.find(inv => inv.id === id);
};

export const generateInvoiceNumber = (): string => {
  const currentYear = new Date().getFullYear();
  const yearPrefix = currentYear.toString().slice(-2); // Últimos 2 dígitos do ano (25 para 2025)
  const counterKey = `${COUNTER_PREFIX}${currentYear}`;
  
  const counter = localStorage.getItem(counterKey);
  const currentCounter = counter ? parseInt(counter) : 0;
  const newCounter = currentCounter + 1;
  localStorage.setItem(counterKey, newCounter.toString());
  
  // Formata o número com 4 dígitos (0001, 0002, etc.)
  const sequentialNumber = newCounter.toString().padStart(4, '0');
  return `PI-${yearPrefix}${sequentialNumber}`;
};

// Extracts the base number from an invoice number (e.g., "PI-250001" -> "250001")
const getBaseNumber = (invoiceNumber: string): string => {
  const match = invoiceNumber.match(/\d{6}$/);
  return match ? match[0] : '';
};

// Generate Commercial Invoice number from Proforma Invoice
export const generateCommercialInvoiceNumber = (proformaNumber: string): string => {
  const baseNumber = getBaseNumber(proformaNumber);
  return `CI-${baseNumber}`;
};

// Generate Packing List number from Commercial Invoice
export const generatePackingListNumber = (commercialNumber: string): string => {
  const baseNumber = getBaseNumber(commercialNumber);
  return `PL-${baseNumber}`;
};
