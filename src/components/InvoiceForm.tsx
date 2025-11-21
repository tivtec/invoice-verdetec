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
import { generateInvoiceNumber, saveInvoice } from '@/utils/invoiceStorage';
import { useToast } from '@/hooks/use-toast';
import { InvoicePrintPreview } from './InvoicePrintPreview';

const invoiceSchema = z.object({
  companyType: z.enum(['equipamentos', 'insumos']),
  importerCompanyName: z.string().min(1, 'Campo obrigatório'),
  importerTaxId: z.string().min(1, 'Campo obrigatório'),
  importerAddress: z.string().min(1, 'Campo obrigatório'),
  importerZipCode: z.string().min(1, 'Campo obrigatório'),
  importerPhone: z.string().min(1, 'Campo obrigatório'),
  importerEmail: z.string().email('Email inválido'),
  importerCountry: z.string().min(1, 'Campo obrigatório'),
  incoterm: z.string().min(1, 'Campo obrigatório'),
  modeOfTransport: z.string().min(1, 'Campo obrigatório'),
  availability: z.string().min(1, 'Campo obrigatório'),
  paymentMethod: z.string().min(1, 'Campo obrigatório'),
  clientRepresentative: z.string().min(1, 'Campo obrigatório'),
  clientCompanyPosition: z.string().min(1, 'Campo obrigatório'),
  clientPosition: z.string().default('Rafael Hermes'),
  clientPositionTitle: z.string().default('VERDETEC SALES MANAGER'),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice) => void;
}

