-- Add missing fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS notes           TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_fee    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method  TEXT         DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH','TRANSFER','CARD','COD','MIXED'));

-- Make customer_id nullable (walk-in / anonymous customers)
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

-- Fix order_items: rename price → unit_price for clarity, add subtotal default
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill unit_price from existing price column
UPDATE order_items SET unit_price = price WHERE unit_price = 0 AND price > 0;

-- Update subtotal default
ALTER TABLE order_items ALTER COLUMN subtotal SET DEFAULT 0;
