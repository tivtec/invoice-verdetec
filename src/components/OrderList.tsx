import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FileText, Paperclip, Trash2 } from 'lucide-react';
import { Order, Attachment } from '@/types/order';
import { Invoice } from '@/types/invoice';
import { getAttachmentUrl, deleteAttachment } from '@/utils/supabaseStorage';
import { useToast } from '@/hooks/use-toast';

interface OrderWithDetails extends Order {
  invoices: Invoice[];
  attachments: Attachment[];
}

interface OrderListProps {
  orders: OrderWithDetails[];
  onSelectInvoice: (invoice: Invoice) => void;
  onRefresh: () => void;
}

export const OrderList = ({ orders, onSelectInvoice, onRefresh }: OrderListProps) => {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await deleteAttachment(attachment.id, attachment.file_path);
      toast({
        title: 'Success',
        description: 'Attachment deleted successfully.',
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete attachment.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.id);
        
        return (
          <Card key={order.id} className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleOrder(order.id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <h3 className="font-semibold text-lg">{order.order_number}</h3>
                <span className="text-sm text-muted-foreground">
                  ({order.invoices.length} document{order.invoices.length !== 1 ? 's' : ''})
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-2 pl-7">
                {order.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-md hover:bg-muted/80 cursor-pointer"
                    onClick={() => onSelectInvoice(invoice)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.documentType.toUpperCase()} - {invoice.importerCompanyName}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{invoice.issueDate}</span>
                  </div>
                ))}

                {order.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{attachment.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(attachment.file_size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(getAttachmentUrl(attachment.file_path), '_blank')}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteAttachment(attachment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