export const InvoiceForm = ({ invoice, onSave }: InvoiceFormProps) => {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items || []
  );

  const { register, handleSubmit, watch, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice || {
      companyType: 'equipamentos',
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
      qty: 0,
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
        if (field === 'qty' || field === 'unitPrice') {
          updated.total = updated.qty * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const onSubmit = (data: InvoiceFormData) => {
    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber: invoice?.invoiceNumber || generateInvoiceNumber(),
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
      importerEmail: data.importerEmail,
      importerCountry: data.importerCountry,
      incoterm: data.incoterm,
      modeOfTransport: data.modeOfTransport,
      availability: data.availability,
      paymentMethod: data.paymentMethod,
      clientRepresentative: data.clientRepresentative,
      clientCompanyPosition: data.clientCompanyPosition,
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
    };

    saveInvoice(invoiceData);
    
    toast({
      title: 'Sucesso!',
      description: 'Proforma Invoice salva com sucesso.',
    });

    if (onSave) {
      onSave(invoiceData);
    }
  };

  const handlePrint = () => {
    const data = watch();
    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber: invoice?.invoiceNumber || generateInvoiceNumber(),
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
      importerEmail: data.importerEmail,
      importerCountry: data.importerCountry,
      incoterm: data.incoterm,
      modeOfTransport: data.modeOfTransport,
      availability: data.availability,
      paymentMethod: data.paymentMethod,
      clientRepresentative: data.clientRepresentative,
      clientCompanyPosition: data.clientCompanyPosition,
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
    };
    setShowPreview(true);
  };

  if (showPreview) {
    const data = watch();
    const invoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(),
      invoiceNumber: invoice?.invoiceNumber || generateInvoiceNumber(),
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
      importerEmail: data.importerEmail,
      importerCountry: data.importerCountry,
      incoterm: data.incoterm,
      modeOfTransport: data.modeOfTransport,
      availability: data.availability,
      paymentMethod: data.paymentMethod,
      clientRepresentative: data.clientRepresentative,
      clientCompanyPosition: data.clientCompanyPosition,
      clientPosition: data.clientPosition,
      clientPositionTitle: data.clientPositionTitle,
      notes: data.notes,
    };
    
    return <InvoicePrintPreview invoice={invoiceData} onBack={() => setShowPreview(false)} />;
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Nova Proforma Invoice</h2>
        
        <div className="space-y-4">
          <div>
            <Label>Tipo de Empresa *</Label>
            <select {...register('companyType')} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
              <option value="equipamentos">EQUIPAMENTOS VERDETEC LTDA</option>
              <option value="insumos">INSUMOS HIDROSSEMEADURA VERDETEC LTDA</option>
            </select>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-semibold mb-2">Dados do Exportador</h3>
            <p className="text-sm">{COMPANY_DATA[companyType].name}</p>
            <p className="text-sm">CNPJ: {COMPANY_DATA[companyType].cnpj}</p>
            <p className="text-sm">{COMPANY_DATA[companyType].address}</p>
            <p className="text-sm">CEP: {COMPANY_DATA[companyType].zipCode}</p>
            <p className="text-sm">Phone: {COMPANY_DATA[companyType].phone}</p>
          </div>

          <h3 className="font-semibold text-lg mt-6">Dados do Importador / Comprador</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome da Empresa *</Label>
              <Input {...register('importerCompanyName')} />
              {errors.importerCompanyName && <span className="text-sm text-destructive">{errors.importerCompanyName.message}</span>}
            </div>

            <div>
              <Label>Tax Identification Number *</Label>
              <Input {...register('importerTaxId')} />
              {errors.importerTaxId && <span className="text-sm text-destructive">{errors.importerTaxId.message}</span>}
            </div>

            <div>
              <Label>Endereço *</Label>
              <Input {...register('importerAddress')} />
              {errors.importerAddress && <span className="text-sm text-destructive">{errors.importerAddress.message}</span>}
            </div>

            <div>
              <Label>Zip Code *</Label>
              <Input {...register('importerZipCode')} />
              {errors.importerZipCode && <span className="text-sm text-destructive">{errors.importerZipCode.message}</span>}
            </div>

            <div>
              <Label>Telefone *</Label>
              <Input {...register('importerPhone')} />
              {errors.importerPhone && <span className="text-sm text-destructive">{errors.importerPhone.message}</span>}
            </div>

            <div>
              <Label>E-mail *</Label>
              <Input type="email" {...register('importerEmail')} />
              {errors.importerEmail && <span className="text-sm text-destructive">{errors.importerEmail.message}</span>}
            </div>

            <div>
              <Label>País de Destino *</Label>
              <Input {...register('importerCountry')} />
              {errors.importerCountry && <span className="text-sm text-destructive">{errors.importerCountry.message}</span>}
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Termos Comerciais</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>INCOTERM *</Label>
              <Input {...register('incoterm')} placeholder="Ex: FOB, CIF, EXW" />
              {errors.incoterm && <span className="text-sm text-destructive">{errors.incoterm.message}</span>}
            </div>

            <div>
              <Label>Meio de Transporte *</Label>
              <Input {...register('modeOfTransport')} placeholder="Ex: Marítimo, Aéreo" />
              {errors.modeOfTransport && <span className="text-sm text-destructive">{errors.modeOfTransport.message}</span>}
            </div>

            <div>
              <Label>Disponibilidade *</Label>
              <Input {...register('availability')} placeholder="Ex: 30 dias" />
              {errors.availability && <span className="text-sm text-destructive">{errors.availability.message}</span>}
            </div>

            <div>
              <Label>Forma de Pagamento *</Label>
              <Input {...register('paymentMethod')} />
              {errors.paymentMethod && <span className="text-sm text-destructive">{errors.paymentMethod.message}</span>}
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Itens</h3>
          
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
                <div>
                  <Label className="text-xs">QTD</Label>
                  <Input 
                    type="number"
                    value={item.qty || ''}
                    onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Input 
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Peso (KG)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={item.weight || ''}
                    onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Preço Unit.</Label>
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
            <Plus className="mr-2 h-4 w-4" /> Adicionar Item
          </Button>

          <div className="bg-muted p-4 rounded-md">
            <div className="flex justify-between font-semibold">
              <span>Peso Total: {totalWeight.toFixed(2)} KG</span>
              <span>Subtotal: ${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-end font-bold text-lg mt-2">
              Total: ${subtotal.toFixed(2)}
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-6">Observações (Opcional)</h3>
          
          <div>
            <Label>Notas</Label>
            <Textarea 
              {...register('notes')} 
              placeholder="Adicione observações que aparecerão no rodapé da invoice (opcional)"
              rows={3}
            />
          </div>

          <h3 className="font-semibold text-lg mt-6">Aprovação do Cliente</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Cliente *</Label>
              <Input {...register('clientRepresentative')} />
              {errors.clientRepresentative && <span className="text-sm text-destructive">{errors.clientRepresentative.message}</span>}
            </div>

            <div>
              <Label>Representante da Verdetec</Label>
              <Input {...register('clientPosition')} />
            </div>

            <div>
              <Label>Cargo e Empresa do Cliente *</Label>
              <Input {...register('clientCompanyPosition')} />
              {errors.clientCompanyPosition && <span className="text-sm text-destructive">{errors.clientCompanyPosition.message}</span>}
            </div>

            <div>
              <Label>Cargo do Representante Verdetec</Label>
              <Input {...register('clientPositionTitle')} />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" /> Salvar
          </Button>
          <Button type="button" onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Visualizar Impressão
          </Button>
        </div>
      </Card>
    </form>
  );
};
