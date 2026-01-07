import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { CompanyType, Invoice, InvoiceItem, COMPANY_DATA, getCompanyData, InsumosAddressKey } from '@/types/invoice';
import { generateInvoiceNumber, saveInvoice, getBaseNumber, createOrder, getOrderByBaseNumber, getOrderById, getImporters, getProducts, ProductRecord } from '@/utils/supabaseStorage';
import { useToast } from '@/hooks/use-toast';
import { InvoicePrintPreview } from './InvoicePrintPreview';
import { formatInvoiceAmount } from '@/utils/numberFormat';

const invoiceSchema = z.object({
  companyType: z.enum(['equipamentos', 'insumos']),
  exporterAddressKey: z.enum(['insumos_rio_negrinho', 'insumos_itajai']).optional(),
  importerCompanyName: z.string().min(1, 'Required field'),
  importerTaxId: z.string().min(1, 'Required field'),
  importerAddress: z.string().min(1, 'Required field'),
  importerZipCode: z.string().min(1, 'Required field'),
  importerPhone: z.string().min(1, 'Required field'),
  importerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  importerCountry: z.string().min(1, 'Required field'),
  incoterm: z.string().min(1, 'Required field'),
  modeOfTransport: z.string().min(1, 'Required field'),
  portOfLoading: z.string().optional().or(z.literal('')),
  portOfDischarge: z.string().optional().or(z.literal('')),
  placeOfDelivery: z.string().optional().or(z.literal('')),
  placeOfDestination: z.string().optional().or(z.literal('')),
  freightCost: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : undefined;
  }, z.number().optional()),
  insuranceCost: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : undefined;
  }, z.number().optional()),
  availability: z.string().min(1, 'Required field'),
  paymentMethod: z.string().min(1, 'Required field'),
  clientRepresentative: z.string().min(1, 'Required field'),
  clientCompanyPosition: z.string().min(1, 'Required field'),
  clientPosition: z.string().default('Rafael Hermes'),
  clientPositionTitle: z.string().default('VERDETEC SALES MANAGER'),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.companyType === 'insumos' && !data.exporterAddressKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['exporterAddressKey'],
      message: 'Select origin address',
    });
  }
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice, orderId?: string) => void;
  orderId?: string;
}

