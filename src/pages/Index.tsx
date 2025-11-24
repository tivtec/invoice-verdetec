import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { InvoiceForm } from '@/components/InvoiceForm';
import { CommercialInvoiceForm } from '@/components/CommercialInvoiceForm';
import { PackingListForm } from '@/components/PackingListForm';
import { InvoiceList } from '@/components/InvoiceList';
import { InvoicePrintPreview } from '@/components/InvoicePrintPreview';
import { Invoice } from '@/types/invoice';
import verdetecLogoDark from '@/assets/verdetec-logo-dark.png';

const Index = () => {
  const [view, setView] = useState<'list' | 'form' | 'commercial' | 'packing' | 'preview'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);

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

  const handleSave = (invoice: Invoice) => {
    setView('list');
    setRefreshKey(prev => prev + 1);
    // Show automation buttons only for proforma invoices
    if (invoice.documentType === 'proforma') {
      setSelectedInvoice(invoice);
      setShowDocumentOptions(true);
    }
  };

  const handleCreateCommercial = () => {
    if (selectedInvoice) {
      setView('commercial');
      setShowDocumentOptions(false);
    }
  };

  const handleCreatePacking = () => {
    if (selectedInvoice) {
      setView('packing');
      setShowDocumentOptions(false);
    }
  };

  const handleCloseOptions = () => {
    setShowDocumentOptions(false);
    setSelectedInvoice(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={verdetecLogoDark} 
              alt="Verdetec Logo" 
              className="h-10 w-auto"
              style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(14%) saturate(5682%) hue-rotate(150deg) brightness(95%) contrast(97%)' }}
            />
            <h1 className="text-2xl font-bold">SISTEMA DE INVOICE VERDETEC</h1>
          </div>
          {view === 'list' && (
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" /> New Invoice
            </Button>
          )}
          {view !== 'list' && (
            <Button variant="outline" onClick={() => setView('list')}>
              Back to List
            </Button>
          )}
        </div>
      </header>

      {/* Document automation options modal */}
      {showDocumentOptions && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border">
            <h2 className="text-2xl font-bold mb-4">Proforma Invoice Created!</h2>
            <p className="text-muted-foreground mb-6">
              Would you like to create related documents based on this proforma?
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleCreateCommercial} 
                className="w-full justify-start gap-2"
                size="lg"
              >
                <FileText className="h-5 w-5" />
                Create Commercial Invoice
              </Button>
              <Button 
                onClick={handleCreatePacking}
                variant="outline"
                className="w-full justify-start gap-2"
                size="lg"
              >
                <FileText className="h-5 w-5" />
                Create Packing List
              </Button>
              <Button 
                onClick={handleCloseOptions}
                variant="ghost"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
        {view === 'commercial' && (
          <CommercialInvoiceForm 
            invoice={selectedInvoice} 
            onSave={handleSave}
          />
        )}
        {view === 'packing' && (
          <PackingListForm 
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
