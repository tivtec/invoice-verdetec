-- Create orders table to group related documents
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  base_number text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy for orders
CREATE POLICY "Allow all operations on orders" ON public.orders
  FOR ALL USING (true) WITH CHECK (true);

-- Create attachments table
CREATE TABLE public.attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Create policy for attachments
CREATE POLICY "Allow all operations on attachments" ON public.attachments
  FOR ALL USING (true) WITH CHECK (true);

-- Add order_id to invoices table
ALTER TABLE public.invoices ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;

-- Add new fields to invoices for the requested features
ALTER TABLE public.invoices ADD COLUMN show_total_weight boolean DEFAULT true;
ALTER TABLE public.invoices ADD COLUMN packing_weight numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN include_packing_weight boolean DEFAULT false;

-- Create indexes for better search performance
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_base_number ON public.orders(base_number);
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_importers_company_name ON public.importers(company_name);
CREATE INDEX idx_attachments_order_id ON public.attachments(order_id);

-- Add trigger for updated_at on orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for invoice attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-attachments', 'invoice-attachments', true);

-- Create storage policies for attachments
CREATE POLICY "Anyone can view attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoice-attachments');

CREATE POLICY "Anyone can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoice-attachments');

CREATE POLICY "Anyone can update attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'invoice-attachments')
  WITH CHECK (bucket_id = 'invoice-attachments');

CREATE POLICY "Anyone can delete attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'invoice-attachments');;
