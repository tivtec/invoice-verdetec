import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FileText, Paperclip, Trash2, Plus, Upload } from 'lucide-react';
import { Order, Attachment } from '@/types/order';
import { Invoice } from '@/types/invoice';
import { getAttachmentUrl, deleteAttachment, deleteOrder, deleteInvoice } from '@/utils/supabaseStorage';
import { useToast } from '@/hooks/use-toast';
import { AttachmentUpload } from './AttachmentUpload';

interface OrderWithDetails extends Order {
  invoices: Invoice[];
  attachments: Attachment[];
}

interface OrderListProps {
  orders: OrderWithDetails[];
  onSelectInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onRefresh: () => void;
  onCreateProforma?: (orderId: string) => void;
  onCreateCommercial?: (orderId: string, sourceInvoice?: Invoice) => void;
  onCreatePacking?: (orderId: string, sourceInvoice?: Invoice) => void;
  expandOrderId?: string;
}

export const OrderList = ({ orders, onSelectInvoice, onEditInvoice, onRefresh, onCreateProforma, onCreateCommercial, onCreatePacking, expandOrderId }: OrderListProps) => {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState<string | null>(null);
  const { toast } = useToast();

  // auto expand newly created order when passed in
  if (expandOrderId && !expandedOrders.has(expandOrderId)) {
    const newExpanded = new Set(expandedOrders);
    newExpanded.add(expandOrderId);
    setExpandedOrders(newExpanded);
  }

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

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete ${invoice.invoiceNumber}?`)) return;

    try {
      await deleteInvoice(invoice.id);
      toast({
        title: 'Invoice deleted',
        description: `${invoice.invoiceNumber} removed successfully.`,
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invoice.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOrder = async (order: OrderWithDetails) => {
    if (order.invoices.length > 0 || order.attachments.length > 0) {
      toast({
        title: 'Cannot delete order',
        description: 'Order must be empty to be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${order.order_number}?`)) return;

    try {
      await deleteOrder(order.id);
      toast({
        title: 'Success',
        description: 'Order deleted successfully.',
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete order.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.id);
        const isEmpty = order.invoices.length === 0 && order.attachments.length === 0;
        
        return (
          <Card key={order.id} className="p-4">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-2 flex-1 cursor-pointer"
                onClick={() => toggleOrder(order.id)}
              >
                {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <h3 className="font-semibold text-lg">{order.order_number}</h3>
                <span className="text-sm text-muted-foreground">
                  ({order.invoices.length} document{order.invoices.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                {isEmpty && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOrder(order);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-3 pl-7">
                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateProforma?.(order.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Proforma Invoice
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateCommercial?.(order.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Commercial Invoice
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreatePacking?.(order.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Packing List
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUpload(showUpload === order.id ? null : order.id)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                {/* Upload area */}
                {showUpload === order.id && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <AttachmentUpload
                      orderId={order.id}
                      onUploadComplete={() => {
                        setShowUpload(null);
                        onRefresh();
                      }}
                    />
                  </div>
                )}

                {/* Documents list */}
                {order.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.documentType.toUpperCase()} - {invoice.importerCompanyName}
                        </p>
                        {invoice.includePackingWeight && (invoice.totalPackingWeight || invoice.packingWeight) ? (
                          <p className="text-sm text-muted-foreground">
                            Packing Weight: {(invoice.totalPackingWeight || invoice.packingWeight || 0).toFixed(2)} KG
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground mr-2">{invoice.issueDate}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditInvoice(invoice);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInvoice(invoice);
                        }}
                      >
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInvoice(invoice);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
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
