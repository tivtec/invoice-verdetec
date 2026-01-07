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
import { CompanyType, Invoice, InvoiceItem, COMPANY_DATA } from '@/types/invoice';
import { saveInvoice as saveToLocalStorage, generateCommercialInvoiceNumber } from '@/utils/invoiceStorage';
import { saveInvoice, getOrderByBaseNumber, createOrder, getBaseNumber, getOrderById, getImporters } from '@/utils/supabaseStorage';
import { useToast } from '@/hooks/use-toast';
import { InvoicePrintPreview } from './InvoicePrintPreview';

const commercialSchema = z.object({
  companyType: z.enum(['equipamentos', 'insumos']),
  importerCompanyName: z.string().min(1, 'Required field'),
  importerTaxId: z.string().min(1, 'Required field'),
  importerAddress: z.string().min(1, 'Required field'),
  importerZipCode: z.string().min(1, 'Required field'),
  importerPhone: z.string().min(1, 'Required field'),
  importerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  importerCountry: z.string().min(1, 'Required field'),
  incoterm: z.string().min(1, 'Required field'),
  modeOfTransport: z.string().min(1, 'Required field'),
  paymentMethod: z.string().min(1, 'Required field'),
  clientRepresentative: z.string().default('N/A'),
  clientCompanyPosition: z.string().default('N/A'),
  clientPosition: z.string().default('Caroline Franzen'),
  clientPositionTitle: z.string().default('Verdetec Administrative Manager'),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
  // Port fields for maritime incoterms (CIF/CFR)
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  // Place fields for multimodal incoterms (CIP/CPT)
  placeOfDelivery: z.string().optional(),
  placeOfDestination: z.string().optional(),
  freightCost: z.coerce.number().optional(),
  insuranceCost: z.coerce.number().optional(),
});

type CommercialFormData = z.infer<typeof commercialSchema>;

interface CommercialInvoiceFormProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice, orderId?: string) => void;
  orderId?: string;
}

