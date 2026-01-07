-- Add exporter_address_key to invoices for insumos branches
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS exporter_address_key text;
