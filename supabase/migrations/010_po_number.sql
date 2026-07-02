ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS po_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number) WHERE po_number IS NOT NULL;
