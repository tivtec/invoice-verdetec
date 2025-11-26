-- Create enums for document and company types
CREATE TYPE public.document_type AS ENUM ('proforma', 'commercial', 'packing');
CREATE TYPE public.company_type AS ENUM ('equipamentos', 'insumos');

-- Create importers table
CREATE TABLE public.importers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  address TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  document_type document_type NOT NULL,
  company_type company_type NOT NULL,
  issue_date DATE NOT NULL,
  place_of_issue TEXT NOT NULL,
  importer_id UUID NOT NULL REFERENCES public.importers(id) ON DELETE RESTRICT,
  incoterm TEXT NOT NULL,
  mode_of_transport TEXT NOT NULL,
  availability TEXT,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  client_representative TEXT NOT NULL,
  client_company_position TEXT NOT NULL,
  client_position TEXT NOT NULL,
  client_position_title TEXT NOT NULL,
  notes TEXT,
  source_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  hs_code TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  description TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  volume NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_invoices_importer_id ON public.invoices(importer_id);
CREATE INDEX idx_invoices_source_invoice_id ON public.invoices(source_invoice_id);
CREATE INDEX idx_invoices_document_type ON public.invoices(document_type);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Enable Row Level Security (permissive policies for now since there's no auth)
ALTER TABLE public.importers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all operations for now)
CREATE POLICY "Allow all operations on importers" ON public.importers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_importers_updated_at
  BEFORE UPDATE ON public.importers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();