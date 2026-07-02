-- Add external_order_id to orders for marketplace traceability
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_external_id ON orders(external_order_id) WHERE external_order_id IS NOT NULL;
