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
import { saveInvoice as saveToLocalStorage, generatePackingListNumber } from '@/utils/invoiceStorage';
import { saveInvoice, getOrderByBaseNumber, createOrder, getBaseNumber, getOrderById, getImporters, getInvoicesByOrderId } from '@/utils/supabaseStorage';
import { useToast } from '@/hooks/use-toast';
import { InvoicePrintPreview } from './InvoicePrintPreview';

const packingSchema = z.object({
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
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  placeOfDelivery: z.string().optional(),
  placeOfDestination: z.string().optional(),
  paymentMethod: z.string().min(1, 'Required field'),
  clientPosition: z.string().default('Caroline Franzen'),
  clientPositionTitle: z.string().default('Verdetec Administrative Manager'),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  const incoterm = (data.incoterm || '').trim().toUpperCase();
  const requiresPorts = ['FOB', 'FAS', 'CFR', 'CIF'].includes(incoterm);
  if (requiresPorts) {
    if (!data.portOfLoading?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['portOfLoading'],
        message: 'Port / Airport of Loading is required for this Incoterm',
      });
    }
    if (!data.portOfDischarge?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['portOfDischarge'],
        message: 'Port of Discharge is required for this Incoterm',
      });
    }
  }
});

type PackingFormData = z.infer<typeof packingSchema>;

interface PackingListFormProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice, orderId?: string) => void;
  orderId?: string;
}

