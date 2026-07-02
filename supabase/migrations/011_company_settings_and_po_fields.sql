-- Company settings (single-row table)
CREATE TABLE IF NOT EXISTS company_settings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'My Retail Brand',
  slogan       TEXT,
  tax_id       TEXT,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  city         TEXT,
  website      TEXT,
  logo_url     TEXT,
  currency     TEXT NOT NULL DEFAULT 'VND',
  timezone     TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if empty
INSERT INTO company_settings (company_name, tax_id, email, phone, address, city, currency, timezone)
SELECT 'My Retail Brand', '0123456789', 'info@myretail.vn', '+84 28 1234 5678', '123 Nguyen Hue, Quan 1', 'TP. Ho Chi Minh', 'VND', 'Asia/Ho_Chi_Minh'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write"      ON company_settings FOR ALL   TO service_role  USING (true);

-- Additional fields on purchase_orders for full PO document
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS requisitioner    TEXT,
  ADD COLUMN IF NOT EXISTS shipped_via      TEXT,
  ADD COLUMN IF NOT EXISTS fob_point        TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms    TEXT,
  ADD COLUMN IF NOT EXISTS ship_to_name     TEXT,
  ADD COLUMN IF NOT EXISTS ship_to_address  TEXT;
