import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { InvoiceForm } from '@/components/InvoiceForm';
import { InvoiceList } from '@/components/InvoiceList';
import { InvoicePrintPreview } from '@/components/InvoicePrintPreview';
import { Invoice } from '@/types/invoice';

const Index = () => {
  const [view, setView] = useState<'list' | 'form' | 'preview'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNew = () => {
    setSelectedInvoice(undefined);
    setView('form');
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setView('form');
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setView('preview');
  };

  const handleSave = () => {
    setView('list');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sistema Proforma Invoice</h1>
          {view === 'list' && (
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" /> Nova Invoice
            </Button>
          )}
          {view !== 'list' && (
            <Button variant="outline" onClick={() => setView('list')}>
              Voltar para Lista
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {view === 'list' && (
          <InvoiceList 
            onEdit={handleEdit} 
            onView={handleView}
            refresh={refreshKey}
          />
        )}
        {view === 'form' && (
          <InvoiceForm 
            invoice={selectedInvoice} 
            onSave={handleSave}
          />
        )}
        {view === 'preview' && selectedInvoice && (
          <InvoicePrintPreview 
            invoice={selectedInvoice}
            onBack={() => setView('list')}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