export const PackingListForm = ({ invoice, onSave, orderId }: PackingListFormProps) => {
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

  const packingListDefaultNotes = `Product Dimensions:
Net Weight:
Gross Weight:
Cubic Measurement (CBM):
Packing Specifications:`;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PackingFormData>({
    resolver: zodResolver(packingSchema),
    defaultValues: invoice ? {
      ...invoice,
      invoiceNumber: invoice.documentType === 'commercial' 
        ? generatePackingListNumber(invoice.invoiceNumber)
        : invoice.invoiceNumber,
      clientPosition: normalizeRepName(invoice.clientPosition),
      clientPositionTitle: normalizeRepTitle(invoice.clientPositionTitle),
      notes: invoice.documentType === 'packing' && invoice.notes
        ? invoice.notes
        : packingListDefaultNotes,
    } : {
      companyType: 'equipamentos',
      incoterm: 'EXW',
      modeOfTransport: 'SEA FREIGHT',
      portOfLoading: '',
      portOfDischarge: '',
      placeOfDelivery: '',
      placeOfDestination: '',
      paymentMethod: '100% PRIOR TO SHIPPING.',
      clientPosition: suggestedRepName,
      clientPositionTitle: suggestedRepTitle,
      notes: packingListDefaultNotes,
    }
  });

  const companyType = watch('companyType');
  const incoterm = (watch('incoterm') || '').toUpperCase();
  const showPortLoading = ['FOB', 'FAS', 'CFR', 'CIF'].includes(incoterm);
  const showPortDischarge = ['FOB', 'FAS', 'CFR', 'CIF'].includes(incoterm);
  const showPlaceOfDelivery = ['CPT', 'CIP', 'FCA'].includes(incoterm);
  const showPlaceOfDestination = ['CPT', 'CIP', 'DAP', 'DPU', 'DDP'].includes(incoterm);

  useEffect(() => {
    if (companyType !== 'insumos') return;
    if (!invoice?.items?.length) return;
    // For INSUMOS, mirror qty/weight so the form shows the actual kg from the source invoice
    setItems(invoice.items.map(item => {
      const qtyWeight = item.weight || item.qty || 0;
      return {
        ...item,
        weight: qtyWeight,
        qty: qtyWeight,
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyType, invoice?.id]);

  useEffect(() => {
    const hydrateFromCommercial = async () => {
      if (companyType !== 'insumos') return;
      if (!invoice?.orderId) return;
      if (invoice.documentType !== 'packing') return;
      const hasMeaningfulWeight = invoice.items?.some(it => (it.weight || 0) > 1);
      if (hasMeaningfulWeight) return;

      try {
        const orderInvoices = await getInvoicesByOrderId(invoice.orderId);
        const commercial = orderInvoices.find(inv => inv.documentType === 'commercial');
        if (!commercial) return;

        setItems((invoice.items || []).map((item, idx) => {
          const source = commercial.items[idx];
          const sourceWeight = source ? (source.weight || source.qty || 0) : 0;
          const fallbackWeight = item.weight || item.qty || 0;
          const finalWeight = sourceWeight || fallbackWeight;
          return {
            ...item,
            description: item.description || source?.description || '',
            weight: finalWeight,
            qty: finalWeight,
          };
        }));
      } catch (err) {
        console.error('Error hydrating packing list from commercial invoice', err);
      }
    };

    hydrateFromCommercial();
  }, [companyType, invoice?.orderId, invoice?.documentType, invoice?.items]);

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
        // For INSUMOS in packing: use weight as entered and mirror qty for consistency
        if (companyType === 'insumos') {
          if (field === 'weight') {
            updated.weight = Number(value) || 0;
            updated.qty = updated.weight;
          }
          if (field === 'qty') {
            updated.qty = Number(value) || 0;
            updated.weight = updated.qty;
          }
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

  // Clear hidden fields based on Incoterm rules
  useEffect(() => {
    if (!showPortLoading && watch('portOfLoading')) setValue('portOfLoading', '');
    if (!showPortDischarge && watch('portOfDischarge')) setValue('portOfDischarge', '');
    if (!showPlaceOfDestination && watch('placeOfDestination')) setValue('placeOfDestination', '');
    if (!showPlaceOfDelivery && watch('placeOfDelivery')) setValue('placeOfDelivery', '');
  }, [showPortLoading, showPortDischarge, showPlaceOfDestination, showPlaceOfDelivery, setValue, watch]);

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

  const getTotalPackingWeight = () => {
    if (!includePackingWeight) return 0;
    if (manualPackingWeight > 0) return manualPackingWeight;
    return items.reduce((sum, item) => sum + (item.packingWeight || 0) * (item.qty || 0), 0);
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

  const onSubmit = async (data: PackingFormData) => {
    try {
      const repName = (data.clientPosition || '').trim() || 'Caroline Franzen';
      const repTitle = (data.clientPositionTitle || '').trim() || 'Verdetec Administrative Manager';

      const isNewInvoice = !invoice || invoice.documentType !== 'packing';
      const invoiceNumber = data.invoiceNumber || 
        (invoice?.documentType === 'commercial' 
          ? generatePackingListNumber(invoice.invoiceNumber)
          : `PL-${await getBaseNumber()}`);
      const totalPackingWeight = getTotalPackingWeight();
      let baseNumber = invoiceNumber.match(/\d{6}$/)?.[0];
      if (!baseNumber && orderId) {
        const orderFromDb = await getOrderById(orderId);
        baseNumber = orderFromDb?.base_number || baseNumber;
      }
      if (!baseNumber && invoice?.documentType === 'commercial') {
        baseNumber = invoice.invoiceNumber.match(/\d{6}$/)?.[0];
      }
      if (!baseNumber && isNewInvoice) {
        baseNumber = await getBaseNumber();
      }
      if (!baseNumber) {
        baseNumber = await getBaseNumber();
      }
      const normalizedInvoiceNumber = `PL-${baseNumber}`;

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
        invoiceNumber: normalizedInvoiceNumber,
        documentType: 'packing',
        orderId: targetOrderId,
        issueDate: new Date().toLocaleDateString('en-US'),
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
        portOfLoading: data.portOfLoading,
        portOfDischarge: data.portOfDischarge,
        placeOfDelivery: data.placeOfDelivery,
        placeOfDestination: data.placeOfDestination,
        paymentMethod: data.paymentMethod,
        clientRepresentative: '',
        clientCompanyPosition: '',
        clientPosition: repName,
        clientPositionTitle: repTitle,
        notes: data.notes,
        sourceInvoiceId: invoice?.documentType === 'commercial' ? invoice.invoiceNumber : undefined,
        packingWeight: totalPackingWeight,
        includePackingWeight,
        showTotalWeight,
        totalPackingWeight,
        manualPackingWeight: manualPackingWeight || undefined,
      };

      await saveInvoice(invoiceData, targetOrderId);
      
      toast({
        title: 'Success!',
        description: 'Packing List saved successfully.',
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
    const repName = normalizeRepName(data.clientPosition);
    const repTitle = normalizeRepTitle(data.clientPositionTitle);
    let baseNumber = invoice?.invoiceNumber?.match(/\d{6}$/)?.[0];
    if (!baseNumber && orderId) {
      // If linked to an order, force base number from that context when available
      baseNumber = invoice?.orderId === orderId ? invoice.invoiceNumber.match(/\d{6}$/)?.[0] : baseNumber;
    }
    if (!baseNumber && data.invoiceNumber) {
      baseNumber = data.invoiceNumber.match(/\d{6}$/)?.[0];
    }
    if (!baseNumber && invoice?.documentType === 'commercial') {
      baseNumber = invoice.invoiceNumber.match(/\d{6}$/)?.[0];
    }
    if (!baseNumber) {
      baseNumber = new Date().getFullYear().toString().slice(-2) + '0001';
    }
    const invoiceNumber = `PL-${baseNumber}`;
    const totalPackingWeight = getTotalPackingWeight();

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'packing',
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
      portOfLoading: data.portOfLoading,
      portOfDischarge: data.portOfDischarge,
      placeOfDelivery: data.placeOfDelivery,
      placeOfDestination: data.placeOfDestination,
      paymentMethod: data.paymentMethod,
      clientRepresentative: '',
      clientCompanyPosition: '',
      clientPosition: repName,
      clientPositionTitle: repTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'commercial' ? invoice.invoiceNumber : undefined,
      packingWeight: totalPackingWeight,
      includePackingWeight,
      showTotalWeight,
      totalPackingWeight,
      manualPackingWeight: manualPackingWeight || undefined,
    };
    setShowPreview(true);
  };

  if (showPreview) {
    const data = watch();
    const invoiceNumber = data.invoiceNumber || 
      (invoice?.documentType === 'commercial' 
        ? generatePackingListNumber(invoice.invoiceNumber)
        : `PL-${new Date().getFullYear().toString().slice(-2)}0001`);
    const totalPackingWeight = getTotalPackingWeight();
    const repName = normalizeRepName(data.clientPosition);
    const repTitle = normalizeRepTitle(data.clientPositionTitle);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'packing',
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
      portOfLoading: data.portOfLoading,
      portOfDischarge: data.portOfDischarge,
      placeOfDelivery: data.placeOfDelivery,
      placeOfDestination: data.placeOfDestination,
      paymentMethod: data.paymentMethod,
      clientRepresentative: '',
      clientCompanyPosition: '',
      clientPosition: repName,
      clientPositionTitle: repTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'commercial' ? invoice.invoiceNumber : undefined,
      packingWeight: totalPackingWeight,
      includePackingWeight,
      showTotalWeight,
      totalPackingWeight,
      manualPackingWeight: manualPackingWeight || undefined,
    };
    
    return <InvoicePrintPreview invoice={invoiceData} onBack={() => setShowPreview(false)} />;
  }

  const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
  const totalPackingWeight = includePackingWeight ? getTotalPackingWeight() : 0;
  const totalWeight = itemsWeight + (includePackingWeight ? totalPackingWeight : 0);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">New Packing List</h2>
        
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
              <Label>Document Number *</Label>
              <Input {...register('invoiceNumber')} placeholder="Enter document number" />
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

          <h3 className="font-semibold text-lg mt-6">Shipping Terms</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>INCOTERM *</Label>
              <Input {...register('incoterm')} placeholder="Ex: EXW, FOB, CIF" />
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
          </div>

          {/* Incoterm-based locations */}
          {(showPortLoading || showPortDischarge || showPlaceOfDestination || showPlaceOfDelivery) && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-md bg-muted/30">
              {showPortLoading && (
                <div className="col-span-2 sm:col-span-1">
                  <Label>Port / Airport of Loading *</Label>
                  <Input {...register('portOfLoading')} placeholder="e.g., Port of Santos / GRU Airport" />
                </div>
              )}
              {showPortDischarge && (
                <div className="col-span-2 sm:col-span-1">
                  <Label>Port of Discharge *</Label>
                  <Input {...register('portOfDischarge')} placeholder="e.g., Port of Miami" />
                </div>
              )}
              {showPlaceOfDestination && (
                <div className="col-span-2">
                  <Label>Named Place of Destination (optional)</Label>
                  <Input {...register('placeOfDestination')} placeholder="e.g., CPT/CIP or DAP/DPU/DDP destination" />
                </div>
              )}
              {showPlaceOfDelivery && (
                <div className="col-span-2">
                  <Label>Final Delivery Location (optional)</Label>
                  <Input {...register('placeOfDelivery')} placeholder="e.g., Final Delivery Address" />
                </div>
              )}
            </div>
          )}

          <h3 className="font-semibold text-lg mt-6">Items</h3>
          
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-5 gap-2 items-end">
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
                <div className={companyType === 'insumos' ? 'col-span-3' : 'col-span-2'}>
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
                <div className="flex gap-2 items-center">
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
                id="includePackingWeightPL"
                checked={includePackingWeight}
                onCheckedChange={(checked) => setIncludePackingWeight(checked as boolean)}
              />
              <Label htmlFor="includePackingWeightPL" className="cursor-pointer">
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
                id="showTotalWeightPL"
                checked={showTotalWeight}
                  onCheckedChange={(checked) => setShowTotalWeight(checked as boolean)}
                />
                <Label htmlFor="showTotalWeightPL" className="cursor-pointer">
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
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Notes (Optional)</h3>
          
          <div>
            <Label>Notes</Label>
            <Textarea 
              {...register('notes')} 
              placeholder={packingListDefaultNotes}
              rows={3}
            />
          </div>

          <h3 className="font-semibold text-lg mt-6">Prepared By</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Verdetec Representative</Label>
              <Input 
                {...register('clientPosition')} 
                placeholder="Caroline Franzen"
              />
            </div>

            <div>
              <Label>Verdetec Representative Position</Label>
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
