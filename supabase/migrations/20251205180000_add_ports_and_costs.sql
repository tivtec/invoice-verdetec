-- Add port/place and cost fields to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS port_of_loading TEXT,
ADD COLUMN IF NOT EXISTS port_of_discharge TEXT,
ADD COLUMN IF NOT EXISTS place_of_delivery TEXT,
ADD COLUMN IF NOT EXISTS place_of_destination TEXT,
ADD COLUMN IF NOT EXISTS freight_cost NUMERIC,
ADD COLUMN IF NOT EXISTS insurance_cost NUMERIC;
