-- Add tracking number to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipped_at      TIMESTAMPTZ DEFAULT NULL;
