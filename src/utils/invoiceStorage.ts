import { Invoice } from '@/types/invoice';

const STORAGE_KEY = 'proforma_invoices';
const COUNTER_KEY = 'invoice_counter';

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
  const counter = localStorage.getItem(COUNTER_KEY);
  const currentCounter = counter ? parseInt(counter) : 1000;
  const newCounter = currentCounter + 1;
  localStorage.setItem(COUNTER_KEY, newCounter.toString());
  return `INV-${newCounter}`;
};
