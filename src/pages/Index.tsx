import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Package } from 'lucide-react';
import { InvoiceForm } from '@/components/InvoiceForm';
import { CommercialInvoiceForm } from '@/components/CommercialInvoiceForm';
import { PackingListForm } from '@/components/PackingListForm';
import { OrderList } from '@/components/OrderList';
import { InvoicePrintPreview } from '@/components/InvoicePrintPreview';
import { SearchBar } from '@/components/SearchBar';
import { Invoice } from '@/types/invoice';
import { getOrders, getInvoicesByOrderId, getAttachmentsByOrderId, searchInvoices } from '@/utils/supabaseStorage';
import { Order } from '@/types/order';
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
  const [ordersWithDetails, setOrdersWithDetails] = useState<any[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | undefined>();
  const [availableSourceInvoices, setAvailableSourceInvoices] = useState<Invoice[]>([]);

  const handleNew = () => {
    setSelectedInvoice(undefined);
    setView('form');
  };

  const handleNewCommercial = () => {
    setCurrentOrderId(undefined);
    setAvailableSourceInvoices([]);
    setShowSourceSelector('commercial');
  };

  const handleNewPacking = () => {
    setCurrentOrderId(undefined);
    setAvailableSourceInvoices([]);
    setShowSourceSelector('packing');
  };

  const handleCreateCommercialInOrder = async (orderId: string, sourceInvoice?: Invoice) => {
    setCurrentOrderId(orderId);
    if (sourceInvoice) {
      setSelectedInvoice(sourceInvoice);
      setView('commercial');
    } else {
      // Load available proforma invoices from this order
      const invoices = await getInvoicesByOrderId(orderId);
      const proformas = invoices.filter(inv => inv.documentType === 'proforma');
      setAvailableSourceInvoices(proformas);
      setShowSourceSelector('commercial');
    }
  };

  const handleCreatePackingInOrder = async (orderId: string, sourceInvoice?: Invoice) => {
    setCurrentOrderId(orderId);
    if (sourceInvoice) {
      setSelectedInvoice(sourceInvoice);
      setView('packing');
    } else {
      // Load available commercial invoices from this order
      const invoices = await getInvoicesByOrderId(orderId);
      const commercials = invoices.filter(inv => inv.documentType === 'commercial');
      const proformas = invoices.filter(inv => inv.documentType === 'proforma');
      setAvailableSourceInvoices([...commercials, ...proformas]);
      setShowSourceSelector('packing');
    }
  };

  const handleCreateProformaInOrder = (orderId: string) => {
    setCurrentOrderId(orderId);
    setSelectedInvoice(undefined);
    setView('form');
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

  const handleSave = (invoice: Invoice, orderId?: string) => {
    setView('list');
    setRefreshKey(prev => prev + 1);
    setCurrentOrderId(undefined);
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
    setCurrentOrderId(undefined);
  };

  const handleSelectSource = (sourceInvoice: Invoice) => {
    setSelectedInvoice(sourceInvoice);
    setCurrentOrderId(undefined); // Reset when selecting from global list
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

  useEffect(() => {
    const loadOrders = async () => {
      try {
        if (searchQuery.trim()) {
          const invoices = await searchInvoices(searchQuery);
          // Group invoices by order
          const orderMap = new Map();
          for (const invoice of invoices) {
            // You would need to fetch order details here
            // This is a simplified version
          }
          // For now, just show invoices without proper grouping when searching
          setOrdersWithDetails([]);
        } else {
          const orders = await getOrders();
          const ordersWithData = await Promise.all(
            orders.map(async (order) => {
              const invoices = await getInvoicesByOrderId(order.id);
              const attachments = await getAttachmentsByOrderId(order.id);
              return {
                ...order,
                invoices,
                attachments,
              };
            })
          );
          setOrdersWithDetails(ordersWithData);
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      }
    };

    loadOrders();
  }, [refreshKey, searchQuery]);

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
            
            {availableSourceInvoices.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  {showSourceSelector === 'commercial' 
                    ? 'Ou selecione uma Proforma Invoice:' 
                    : 'Selecione um documento fonte:'}
                </h4>
                {availableSourceInvoices.map((invoice) => (
                  <Card 
                    key={invoice.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectSource(invoice)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.documentType.toUpperCase()} - {invoice.importerCompanyName}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">{invoice.issueDate}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-8">
        {view === 'list' && (
          <>
            <div className="mb-6">
              <SearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by invoice number or company name..."
              />
            </div>
            <OrderList 
              orders={ordersWithDetails}
              onSelectInvoice={handleView}
              onEditInvoice={handleEdit}
              onRefresh={() => setRefreshKey(prev => prev + 1)}
              onCreateProforma={handleCreateProformaInOrder}
              onCreateCommercial={handleCreateCommercialInOrder}
              onCreatePacking={handleCreatePackingInOrder}
            />
          </>
        )}
        {view === 'form' && (
          <InvoiceForm 
            invoice={selectedInvoice} 
            onSave={handleSave}
            orderId={currentOrderId}
          />
        )}
        {view === 'commercial' && (
          <CommercialInvoiceForm 
            invoice={selectedInvoice} 
            onSave={handleSave}
            orderId={currentOrderId}
          />
        )}
        {view === 'packing' && (
          <PackingListForm 
            invoice={selectedInvoice} 
            onSave={handleSave}
            orderId={currentOrderId}
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
