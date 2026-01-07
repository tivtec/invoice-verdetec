-- Add order_note to orders for custom per-order observations
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_note text;
