import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { CompanyType, Invoice, InvoiceItem, COMPANY_DATA } from '@/types/invoice';
import { saveInvoice, generatePackingListNumber } from '@/utils/invoiceStorage';
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
  paymentMethod: z.string().min(1, 'Required field'),
  clientPosition: z.string().default('Rafael Hermes'),
  clientPositionTitle: z.string().default('VERDETEC SALES MANAGER'),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

type PackingFormData = z.infer<typeof packingSchema>;

interface PackingListFormProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice) => void;
}

export const PackingListForm = ({ invoice, onSave }: PackingListFormProps) => {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || []);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<PackingFormData>({
    resolver: zodResolver(packingSchema),
    defaultValues: invoice ? {
      ...invoice,
      invoiceNumber: invoice.documentType === 'commercial' 
        ? generatePackingListNumber(invoice.invoiceNumber)
        : invoice.invoiceNumber
    } : {
      companyType: 'equipamentos',
      incoterm: 'EXW',
      modeOfTransport: 'SEA FREIGHT',
      paymentMethod: '100% PRIOR TO SHIPPING.',
      clientPosition: 'Rafael Hermes',
      clientPositionTitle: 'VERDETEC SALES MANAGER',
    }
  });

  const companyType = watch('companyType');

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

  const onSubmit = (data: PackingFormData) => {
    const invoiceNumber = data.invoiceNumber || 
      (invoice?.documentType === 'commercial' 
        ? generatePackingListNumber(invoice.invoiceNumber)
        : `PL-${new Date().getFullYear().toString().slice(-2)}0001`);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'packing',
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
      clientRepresentative: '',
      clientCompanyPosition: '',
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'commercial' ? invoice.invoiceNumber : undefined,
    };

    saveInvoice(invoiceData);
    
    toast({
      title: 'Success!',
      description: 'Packing List saved successfully.',
    });

    if (onSave) {
      onSave(invoiceData);
    }
  };

  const handlePrint = () => {
    const data = watch();
    const invoiceNumber = data.invoiceNumber || 
      (invoice?.documentType === 'commercial' 
        ? generatePackingListNumber(invoice.invoiceNumber)
        : `PL-${new Date().getFullYear().toString().slice(-2)}0001`);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'packing',
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
      clientRepresentative: '',
      clientCompanyPosition: '',
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'commercial' ? invoice.invoiceNumber : undefined,
    };
    setShowPreview(true);
  };

  if (showPreview) {
    const data = watch();
    const invoiceNumber = data.invoiceNumber || 
      (invoice?.documentType === 'commercial' 
        ? generatePackingListNumber(invoice.invoiceNumber)
        : `PL-${new Date().getFullYear().toString().slice(-2)}0001`);

    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber,
      documentType: 'packing',
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
      clientRepresentative: '',
      clientCompanyPosition: '',
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
      sourceInvoiceId: invoice?.documentType === 'commercial' ? invoice.invoiceNumber : undefined,
    };
    
    return <InvoicePrintPreview invoice={invoiceData} onBack={() => setShowPreview(false)} />;
  }

  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
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
            <div className="flex justify-end font-bold text-lg">
              Total Weight: {totalWeight.toFixed(2)} KG
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Notes (Optional)</h3>
          
          <div>
            <Label>Notes</Label>
            <Textarea 
              {...register('notes')} 
              placeholder="Add notes that will appear at the bottom of the packing list (optional)"
              rows={3}
            />
          </div>

          <h3 className="font-semibold text-lg mt-6">Prepared By</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Verdetec Representative</Label>
              <Input {...register('clientPosition')} />
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
