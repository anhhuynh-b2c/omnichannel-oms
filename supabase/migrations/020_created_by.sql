-- Add created_by_name to orders and purchase_orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;
