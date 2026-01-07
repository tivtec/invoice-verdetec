export interface Order {
  id: string;
  order_number: string;
  base_number: string;
  order_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  order_id: string;
  invoice_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface OrderWithDocuments extends Order {
  invoices: any[];
  attachments: Attachment[];
}