export const InvoiceForm = ({ invoice, onSave, orderId }: InvoiceFormProps) => {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const currencyLabel = 'US$';
  const initialItems = invoice?.items || [];
  const initialIncludePacking = invoice?.includePackingWeight ?? (initialItems.some(i => (i.packingWeight || 0) > 0) || (invoice?.packingWeight || 0) > 0);
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);
  const [manualPackingWeight, setManualPackingWeight] = useState<number>(invoice?.totalPackingWeight || invoice?.packingWeight || 0);
  const [showTotalWeight, setShowTotalWeight] = useState(invoice?.showTotalWeight ?? true);
  const [includePackingWeight, setIncludePackingWeight] = useState(initialIncludePacking);
  const [importers, setImporters] = useState<any[]>([]);
  const [selectedImporterId, setSelectedImporterId] = useState<string>('');
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [applyDiscount, setApplyDiscount] = useState<boolean>(invoice?.applyDiscount ?? ((invoice?.discountAmount || 0) > 0));
  const [discountAmount, setDiscountAmount] = useState<number>(invoice?.discountAmount ?? 0);
  const [autoNoteApplied, setAutoNoteApplied] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice || {
      companyType: 'equipamentos',
      exporterAddressKey: undefined,
      incoterm: 'EXW',
      modeOfTransport: 'To be arranged and paid by the importer',
      freightCost: undefined,
      insuranceCost: undefined,
      availability: '15 days',
      paymentMethod: '100% PRIOR TO SHIPPING.',
      clientPosition: 'Rafael Hermes',
      clientPositionTitle: 'VERDETEC SALES MANAGER',
      notes: '',
    }
  });

  const companyType = watch('companyType');
  const exporterAddressKey = watch('exporterAddressKey') as InsumosAddressKey | undefined;
  const resolvedCompany = getCompanyData(companyType, exporterAddressKey);
  const incoterm = watch('incoterm');
  useEffect(() => {
    if (companyType === 'insumos' && !exporterAddressKey) {
      setValue('exporterAddressKey', 'insumos_rio_negrinho');
    }
    if (companyType !== 'insumos' && exporterAddressKey) {
      setValue('exporterAddressKey', undefined);
    }
  }, [companyType, exporterAddressKey, setValue]);
  const showFreightCost = ['CFR', 'CPT', 'CIF', 'CIP'].includes(incoterm);
  const showInsuranceCost = ['CIF', 'CIP'].includes(incoterm);
  const showPortFields = ['FOB', 'FAS', 'CIF', 'CFR'].includes(incoterm);
  const showPlaceOfDelivery =
    incoterm === 'CPT' ||
    incoterm === 'CIP' ||
    incoterm === 'FCA';
  const showPlaceOfDestination =
    incoterm === 'CPT' ||
    incoterm === 'CIP' ||
    incoterm === 'DAP' ||
    incoterm === 'DPU' ||
    incoterm === 'DDP';
  const sanitizeNumber = (val: any) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    const num = Number(val);
    return Number.isFinite(num) ? num : undefined;
  };
  const freightCostValue = showFreightCost ? (sanitizeNumber(watch('freightCost')) ?? 0) : 0;
  const insuranceCostValue = showInsuranceCost ? (sanitizeNumber(watch('insuranceCost')) ?? 0) : 0;
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  useEffect(() => {
    if (!applyDiscount) return;
    if (discountAmount > subtotal) {
      setDiscountAmount(subtotal);
    }
  }, [applyDiscount, discountAmount, subtotal]);

  // Clear fields when hidden
  if (!showFreightCost && watch('freightCost')) {
    setValue('freightCost', undefined);
  }
  if (!showInsuranceCost && watch('insuranceCost')) {
    setValue('insuranceCost', undefined);
  }
  if (!showPortFields) {
    if (watch('portOfLoading')) setValue('portOfLoading', undefined);
    if (watch('portOfDischarge')) setValue('portOfDischarge', undefined);
  }
  if (!showPlaceOfDelivery && watch('placeOfDelivery')) {
    setValue('placeOfDelivery', undefined);
  }
  if (!showPlaceOfDestination && watch('placeOfDestination')) {
    setValue('placeOfDestination', undefined);
  }
  
  // Set default notes for Insumos when company type changes
  const insumosNoteSuggestion = 'Unit price refers to price per kilogram (Kg).\n\nPacking Specifications:';
  const notesValue = watch('notes');
  const notePlaceholder =
    invoice?.documentType === 'packing'
      ? 'Product Dimensions:\nNet Weight:\nGross Weight:\nCubic Measurement (CBM):\nPacking Specifications:'
      : companyType === 'insumos'
        ? insumosNoteSuggestion
        : 'Add notes that will appear at the bottom of the invoice (optional)';
  useEffect(() => {
    if (companyType === 'insumos') {
      if (!autoNoteApplied && !notesValue) {
        setValue('notes', insumosNoteSuggestion);
        setAutoNoteApplied(true);
      }
      return;
    }
    if (notesValue === insumosNoteSuggestion) {
      setValue('notes', '');
    }
    if (autoNoteApplied) {
      setAutoNoteApplied(false);
    }
  }, [autoNoteApplied, companyType, insumosNoteSuggestion, notesValue, setValue]);

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      hsCode: '',
      qty: companyType === 'insumos' ? 0 : 0,
      description: '',
      weight: companyType === 'insumos' ? 1 : 0,
      unitPrice: 0,
      total: 0,
      packingWeight: 0,
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (companyType === 'insumos') {
          // For INSUMOS: qty represents KG purchased; unit price is per KG
          if (field === 'qty' || field === 'weight') {
            updated.qty = Number(value) || 0;
            updated.weight = 1; // unit weight as 1kg to keep totals consistent
          }
          if (field === 'unitPrice') {
            updated.unitPrice = Number(value) || 0;
          }
          updated.total = (updated.qty || 0) * (updated.unitPrice || 0);
        } else {
          // For EQUIPAMENTOS: normal logic
          if (field === 'qty' || field === 'unitPrice') {
            updated.total = updated.qty * updated.unitPrice;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const getTotalPackingWeight = () => {
    if (!includePackingWeight) return 0;
    if (manualPackingWeight > 0) return manualPackingWeight;
    return items.reduce((sum, item) => sum + (item.packingWeight || 0) * (item.qty || 0), 0);
  };

  useEffect(() => {
    const loadImporters = async () => {
      try {
        const data = await getImporters();
        setImporters(data);
      } catch (err) {
        console.error('Error loading importers', err);
      }
    };
    const loadProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error('Error loading products', err);
      }
    };
    loadImporters();
    loadProducts();
  }, []);

  const handleSelectImporter = (importerId: string) => {
    setSelectedImporterId(importerId);
    const imp = importers.find((i) => i.id === importerId);
    if (imp) {
      setValue('importerCompanyName', imp.company_name);
      setValue('importerTaxId', imp.tax_id);
      setValue('importerAddress', imp.address);
      setValue('importerZipCode', imp.zip_code);
      setValue('importerPhone', imp.phone);
      setValue('importerEmail', imp.email || '');
      setValue('importerCountry', imp.country);
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    if (error && typeof error === 'object' && 'error_description' in error && typeof (error as any).error_description === 'string') {
      return (error as any).error_description;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  };

  const handleSelectProduct = (itemId: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              hsCode: prod.hs_code || it.hsCode,
              description: prod.description || it.description,
              weight: companyType === 'insumos' ? 1 : prod.weight_kg != null ? prod.weight_kg : it.weight,
              qty: companyType === 'insumos'
                ? (prod.weight_kg != null ? prod.weight_kg : it.qty)
                : it.qty || (companyType === 'equipamentos' ? 1 : it.qty),
              total:
                companyType === 'insumos'
                  ? ((prod.weight_kg != null ? prod.weight_kg : it.qty) || 0) * it.unitPrice
                  : (it.qty || 0) * it.unitPrice,
            }
          : it
      )
    );
  };

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const freightForSave = showFreightCost ? sanitizeNumber(data.freightCost) : undefined;
      const insuranceForSave = showInsuranceCost ? sanitizeNumber(data.insuranceCost) : undefined;
      const discountValue = applyDiscount ? Math.min(Math.max(discountAmount, 0), subtotal) : 0;

      const existingBase = invoice?.invoiceNumber?.match(/\d{6}$/)?.[0];
      let baseNumber = existingBase;
      const isNewInvoice = !invoice;

      if (!baseNumber && orderId) {
        const orderFromDb = await getOrderById(orderId);
        baseNumber = orderFromDb?.base_number || baseNumber;
      }

      // When creating a brand-new invoice, always generate a fresh base/number
      if (!baseNumber && isNewInvoice) {
        baseNumber = await getBaseNumber();
      }

      if (!baseNumber) {
        baseNumber = await getBaseNumber();
      }

      const invoiceNumber = `PI-${baseNumber}`;
      const totalPackingWeight = getTotalPackingWeight();
      
      // Use provided orderId or create/find by base number to keep documents grouped
      let targetOrderId = orderId || invoice?.orderId;
      let order = await getOrderByBaseNumber(baseNumber);
      if (order) {
        targetOrderId = order.id;
      } else if (!targetOrderId) {
        order = await createOrder(baseNumber);
        targetOrderId = order.id;
      }

      if (!targetOrderId) {
        throw new Error('Could not determine order ID');
      }

      const invoiceData: Invoice = {
        id: invoice?.id || crypto.randomUUID(),
        invoiceNumber,
        documentType: 'proforma',
        orderId: targetOrderId,
        issueDate: new Date().toISOString().split('T')[0],
        placeOfIssue: 'Brusque-SC-Brazil',
        currency: 'US$',
        items,
        createdAt: invoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyType: data.companyType,
        exporterAddressKey: data.exporterAddressKey,
        importerCompanyName: data.importerCompanyName,
        importerTaxId: data.importerTaxId,
        importerAddress: data.importerAddress,
        importerZipCode: data.importerZipCode,
        importerPhone: data.importerPhone,
        importerEmail: data.importerEmail || '',
        importerCountry: data.importerCountry,
        incoterm: data.incoterm,
        modeOfTransport: data.modeOfTransport,
        availability: data.availability,
        paymentMethod: data.paymentMethod,
        freightCost: freightForSave,
        insuranceCost: insuranceForSave,
        applyDiscount,
        discountAmount: discountValue,
        portOfLoading: data.portOfLoading,
        portOfDischarge: data.portOfDischarge,
        placeOfDelivery: data.placeOfDelivery,
        placeOfDestination: data.placeOfDestination,
        clientRepresentative: data.clientRepresentative,
        clientCompanyPosition: data.clientCompanyPosition,
        clientPosition: data.clientPosition,
        clientPositionTitle: data.clientPositionTitle,
        notes: data.notes,
        showTotalWeight,
        packingWeight: totalPackingWeight,
        includePackingWeight,
        totalPackingWeight,
        manualPackingWeight: manualPackingWeight || undefined,
      };

      await saveInvoice(invoiceData, targetOrderId);
      
      toast({
        title: 'Success!',
        description: 'Proforma Invoice saved successfully.',
      });

      if (onSave) {
        onSave(invoiceData, targetOrderId);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      const message = getErrorMessage(error);
      toast({
        title: 'Error',
        description: `Failed to save invoice: ${message}`,
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    const data = watch();
    const totalPackingWeight = getTotalPackingWeight();
    const freightForPreview = showFreightCost ? sanitizeNumber(data.freightCost) : undefined;
    const insuranceForPreview = showInsuranceCost ? sanitizeNumber(data.insuranceCost) : undefined;
    const discountValue = applyDiscount ? Math.min(Math.max(discountAmount, 0), subtotal) : 0;
      const invoiceData: Invoice = {
        id: invoice?.id || Date.now().toString(),
        invoiceNumber: data.invoiceNumber || invoice?.invoiceNumber || 'PI-250001',
        documentType: 'proforma',
        orderId: orderId || invoice?.orderId,
        issueDate: new Date().toLocaleDateString('en-US'),
        placeOfIssue: 'Brusque-SC-Brazil',
        currency: 'US$',
        items,
        createdAt: invoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyType: data.companyType,
        exporterAddressKey: data.exporterAddressKey,
        importerCompanyName: data.importerCompanyName,
        importerTaxId: data.importerTaxId,
        importerAddress: data.importerAddress,
        importerZipCode: data.importerZipCode,
        importerPhone: data.importerPhone,
        importerEmail: data.importerEmail || '',
        importerCountry: data.importerCountry,
        incoterm: data.incoterm,
      modeOfTransport: data.modeOfTransport,
      availability: data.availability,
        paymentMethod: data.paymentMethod,
        freightCost: freightForPreview,
        insuranceCost: insuranceForPreview,
        applyDiscount,
        discountAmount: discountValue,
        portOfLoading: data.portOfLoading,
        portOfDischarge: data.portOfDischarge,
        placeOfDelivery: data.placeOfDelivery,
        placeOfDestination: data.placeOfDestination,
        clientRepresentative: data.clientRepresentative,
        clientCompanyPosition: data.clientCompanyPosition,
        clientPosition: data.clientPosition,
        clientPositionTitle: data.clientPositionTitle,
        notes: data.notes,
        showTotalWeight,
        packingWeight: totalPackingWeight,
        includePackingWeight,
        totalPackingWeight,
        manualPackingWeight: manualPackingWeight || undefined,
      };
    setShowPreview(true);
  };

  if (showPreview) {
    const data = watch();
    const totalPackingWeight = getTotalPackingWeight();
    const freightForPreview = showFreightCost ? sanitizeNumber(data.freightCost) : undefined;
    const insuranceForPreview = showInsuranceCost ? sanitizeNumber(data.insuranceCost) : undefined;
    const discountValue = applyDiscount ? Math.min(Math.max(discountAmount, 0), subtotal) : 0;
    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber: data.invoiceNumber || invoice?.invoiceNumber || 'PI-250001',
      documentType: 'proforma',
      orderId: orderId || invoice?.orderId,
      issueDate: new Date().toLocaleDateString('en-US'),
      placeOfIssue: 'Brusque-SC-Brazil',
    currency: 'US$',
    items,
    createdAt: invoice?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    companyType: data.companyType,
    importerCompanyName: data.importerCompanyName,
    importerTaxId: data.importerTaxId,
    importerAddress: data.importerAddress,
    importerZipCode: data.importerZipCode,
    importerPhone: data.importerPhone,
    importerEmail: data.importerEmail || '',
    importerCountry: data.importerCountry,
    incoterm: data.incoterm,
    modeOfTransport: data.modeOfTransport,
    availability: data.availability,
    paymentMethod: data.paymentMethod,
    freightCost: freightForPreview,
    insuranceCost: insuranceForPreview,
    applyDiscount,
    discountAmount: discountValue,
    portOfLoading: data.portOfLoading,
    portOfDischarge: data.portOfDischarge,
    placeOfDelivery: data.placeOfDelivery,
    placeOfDestination: data.placeOfDestination,
    clientRepresentative: data.clientRepresentative,
    clientCompanyPosition: data.clientCompanyPosition,
    clientPosition: data.clientPosition,
    clientPositionTitle: data.clientPositionTitle,
    notes: data.notes,
      showTotalWeight,
      packingWeight: totalPackingWeight,
      includePackingWeight,
      totalPackingWeight,
      manualPackingWeight: manualPackingWeight || undefined,
    };
    
    return <InvoicePrintPreview invoice={invoiceData} onBack={() => setShowPreview(false)} />;
  }

  const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
  const totalPackingWeight = includePackingWeight ? getTotalPackingWeight() : 0;
  const totalWeight = itemsWeight + (includePackingWeight ? totalPackingWeight : 0);
  const totalAmountBeforeDiscount =
    ['CIF', 'CIP'].includes(incoterm)
      ? subtotal + freightCostValue + insuranceCostValue
      : ['CFR', 'CPT'].includes(incoterm)
        ? subtotal + freightCostValue
        : subtotal;
  const discountValue = applyDiscount ? Math.min(Math.max(discountAmount, 0), subtotal) : 0;
  const totalAmount = Math.max(totalAmountBeforeDiscount - discountValue, 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">New Proforma Invoice</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company Type *</Label>
              <select {...register('companyType')} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
                <option value="equipamentos">EQUIPAMENTOS VERDETEC LTDA</option>
                <option value="insumos">INSUMOS HIDROSSEMEADURA VERDETEC LTDA</option>
              </select>
            </div>
            {companyType === 'insumos' && (
              <div>
                <Label>Selecionar Endereço de Origem *</Label>
                <select
                  {...register('exporterAddressKey')}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">Selecione...</option>
                  <option value="insumos_itajai">ITAJAI – Unidade Campeche</option>
                  <option value="insumos_rio_negrinho">RIO NEGRINHO – Unidade Volta Grande</option>
                </select>
                {errors.exporterAddressKey && <span className="text-sm text-destructive">{errors.exporterAddressKey.message}</span>}
              </div>
            )}

            <div>
              <Label>Invoice Number</Label>
              <Input {...register('invoiceNumber')} placeholder="Auto-generated if left empty" />
              {errors.invoiceNumber && <span className="text-sm text-destructive">{errors.invoiceNumber.message}</span>}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-semibold mb-2">Exporter Data</h3>
            <p className="text-sm">{resolvedCompany.name}</p>
            <p className="text-sm">CNPJ: {resolvedCompany.cnpj}</p>
            <p className="text-sm">{resolvedCompany.address}</p>
            <p className="text-sm">ZIP Code: {resolvedCompany.zipCode}</p>
            <p className="text-sm">Phone: {resolvedCompany.phone}</p>
          </div>

          <h3 className="font-semibold text-lg mt-6">Importer / Buyer Data</h3>

          {importers.length > 0 && (
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <Label>Escolher cliente cadastrado</Label>
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  value={selectedImporterId}
                  onChange={(e) => handleSelectImporter(e.target.value)}
                >
                  <option value="">Selecione um cliente...</option>
                  {importers.map((imp) => (
                    <option key={imp.id} value={imp.id}>
                      {imp.company_name} — {imp.tax_id}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-muted-foreground">
                Ao selecionar, os dados do cliente são preenchidos automaticamente.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company Name *</Label>
              <Input {...register('importerCompanyName')} />
              {errors.importerCompanyName && <span className="text-sm text-destructive">{errors.importerCompanyName.message}</span>}
            </div>

            <div>
              <Label>Tax Identification Number *</Label>
              <Input {...register('importerTaxId')} />
              {errors.importerTaxId && <span className="text-sm text-destructive">{errors.importerTaxId.message}</span>}
            </div>

            <div>
              <Label>Address *</Label>
              <Input {...register('importerAddress')} />
              {errors.importerAddress && <span className="text-sm text-destructive">{errors.importerAddress.message}</span>}
            </div>

            <div>
              <Label>Zip Code *</Label>
              <Input {...register('importerZipCode')} />
              {errors.importerZipCode && <span className="text-sm text-destructive">{errors.importerZipCode.message}</span>}
            </div>

            <div>
              <Label>Phone *</Label>
              <Input {...register('importerPhone')} />
              {errors.importerPhone && <span className="text-sm text-destructive">{errors.importerPhone.message}</span>}
            </div>

            <div>
              <Label>E-mail</Label>
              <Input type="email" {...register('importerEmail')} />
              {errors.importerEmail && <span className="text-sm text-destructive">{errors.importerEmail.message}</span>}
            </div>

            <div>
              <Label>Country of Destination *</Label>
              <Input {...register('importerCountry')} />
              {errors.importerCountry && <span className="text-sm text-destructive">{errors.importerCountry.message}</span>}
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Commercial Terms</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>INCOTERM *</Label>
              <select {...register('incoterm')} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
                <option value="EXW">EXW - Ex Works</option>
                <option value="FCA">FCA - Free Carrier</option>
                <option value="FAS">FAS - Free Alongside Ship</option>
                <option value="FOB">FOB - Free On Board</option>
                <option value="CFR">CFR - Cost and Freight</option>
                <option value="CIF">CIF - Cost, Insurance and Freight</option>
                <option value="CPT">CPT - Carriage Paid To</option>
                <option value="CIP">CIP - Carriage and Insurance Paid To</option>
                <option value="DAP">DAP - Delivered at Place</option>
                <option value="DPU">DPU - Delivered at Place Unloaded</option>
                <option value="DDP">DDP - Delivered Duty Paid</option>
              </select>
              {errors.incoterm && <span className="text-sm text-destructive">{errors.incoterm.message}</span>}
            </div>

            <div>
              <Label>Mode of Transport *</Label>
              <select {...register('modeOfTransport')} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
                <option value="SEA FREIGHT">SEA FREIGHT</option>
                <option value="AIR FREIGHT">AIR FREIGHT</option>
                <option value="BY ROAD">BY ROAD</option>
                <option value="COURIER">COURIER</option>
                <option value="MULTIMODAL">MULTIMODAL</option>
                <option value="To be arranged and paid by the importer">To be arranged and paid by the importer</option>
              </select>
              {errors.modeOfTransport && <span className="text-sm text-destructive">{errors.modeOfTransport.message}</span>}
            </div>

            <div>
              <Label>Availability *</Label>
              <select {...register('availability')} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
                <option value="Immediate">Immediate</option>
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="45 days">45 days</option>
                <option value="60 days">60 days</option>
                <option value="75 days">75 days</option>
                <option value="90 days">90 days</option>
                <option value="120 days">120 days</option>
              </select>
              {errors.availability && <span className="text-sm text-destructive">{errors.availability.message}</span>}
            </div>

            <div className="col-span-3">
              <Label>Payment Method *</Label>
              <Input {...register('paymentMethod')} />
              {errors.paymentMethod && <span className="text-sm text-destructive">{errors.paymentMethod.message}</span>}
            </div>
          </div>

          {/* Ports for maritime Incoterms */}
          {showPortFields && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-md bg-muted/30">
              <div>
                <Label>Port of Loading (optional)</Label>
                <Input {...register('portOfLoading')} placeholder="e.g., Port of Santos" />
              </div>
              <div>
                <Label>Port of Discharge (optional)</Label>
                <Input {...register('portOfDischarge')} placeholder="e.g., Port of Miami" />
              </div>
            </div>
          )}

          {/* Multimodal place fields */}
          {(showPlaceOfDelivery || showPlaceOfDestination) && (
            <div className={`grid gap-4 mt-4 p-4 border rounded-md bg-muted/30 ${showPlaceOfDelivery && showPlaceOfDestination ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {showPlaceOfDelivery && (
                <div>
                  <Label>Place of Delivery (optional)</Label>
                  <Input {...register('placeOfDelivery')} placeholder="e.g., Warehouse Address" />
                </div>
              )}
              {showPlaceOfDestination && (
                <div>
                  <Label>Place of Destination (optional)</Label>
                  <Input {...register('placeOfDestination')} placeholder="e.g., Final Destination" />
                </div>
              )}
            </div>
          )}

          {/* Freight / Insurance */}
          {(showFreightCost || showInsuranceCost) && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {showFreightCost && (
                <div>
                  <Label>Freight Cost (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('freightCost', { valueAsNumber: true })}
                  />
                </div>
              )}
              {showInsuranceCost && (
                <div>
                  <Label>Insurance Cost (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('insuranceCost', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          )}

          <h3 className="font-semibold text-lg mt-6">Items</h3>
          
          <div className="space-y-2">
            {items.map((item) => (
              companyType === 'insumos' ? (
                <div key={item.id} className="grid grid-cols-7 gap-2 items-end">
                  <div>
                    <Label className="text-xs">HS CODE</Label>
                    <Input
                      value={item.hsCode}
                      onChange={(e) => updateItem(item.id, 'hsCode', e.target.value)}
                      placeholder="NCM"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Produto (cadastrado)</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs"
                      value=""
                      onChange={(e) => {
                        handleSelectProduct(item.id, e.target.value);
                        e.target.selectedIndex = 0;
                      }}
                    >
                      <option value="">Selecionar produto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.description} (HS: {p.hs_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">QTY (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price (per kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Label className="text-xs">Total</Label>
                      <Input value={`${currencyLabel} ${formatInvoiceAmount(item.total, currencyLabel)}`} disabled />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="grid grid-cols-7 gap-2 items-end">
                  <div>
                    <Label className="text-xs">HS CODE</Label>
                    <Input
                      value={item.hsCode}
                      onChange={(e) => updateItem(item.id, 'hsCode', e.target.value)}
                      placeholder="NCM"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Produto (cadastrado)</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs"
                      value=""
                      onChange={(e) => {
                        handleSelectProduct(item.id, e.target.value);
                        e.target.selectedIndex = 0;
                      }}
                    >
                      <option value="">Selecionar produto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.description} (HS: {p.hs_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">QTY</Label>
                    <Input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Weight (KG)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.weight || ''}
                      onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Label className="text-xs">Total</Label>
                      <Input value={`${currencyLabel} ${formatInvoiceAmount(item.total, currencyLabel)}`} disabled />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            ))}
          </div>

          <Button type="button" onClick={addItem} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>

          <div className="bg-muted p-4 rounded-md">
            <div className="flex flex-col gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includePackingWeight"
                  checked={includePackingWeight}
                  onCheckedChange={(checked) => setIncludePackingWeight(checked as boolean)}
                />
                <Label htmlFor="includePackingWeight" className="cursor-pointer">
                  Add Packing Weight per item (shows in documents)
                </Label>
                {includePackingWeight && (
                  <Input
                    type="number"
                    step="0.01"
                    value={manualPackingWeight || ''}
                    onChange={(e) => setManualPackingWeight(parseFloat(e.target.value) || 0)}
                    placeholder="Total packing weight (KG)"
                    className="w-40"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showTotalWeight"
                  checked={showTotalWeight}
                  onCheckedChange={(checked) => setShowTotalWeight(checked as boolean)}
                />
                <Label htmlFor="showTotalWeight" className="cursor-pointer">
                  Show Total Weight in printed version
                </Label>
              </div>
            </div>
            <div className="flex flex-col gap-1 font-semibold">
              {includePackingWeight && (
                <div className="flex justify-end">
                  <span>Total Packing Weight: {totalPackingWeight.toFixed(2)} KG</span>
                </div>
              )}
              {showTotalWeight && (
                <div className="flex justify-end">
                  <span>Total Weight: {totalWeight.toFixed(2)} KG</span>
                </div>
              )}
              <div className="flex justify-end">
                <span>Subtotal: {currencyLabel} {formatInvoiceAmount(subtotal, currencyLabel)}</span>
              </div>
              {(freightCostValue > 0 || insuranceCostValue > 0) && (
                <div className="flex justify-end gap-6 text-sm mt-1">
                  {freightCostValue > 0 && (
                    <span>+ Freight: {currencyLabel} {formatInvoiceAmount(freightCostValue, currencyLabel)}</span>
                  )}
                  {insuranceCostValue > 0 && (
                    <span>+ Insurance: {currencyLabel} {formatInvoiceAmount(insuranceCostValue, currencyLabel)}</span>
                  )}
                </div>
              )}
              <div className="flex justify-end items-center gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="applyDiscount"
                    checked={applyDiscount}
                    onCheckedChange={(checked) => setApplyDiscount(checked as boolean)}
                  />
                  <Label htmlFor="applyDiscount" className="cursor-pointer text-sm">
                    Apply Discount
                  </Label>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  disabled={!applyDiscount}
                  value={discountAmount || 0}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    const sanitized = Number.isFinite(parsed) ? parsed : 0;
                    const clamped = Math.min(Math.max(sanitized, 0), subtotal);
                    setDiscountAmount(clamped);
                  }}
                  className="w-32"
                />
              </div>
              {applyDiscount && discountAmount > 0 && (
                <div className="flex justify-end text-destructive text-sm">
                  <span>Discount: -{currencyLabel} {formatInvoiceAmount(discountValue, currencyLabel)}</span>
                </div>
              )}
              <div className="flex justify-end font-bold text-lg">
                Total Amount: {currencyLabel} {formatInvoiceAmount(totalAmount, currencyLabel)}
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Notes (Optional)</h3>
          
          <div>
            <Label>Notes</Label>
            <Textarea 
              {...register('notes')} 
              placeholder={notePlaceholder}
              rows={3}
            />
          </div>

          <h3 className="font-semibold text-lg mt-6">Client Approval</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client Name *</Label>
              <Input {...register('clientRepresentative')} />
              {errors.clientRepresentative && <span className="text-sm text-destructive">{errors.clientRepresentative.message}</span>}
            </div>

            <div>
              <Label>Verdetec Representative</Label>
              <Input {...register('clientPosition')} />
            </div>

            <div>
              <Label>Client Position and Company *</Label>
              <Input {...register('clientCompanyPosition')} />
              {errors.clientCompanyPosition && <span className="text-sm text-destructive">{errors.clientCompanyPosition.message}</span>}
            </div>

            <div>
              <Label>Verdetec Representative Position</Label>
              <Input {...register('clientPositionTitle')} />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
          <Button type="button" onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print Preview
          </Button>
        </div>
      </Card>
    </form>
  );
};
