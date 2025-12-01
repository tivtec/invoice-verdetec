import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Package } from 'lucide-react';
import { InvoiceForm } from '@/components/InvoiceForm';
import { CommercialInvoiceForm } from '@/components/CommercialInvoiceForm';
import { PackingListForm } from '@/components/PackingListForm';
import { OrderList } from '@/components/OrderList';
import { InvoicePrintPreview } from '@/components/InvoicePrintPreview';
import { SearchBar } from '@/components/SearchBar';
import { Invoice } from '@/types/invoice';
import { getInvoices } from '@/utils/supabaseStorage';
import verdetecLogoDark from '@/assets/verdetec-logo-dark.png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from '@/components/ui/card';

const Index = () => {
  const [view, setView] = useState<'list' | 'form' | 'commercial' | 'packing' | 'preview'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState<'commercial' | 'packing' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNew = () => {
    setSelectedInvoice(undefined);
    setView('form');
  };

  const handleNewCommercial = () => {
    setShowSourceSelector('commercial');
  };

  const handleNewPacking = () => {
    setShowSourceSelector('packing');
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    if (invoice.documentType === 'proforma') {
      setView('form');
    } else if (invoice.documentType === 'commercial') {
      setView('commercial');
    } else {
      setView('packing');
    }
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

  const handleSelectSource = (sourceInvoice: Invoice) => {
    setSelectedInvoice(sourceInvoice);
    if (showSourceSelector === 'commercial') {
      setView('commercial');
    } else if (showSourceSelector === 'packing') {
      setView('packing');
    }
    setShowSourceSelector(null);
  };

  const handleCreateFromScratch = () => {
    setSelectedInvoice(undefined);
    if (showSourceSelector === 'commercial') {
      setView('commercial');
    } else if (showSourceSelector === 'packing') {
      setView('packing');
    }
    setShowSourceSelector(null);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setRefreshKey(prev => prev + 1);
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
            <div className="flex gap-2">
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" /> Criar Proforma Invoice
              </Button>
              <Button onClick={handleNewCommercial} variant="outline">
                <FileText className="mr-2 h-4 w-4" /> Criar Commercial Invoice
              </Button>
              <Button onClick={handleNewPacking} variant="outline">
                <Package className="mr-2 h-4 w-4" /> Criar Packing List
              </Button>
            </div>
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
                <Package className="h-5 w-5" />
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

      {/* Source selector modal */}
      <Dialog open={!!showSourceSelector} onOpenChange={() => setShowSourceSelector(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showSourceSelector === 'commercial' 
                ? 'Criar Commercial Invoice' 
                : 'Criar Packing List'}
            </DialogTitle>
            <DialogDescription>
              {showSourceSelector === 'commercial'
                ? 'Selecione uma Proforma Invoice existente para criar uma Commercial Invoice com os mesmos dados, ou crie do zero.'
                : 'Selecione uma Commercial Invoice existente para criar uma Packing List com os mesmos dados.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {showSourceSelector === 'commercial' && (
              <Button 
                onClick={handleCreateFromScratch}
                variant="outline"
                className="w-full"
              >
                Criar do zero
              </Button>
            )}
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">
                {showSourceSelector === 'commercial' 
                  ? 'Ou selecione uma Proforma Invoice:' 
                  : 'Selecione uma Commercial Invoice:'}
              </h4>
              {/* This will need to be updated to use Supabase queries */}
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-8">
        {view === 'list' && (
          <>
            <div className="mb-6">
              <SearchBar onSearch={handleSearch} />
            </div>
            <OrderList 
              onEdit={handleEdit} 
              onView={handleView}
              refresh={refreshKey}
              searchQuery={searchQuery}
            />
          </>
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
