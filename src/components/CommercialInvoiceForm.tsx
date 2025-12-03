import { useState } from 'react';
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
import { saveInvoice, getOrderByBaseNumber, createOrder, getBaseNumber } from '@/utils/supabaseStorage';
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
  availability: z.string().optional(),
  paymentMethod: z.string().min(1, 'Required field'),
  clientRepresentative: z.string().min(1, 'Required field'),
  clientCompanyPosition: z.string().min(1, 'Required field'),
  clientPosition: z.string().default('Rafael Hermes'),
  clientPositionTitle: z.string().default('VERDETEC SALES MANAGER'),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
  // Port fields for maritime incoterms (CIF/CFR)
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  // Place fields for multimodal incoterms (CIP/CPT)
  placeOfDelivery: z.string().optional(),
  placeOfDestination: z.string().optional(),
});

type CommercialFormData = z.infer<typeof commercialSchema>;

interface CommercialInvoiceFormProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice, orderId?: string) => void;
  orderId?: string;
}

export const CommercialInvoiceForm = ({ invoice, onSave, orderId }: CommercialInvoiceFormProps) => {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || []);
  const [packingWeight, setPackingWeight] = useState(invoice?.packingWeight || 0);
  const [includePackingWeight, setIncludePackingWeight] = useState(invoice?.includePackingWeight ?? false);
  const [showTotalWeight, setShowTotalWeight] = useState(invoice?.showTotalWeight ?? true);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CommercialFormData>({
    resolver: zodResolver(commercialSchema),
    defaultValues: invoice ? {
      ...invoice,
      invoiceNumber: invoice.documentType === 'proforma' 
        ? generateCommercialInvoiceNumber(invoice.invoiceNumber)
        : invoice.invoiceNumber,
      clientPosition: 'Caroline Franzen',
      clientPositionTitle: 'Verdetec Administrative Manager',
    } : {
      companyType: 'equipamentos',
      incoterm: 'EXW',
      modeOfTransport: 'SEA FREIGHT',
      paymentMethod: '100% PRIOR TO SHIPPING.',
      clientPosition: 'Caroline Franzen',
      clientPositionTitle: 'Verdetec Administrative Manager',
      notes: '',
    }
  });

  const companyType = watch('companyType');
  const incoterm = watch('incoterm');
  
  // Determine if port/place fields should be shown
  const isMaritimeIncoterm = ['CIF', 'CFR'].includes(incoterm);
  const isMultimodalIncoterm = ['CIP', 'CPT'].includes(incoterm);
  
  // Set default notes for Insumos when company type changes
  const currentNotes = watch('notes');
  if (companyType === 'insumos' && currentNotes === '') {
    setValue('notes', 'Unit price refers to price per kilogram (Kg).');
  } else if (companyType === 'equipamentos' && currentNotes === 'Unit price refers to price per kilogram (Kg).') {
    setValue('notes', '');
  }

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      hsCode: '',
      qty: companyType === 'insumos' ? 1 : 0,
      description: '',
      weight: 0,
      unitPrice: 0,
      total: 0
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // For INSUMOS: qty is always 1, price is per KG, total = weight * unitPrice
        if (companyType === 'insumos') {
          updated.qty = 1;
          if (field === 'weight' || field === 'unitPrice') {
            updated.total = updated.weight * updated.unitPrice;
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

  const onSubmit = async (data: CommercialFormData) => {
    try {
      const invoiceNumber = data.invoiceNumber || 
        (invoice?.documentType === 'proforma' 
          ? generateCommercialInvoiceNumber(invoice.invoiceNumber)
          : `CI-${await getBaseNumber()}`);

      const invoiceData: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber,
        documentType: 'commercial',
        issueDate: new Date().toISOString().split('T')[0],
        placeOfIssue: 'Brusque-SC-Brasil',
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
        availability: data.availability || '',
        paymentMethod: data.paymentMethod,
        clientRepresentative: data.clientRepresentative,
        clientCompanyPosition: data.clientCompanyPosition,
        clientPosition: data.clientPosition,
        clientPositionTitle: data.clientPositionTitle,
        notes: data.notes,
        sourceInvoiceId: invoice?.documentType === 'proforma' ? invoice.invoiceNumber : undefined,
        packingWeight,
        includePackingWeight,
        showTotalWeight,
        // Port/Place fields
        portOfLoading: data.portOfLoading,
        portOfDischarge: data.portOfDischarge,
        placeOfDelivery: data.placeOfDelivery,
        placeOfDestination: data.placeOfDestination,
      };

      let targetOrderId = orderId;
      
      if (!targetOrderId) {
        const baseNumber = invoiceNumber.match(/\d{6}$/)?.[0];
        if (baseNumber) {
          const existingOrder = await getOrderByBaseNumber(baseNumber);
          if (existingOrder) {
            targetOrderId = existingOrder.id;
          } else {
            const newOrder = await createOrder(baseNumber);
            targetOrderId = newOrder.id;
          }
        }
      }

      if (!targetOrderId) {
        throw new Error('Could not determine order ID');
      }

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
      toast({
        title: 'Error',
        description: 'Failed to save invoice. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    const data = watch();
    const invoiceNumber = data.invoiceNumber || 
      (invoice?.documentType === 'proforma' 
        ? generateCommercialInvoiceNumber(invoice.invoiceNumber)
        : `CI-${new Date().getFullYear().toString().slice(-2)}0001`);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'commercial',
      issueDate: new Date().toLocaleDateString('en-US'),
      placeOfIssue: 'Brusque-SC-Brasil',
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
      clientRepresentative: data.clientRepresentative,
      clientCompanyPosition: data.clientCompanyPosition,
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'proforma' ? invoice.invoiceNumber : undefined,
      packingWeight,
      includePackingWeight,
      showTotalWeight,
    };
    setShowPreview(true);
  };

  if (showPreview) {
    const data = watch();
    const invoiceNumber = data.invoiceNumber || 
      (invoice?.documentType === 'proforma' 
        ? generateCommercialInvoiceNumber(invoice.invoiceNumber)
        : `CI-${new Date().getFullYear().toString().slice(-2)}0001`);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'commercial',
      issueDate: new Date().toLocaleDateString('en-US'),
      placeOfIssue: 'Brusque-SC-Brasil',
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
      clientRepresentative: data.clientRepresentative,
      clientCompanyPosition: data.clientCompanyPosition,
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'proforma' ? invoice.invoiceNumber : undefined,
      packingWeight,
      includePackingWeight,
      showTotalWeight,
    };
    
    return <InvoicePrintPreview invoice={invoiceData} onBack={() => setShowPreview(false)} />;
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
  const totalWeight = itemsWeight + (includePackingWeight ? packingWeight : 0);

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
              <Label>Payment Method *</Label>
              <Input {...register('paymentMethod')} />
              {errors.paymentMethod && <span className="text-sm text-destructive">{errors.paymentMethod.message}</span>}
            </div>

            <div>
              <Label>Availability</Label>
              <select {...register('availability')} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
                <option value="">Select availability</option>
                <option value="Immediate">Immediate</option>
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="45 days">45 days</option>
                <option value="60 days">60 days</option>
                <option value="75 days">75 days</option>
                <option value="90 days">90 days</option>
                <option value="120 days">120 days</option>
              </select>
            </div>
          </div>

          {/* Maritime Incoterms - Port fields (CIF/CFR) */}
          {isMaritimeIncoterm && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-md bg-muted/30">
              <div>
                <Label>Port of Loading *</Label>
                <Input {...register('portOfLoading', { required: isMaritimeIncoterm })} placeholder="e.g., Port of Santos" />
              </div>
              <div>
                <Label>Port of Discharge *</Label>
                <Input {...register('portOfDischarge', { required: isMaritimeIncoterm })} placeholder="e.g., Port of Miami" />
              </div>
            </div>
          )}

          {/* Multimodal Incoterms - Place fields (CIP/CPT) */}
          {isMultimodalIncoterm && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-md bg-muted/30">
              <div>
                <Label>Place of Delivery (optional)</Label>
                <Input {...register('placeOfDelivery')} placeholder="e.g., Warehouse Address" />
              </div>
              <div>
                <Label>Place of Destination (optional)</Label>
                <Input {...register('placeOfDestination')} placeholder="e.g., Final Destination" />
              </div>
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
                <Label htmlFor="packingWeightCI">Packing Weight (KG) - Optional:</Label>
                <Input 
                  id="packingWeightCI"
                  type="number"
                  step="0.01"
                  value={packingWeight || ''}
                  onChange={(e) => setPackingWeight(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
              {packingWeight > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includePackingWeightCI"
                    checked={includePackingWeight}
                    onCheckedChange={(checked) => setIncludePackingWeight(checked as boolean)}
                  />
                  <Label htmlFor="includePackingWeightCI" className="cursor-pointer">
                    Include Packing Weight in Total Weight calculation
                  </Label>
                </div>
              )}
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
            <div className="flex justify-between font-semibold">
              {showTotalWeight && <span>Total Weight: {totalWeight.toFixed(2)} KG</span>}
              <span className={!showTotalWeight ? 'ml-auto' : ''}>Subtotal: ${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-end font-bold text-lg mt-2">
              Total: ${subtotal.toFixed(2)}
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Notes (Optional)</h3>
          
          <div>
            <Label>Notes</Label>
            <Textarea 
              {...register('notes')} 
              placeholder="Add notes that will appear at the bottom of the invoice (optional)"
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