export const CommercialInvoiceForm = ({ invoice, onSave, orderId }: CommercialInvoiceFormProps) => {
  const suggestedRepName = 'Caroline Franzen';
  const suggestedRepTitle = 'Verdetec Administrative Manager';
  const normalizeRepName = (name?: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed === 'Rafael Hermes') return suggestedRepName;
    return trimmed;
  };
  const normalizeRepTitle = (title?: string) => {
    const trimmed = (title || '').trim();
    if (!trimmed || trimmed.toUpperCase() === 'VERDETEC SALES MANAGER') return suggestedRepTitle;
    return trimmed;
  };

  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const initialItems = invoice?.items || [];
  const initialIncludePacking = invoice?.includePackingWeight ?? (initialItems.some(i => (i.packingWeight || 0) > 0) || (invoice?.packingWeight || 0) > 0);
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);
  const [manualPackingWeight, setManualPackingWeight] = useState<number>(invoice?.totalPackingWeight || invoice?.packingWeight || 0);
  const [includePackingWeight, setIncludePackingWeight] = useState(initialIncludePacking);
  const [showTotalWeight, setShowTotalWeight] = useState(invoice?.showTotalWeight ?? true);
  const [importers, setImporters] = useState<any[]>([]);
  const [selectedImporterId, setSelectedImporterId] = useState<string>('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CommercialFormData>({
    resolver: zodResolver(commercialSchema),
    defaultValues: invoice ? {
      ...invoice,
      invoiceNumber: invoice.documentType === 'proforma' 
        ? generateCommercialInvoiceNumber(invoice.invoiceNumber)
        : invoice.invoiceNumber,
      clientPosition: normalizeRepName(invoice.clientPosition),
      clientPositionTitle: normalizeRepTitle(invoice.clientPositionTitle),
    } : {
      companyType: 'equipamentos',
      incoterm: 'EXW',
      modeOfTransport: 'SEA FREIGHT',
      paymentMethod: '100% PRIOR TO SHIPPING.',
      clientPosition: suggestedRepName,
      clientPositionTitle: suggestedRepTitle,
      clientRepresentative: 'N/A',
      clientCompanyPosition: 'N/A',
      notes: '',
    }
  });

  const companyType = watch('companyType');
  const incoterm = watch('incoterm');
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
  const isMaritimeIncoterm = showPortFields;
  const isMultimodalIncoterm = showPlaceOfDelivery || showPlaceOfDestination;
  const freightCostValue = showFreightCost ? Number(watch('freightCost') || 0) : 0;
  const insuranceCostValue = showInsuranceCost ? Number(watch('insuranceCost') || 0) : 0;
  
  // Clear freight/insurance when Incoterm does not require
  if (!showFreightCost && watch('freightCost')) {
    setValue('freightCost', undefined);
  }
  if (!showInsuranceCost && watch('insuranceCost')) {
    setValue('insuranceCost', undefined);
  }

  // Clear port/place fields when hidden
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

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      hsCode: '',
      qty: companyType === 'insumos' ? 0 : 0,
      description: '',
      weight: 0,
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
        // For INSUMOS: qty represents KG; mirror weight to qty and total = qty * price per KG
        if (companyType === 'insumos') {
          if (field === 'weight' || field === 'qty') {
            const kg = Number(value) || 0;
            updated.qty = kg;
            updated.weight = kg;
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

  // Normalize INSUMOS items coming from Proforma so weight field shows the KG entered there
  useEffect(() => {
    if (companyType !== 'insumos') return;
    if (!invoice?.items?.length) return;
    setItems(invoice.items.map((item) => {
      const kg = item.qty || item.weight || 0;
      return {
        ...item,
        qty: kg, // qty represents KG for insumos
        weight: kg,
        total: kg * (item.unitPrice || 0),
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyType, invoice?.id]);

  useEffect(() => {
    const loadImporters = async () => {
      try {
        const data = await getImporters();
        setImporters(data);
      } catch (err) {
        console.error('Error loading importers', err);
      }
    };
    loadImporters();
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

  const onSubmit = async (data: CommercialFormData) => {
    try {
      const existingBase = invoice?.invoiceNumber?.match(/\d{6}$/)?.[0];
      let baseNumber = existingBase;
      const isNewInvoice = !invoice || invoice.documentType !== 'commercial';

      if (!baseNumber && orderId) {
        const orderFromDb = await getOrderById(orderId);
        baseNumber = orderFromDb?.base_number || baseNumber;
      }

      // If coming from a proforma, reuse its base; otherwise create a fresh one
      if (!baseNumber && invoice?.documentType === 'proforma') {
        baseNumber = invoice.invoiceNumber.match(/\d{6}$/)?.[0];
      }

      if (!baseNumber && isNewInvoice) {
        baseNumber = await getBaseNumber();
      }

      if (!baseNumber) {
        baseNumber = await getBaseNumber();
      }

      const invoiceNumber = `CI-${baseNumber}`;
      const totalPackingWeight = getTotalPackingWeight();

      let targetOrderId = orderId || invoice?.orderId;
      let existingOrder = await getOrderByBaseNumber(baseNumber);
      if (existingOrder) {
        targetOrderId = existingOrder.id;
      } else if (!targetOrderId) {
        const newOrder = await createOrder(baseNumber);
        targetOrderId = newOrder.id;
      }

      if (!targetOrderId) {
        throw new Error('Could not determine order ID');
      }

      const invoiceData: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber,
        documentType: 'commercial',
        orderId: targetOrderId,
        issueDate: new Date().toISOString().split('T')[0],
        placeOfIssue: 'Brusque-SC-Brazil',
        currency: 'US$',
        items,
        createdAt: new Date().toISOString(),
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
        availability: '',
        paymentMethod: data.paymentMethod,
        freightCost: showFreightCost ? data.freightCost : undefined,
        insuranceCost: showInsuranceCost ? data.insuranceCost : undefined,
        clientRepresentative: data.clientRepresentative,
        clientCompanyPosition: data.clientCompanyPosition,
        clientPosition: data.clientPosition || 'Caroline Franzen',
        clientPositionTitle: data.clientPositionTitle || 'Verdetec Administrative Manager',
        notes: data.notes,
        sourceInvoiceId: invoice?.documentType === 'proforma' ? invoice.invoiceNumber : undefined,
        packingWeight: totalPackingWeight,
        includePackingWeight,
        showTotalWeight,
        totalPackingWeight,
        manualPackingWeight: manualPackingWeight || undefined,
        // Port/Place fields
        portOfLoading: data.portOfLoading,
        portOfDischarge: data.portOfDischarge,
        placeOfDelivery: data.placeOfDelivery,
        placeOfDestination: data.placeOfDestination,
      };

      await saveInvoice(invoiceData, targetOrderId);
      
      toast({
        title: 'Success!',
        description: 'Commercial Invoice saved successfully.',
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
    let baseNumber = invoice?.invoiceNumber?.match(/\d{6}$/)?.[0];
    if (!baseNumber && orderId) {
      const orderBase = invoice?.orderId === orderId ? invoice.invoiceNumber.match(/\d{6}$/)?.[0] : undefined;
      baseNumber = orderBase || baseNumber;
    }
    if (!baseNumber && data.invoiceNumber) {
      baseNumber = data.invoiceNumber.match(/\d{6}$/)?.[0];
    }
    if (!baseNumber && invoice?.documentType === 'proforma') {
      baseNumber = invoice.invoiceNumber.match(/\d{6}$/)?.[0];
    }
    if (!baseNumber) {
      baseNumber = new Date().getFullYear().toString().slice(-2) + '0001';
    }
    const invoiceNumber = `CI-${baseNumber}`;
    const repName = normalizeRepName(data.clientPosition);
    const repTitle = normalizeRepTitle(data.clientPositionTitle);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'commercial',
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
      availability: '',
      paymentMethod: data.paymentMethod,
      freightCost: showFreightCost ? data.freightCost : undefined,
      insuranceCost: showInsuranceCost ? data.insuranceCost : undefined,
      clientRepresentative: data.clientRepresentative,
      clientCompanyPosition: data.clientCompanyPosition,
      clientPosition: repName,
      clientPositionTitle: repTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'proforma' ? invoice.invoiceNumber : undefined,
      packingWeight: getTotalPackingWeight(),
      includePackingWeight,
      showTotalWeight,
      totalPackingWeight: getTotalPackingWeight(),
      manualPackingWeight: manualPackingWeight || undefined,
      portOfLoading: data.portOfLoading,
      portOfDischarge: data.portOfDischarge,
      placeOfDelivery: data.placeOfDelivery,
      placeOfDestination: data.placeOfDestination,
    };
    setShowPreview(true);
  };

  if (showPreview) {
    const data = watch();
    const invoiceNumber = data.invoiceNumber || 
      (invoice?.documentType === 'proforma' 
        ? generateCommercialInvoiceNumber(invoice.invoiceNumber)
        : `CI-${new Date().getFullYear().toString().slice(-2)}0001`);
    const repName = normalizeRepName(data.clientPosition);
    const repTitle = normalizeRepTitle(data.clientPositionTitle);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'commercial',
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
      availability: data.availability || '',
      paymentMethod: data.paymentMethod,
      freightCost: showFreightCost ? data.freightCost : undefined,
      insuranceCost: showInsuranceCost ? data.insuranceCost : undefined,
      clientRepresentative: data.clientRepresentative,
      clientCompanyPosition: data.clientCompanyPosition,
      clientPosition: repName,
      clientPositionTitle: repTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'proforma' ? invoice.invoiceNumber : undefined,
      packingWeight: getTotalPackingWeight(),
      includePackingWeight,
      showTotalWeight,
      totalPackingWeight: getTotalPackingWeight(),
      portOfLoading: data.portOfLoading,
      portOfDischarge: data.portOfDischarge,
      placeOfDelivery: data.placeOfDelivery,
      placeOfDestination: data.placeOfDestination,
    };
    
    return <InvoicePrintPreview invoice={invoiceData} onBack={() => setShowPreview(false)} />;
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const itemsWeight = items.reduce((sum, item) => {
    if (companyType === 'insumos') {
      const kg = item.qty || item.weight || 0;
      return sum + kg;
    }
    return sum + (item.weight * item.qty);
  }, 0);
  const totalPackingWeight = includePackingWeight ? getTotalPackingWeight() : 0;
  const totalWeight = itemsWeight + (includePackingWeight ? totalPackingWeight : 0);
  const totalAmount =
    ['CIF', 'CIP'].includes(incoterm)
      ? subtotal + freightCostValue + insuranceCostValue
      : ['CFR', 'CPT'].includes(incoterm)
        ? subtotal + freightCostValue
        : subtotal;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">New Commercial Invoice</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company Type *</Label>
              <select {...register('companyType')} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
                <option value="equipamentos">EQUIPAMENTOS VERDETEC LTDA</option>
                <option value="insumos">INSUMOS HIDROSSEMEADURA VERDETEC LTDA</option>
              </select>
            </div>

            <div>
              <Label>Invoice Number *</Label>
              <Input {...register('invoiceNumber')} placeholder="Enter invoice number" />
              {errors.invoiceNumber && <span className="text-sm text-destructive">{errors.invoiceNumber.message}</span>}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-semibold mb-2">Exporter Data</h3>
            <p className="text-sm">{COMPANY_DATA[companyType].name}</p>
            <p className="text-sm">CNPJ: {COMPANY_DATA[companyType].cnpj}</p>
            <p className="text-sm">{COMPANY_DATA[companyType].address}</p>
            <p className="text-sm">ZIP Code: {COMPANY_DATA[companyType].zipCode}</p>
            <p className="text-sm">Phone: {COMPANY_DATA[companyType].phone}</p>
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
          
          <div className="grid grid-cols-2 gap-4">
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
              </select>
              {errors.modeOfTransport && <span className="text-sm text-destructive">{errors.modeOfTransport.message}</span>}
            </div>

            <div>
              <Label>Terms of Payment: *</Label>
              <Input {...register('paymentMethod')} />
              {errors.paymentMethod && <span className="text-sm text-destructive">{errors.paymentMethod.message}</span>}
            </div>
          </div>

          {/* Maritime Incoterms - Port fields (FOB/FAS/CIF/CFR) */}
          {showPortFields && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-md bg-muted/30">
              <div>
                <Label>Port of Loading *</Label>
                <Input {...register('portOfLoading', { required: showPortFields })} placeholder="e.g., Port of Santos" />
              </div>
              <div>
                <Label>Port of Discharge *</Label>
                <Input {...register('portOfDischarge', { required: showPortFields })} placeholder="e.g., Port of Miami" />
              </div>
            </div>
          )}

          {/* Multimodal Incoterms - Place fields */}
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

          <h3 className="font-semibold text-lg mt-6">Items</h3>
          
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-6 gap-2 items-end">
                <div>
                  <Label className="text-xs">HS CODE</Label>
                  <Input 
                    value={item.hsCode}
                    onChange={(e) => updateItem(item.id, 'hsCode', e.target.value)}
                    placeholder="NCM"
                  />
                </div>
                {companyType !== 'insumos' && (
                  <div>
                    <Label className="text-xs">QTY</Label>
                    <Input 
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
                <div className={companyType === 'insumos' ? 'col-span-2' : ''}>
                  <Label className="text-xs">Description</Label>
                  <Input 
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Weight (KG)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={item.weight || ''}
                    onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{companyType === 'insumos' ? 'Price per KG' : 'Unit Price'}</Label>
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
                    <Input 
                      value={`$${item.total.toFixed(2)}`}
                      disabled
                    />
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
            ))}
          </div>

          <Button type="button" onClick={addItem} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>

          <div className="bg-muted p-4 rounded-md">
            <div className="flex flex-col gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includePackingWeightCI"
                  checked={includePackingWeight}
                  onCheckedChange={(checked) => setIncludePackingWeight(checked as boolean)}
                />
                <Label htmlFor="includePackingWeightCI" className="cursor-pointer">
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
                  id="showTotalWeightCI"
                  checked={showTotalWeight}
                  onCheckedChange={(checked) => setShowTotalWeight(checked as boolean)}
                />
                <Label htmlFor="showTotalWeightCI" className="cursor-pointer">
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
                <span>Subtotal (Merchandise): ${subtotal.toFixed(2)}</span>
              </div>
              {(freightCostValue > 0 || insuranceCostValue > 0) && (
                <div className="flex justify-end gap-6 text-sm mt-1">
                  {freightCostValue > 0 && <span>+ Freight: ${freightCostValue.toFixed(2)}</span>}
                  {insuranceCostValue > 0 && <span>+ Insurance: ${insuranceCostValue.toFixed(2)}</span>}
                </div>
              )}
              <div className="flex justify-end font-bold text-lg">
                Total: ${totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {(showFreightCost || showInsuranceCost) && (
            <div className="grid grid-cols-2 gap-4">
              {showFreightCost && (
                <div>
                  <Label>Freight Cost *</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    {...register('freightCost', { valueAsNumber: true, required: showFreightCost })}
                  />
                  {errors.freightCost && <span className="text-sm text-destructive">Freight cost is required for this Incoterm.</span>}
                </div>
              )}
              {showInsuranceCost && (
                <div>
                  <Label>Insurance Cost *</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    {...register('insuranceCost', { valueAsNumber: true, required: showInsuranceCost })}
                  />
                  {errors.insuranceCost && <span className="text-sm text-destructive">Insurance cost is required for this Incoterm.</span>}
                </div>
              )}
            </div>
          )}

          <h3 className="font-semibold text-lg mt-6">Notes (Optional)</h3>
          
          <div>
            <Label>Notes</Label>
            <Textarea 
              {...register('notes')} 
              placeholder="Add notes that will appear at the bottom of the invoice (optional)"
              rows={3}
            />
          </div>

          <h3 className="font-semibold text-lg mt-6">Verdetec Representative</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input 
                {...register('clientPosition')} 
                placeholder="Caroline Franzen"
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input 
                {...register('clientPositionTitle')} 
                placeholder="Verdetec Administrative Manager"
              />
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
