ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS import_duties_taxes NUMERIC;

DO $$
BEGIN
  ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_import_duties_taxes_nonnegative
  CHECK (import_duties_taxes IS NULL OR import_duties_taxes >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.invoices.import_duties_taxes IS
  'Optional import duties, taxes, and related charges shown separately on invoices.';
