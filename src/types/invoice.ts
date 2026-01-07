export type CompanyType = 'equipamentos' | 'insumos';
export type DocumentType = 'proforma' | 'commercial' | 'packing';

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
  paymentMethod: string;
  freightCost?: number;
  insuranceCost?: number;
  
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
  includePackingWeight?: boolean;
  totalPackingWeight?: number;
  
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
    address: 'Rua Mário Murara, nº 2.735, Distrito de Volta Grande, Rio Negrinho-SC',
    zipCode: '89299-506',
    phone: '+55 (47) 3308-8805',
    bankDetails: {
      bank: 'Banco do Brasil – City of Brusque/SC',
      swift: 'BRASBRRJCTA',
      iban: 'BR9000000000083150000002674C1'
    }
  }
} as const;
