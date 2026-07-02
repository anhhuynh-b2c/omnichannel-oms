-- VAT rate cho cả 2 loại order (percent, e.g. 10.00 = 10%)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
