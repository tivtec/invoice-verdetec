export type CompanyType = 'equipamentos' | 'insumos';
export type InsumosAddressKey = 'insumos_rio_negrinho' | 'insumos_itajai';
export type DocumentType = 'proforma' | 'commercial' | 'packing';

export type CurrencyCode = 'USD' | 'BRL' | 'EUR';

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', label: 'US$ – Dólar Americano (USD)', symbol: 'US$' },
  { code: 'BRL', label: 'R$ – Real Brasileiro (BRL)', symbol: 'R$' },
  { code: 'EUR', label: '€ – Euro (EUR)', symbol: '€' },
];

export const getCurrencySymbol = (currency: string): string => {
  const normalized = currency.toUpperCase();
  const option = CURRENCY_OPTIONS.find(
    (o) => o.code === normalized || o.symbol.toUpperCase() === normalized
  );
  return option?.symbol || currency;
};

export const DEFAULT_PAYMENT_TERMS = '100% Advance by T/T or Letter of Credit (L/C).';

export const DEFAULT_SALES_REPRESENTATIVE = 'Alexsandro Rodrigo Zaleski';
export const DEFAULT_SALES_REPRESENTATIVE_TITLE = 'VERDETEC Representative';

export const normalizeRepresentativeName = (name?: string, fallback = 'Caroline Franzen'): string => {
  const trimmed = (name || '').trim();
  return trimmed.toLowerCase() === 'rafael hermes'
    ? DEFAULT_SALES_REPRESENTATIVE
    : trimmed || fallback;
};

export const normalizeRepresentativeTitle = (title?: string, fallback = 'Verdetec Administrative Manager'): string => {
  const trimmed = (title || '').trim();
  return trimmed.toUpperCase() === 'VERDETEC SALES MANAGER'
    ? DEFAULT_SALES_REPRESENTATIVE_TITLE
    : trimmed || fallback;
};

export interface InvoiceItem {
  id: string;
  hsCode: string;
  qty: number;
  description: string;
  weight: number;
  unitPrice: number;
  total: number;
  packingWeight?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  documentType: DocumentType;
  companyType: CompanyType;
  orderId?: string;
  issueDate: string;
  placeOfIssue: string;
  
  // Importer/Buyer data
  importerCompanyName: string;
  importerTaxId: string;
  importerAddress: string;
  importerZipCode: string;
  importerPhone: string;
  importerEmail: string;
  importerCountry: string;
  
  // Terms
  incoterm: string;
  modeOfTransport: string;
  availability: string;
  currency: string;
  // Kept as paymentMethod internally for compatibility with the existing database column.
  // In the UI and generated documents this value is presented as Payment Terms.
  paymentMethod: string;
  freightCost?: number;
  insuranceCost?: number;
  importDutiesAndTaxes?: number;
  
  // Port fields (for Commercial Invoice - conditional based on Incoterm)
  portOfLoading?: string;
  portOfDischarge?: string;
  placeOfDelivery?: string;
  placeOfDestination?: string;
  
  // Items
  items: InvoiceItem[];
  
  // Signature
  clientRepresentative: string;
  clientCompanyPosition: string;
  clientPosition: string;
  clientPositionTitle: string;
  
  // Notes
  notes?: string;
  
  // Source document reference (for CI from PI, PL from CI)
  sourceInvoiceId?: string;
  
  // Display options
  showTotalWeight?: boolean;
  packingWeight?: number;
  manualPackingWeight?: number;
  includePackingWeight?: boolean;
  totalPackingWeight?: number;
  exporterAddressKey?: InsumosAddressKey;
  // Discounts
  applyDiscount?: boolean;
  discountAmount?: number;
  
  createdAt: string;
  updatedAt: string;
}

export const COMPANY_DATA = {
  equipamentos: {
    name: 'EQUIPAMENTOS VERDETEC LTDA',
    cnpj: '11.861.496/0001-04',
    address: 'Rodovia Antonio Heil, 5991, Limoeiro, Brusque, SC, Brasil',
    zipCode: '88.352-502',
    phone: '+55 (47) 3308-8805',
    bankDetails: {
      bank: 'Banco do Brasil – City of Brusque/SC',
      swift: 'BRASBRRJCTA',
      iban: 'BR9000000000083150000002674C1'
    }
  },
  insumos: {
    name: 'INSUMOS HIDROSSEMEADURA VERDETEC LTDA',
    cnpj: '41.183.017/0001-09',
    address: 'EST MFR 169, nº 2821, Águas Claras, Rio Negrinho – SC',
    zipCode: '89.299-899',
    phone: '(47) 3255-0655',
    bankDetails: {
      bank: 'Banco do Brasil – City of Brusque/SC',
      swift: 'BRASBRRJCTA',
      iban: 'BR8600000000083150000003239C1'
    },
    branches: {
      insumos_rio_negrinho: {
        tradeName: 'VERDETEC',
        address: 'EST MFR 169, nº 2821, Águas Claras, Rio Negrinho – SC',
        zipCode: '89.299-899',
        email: 'contato@verdetec.com',
        phone: '(47) 3255-0655',
      },
      insumos_itajai: {
        address: 'Rua Vergílio Cadore, 9259, Campeche, Itajaí, SC, Brasil',
        zipCode: '88318-995',
        phone: '+55 (47) 3308-8805',
      },
    },
  }
} as const;

// Helper to resolve company data with branch selection for Insumos
export const getCompanyData = (companyType: CompanyType, exporterAddressKey?: InsumosAddressKey) => {
  if (companyType !== 'insumos') return COMPANY_DATA[companyType];
  const branch = COMPANY_DATA.insumos.branches[exporterAddressKey || 'insumos_rio_negrinho'];
  return {
    name: COMPANY_DATA.insumos.name,
    cnpj: COMPANY_DATA.insumos.cnpj,
    address: COMPANY_DATA.insumos.address,
    zipCode: COMPANY_DATA.insumos.zipCode,
    phone: COMPANY_DATA.insumos.phone,
    bankDetails: COMPANY_DATA.insumos.bankDetails,
    ...branch,
  };
};
