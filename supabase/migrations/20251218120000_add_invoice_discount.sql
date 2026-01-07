-- Add discount support to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS apply_discount BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
