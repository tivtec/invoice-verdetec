import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { getInvoices, deleteInvoice } from '@/utils/invoiceStorage';
import { useToast } from '@/hooks/use-toast';
import { formatInvoiceAmount } from '@/utils/numberFormat';

interface InvoiceListProps {
  onEdit: (invoice: Invoice) => void;
  onView: (invoice: Invoice) => void;
  refresh?: number;
}

export const InvoiceList = ({ onEdit, onView, refresh }: InvoiceListProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, [refresh]);

  const loadInvoices = () => {
    const data = getInvoices();
    setInvoices(data.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice(id);
      loadInvoices();
      toast({
        title: 'Invoice deleted',
        description: 'The invoice has been successfully deleted.',
      });
    }
  };

  if (invoices.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No invoices created yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
              <p className="text-sm text-muted-foreground">
                {invoice.documentType === 'proforma' ? 'Proforma Invoice' : 
                 invoice.documentType === 'commercial' ? 'Commercial Invoice' : 
                 'Packing List'} • {invoice.importerCompanyName} • {invoice.issueDate}
              </p>
              <p className="text-sm">
                Total: {invoice.currency || 'US$'} {formatInvoiceAmount(
                  invoice.items.reduce((sum, item) => sum + item.total, 0),
                  invoice.currency || 'US$'
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => onView(invoice)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => onEdit(invoice)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={() => handleDelete(invoice.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
