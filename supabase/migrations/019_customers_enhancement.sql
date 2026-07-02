-- ─── Enhance customers table ─────────────────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_group TEXT NOT NULL DEFAULT 'REGULAR'
    CHECK (customer_group IN ('VIP', 'LOYAL', 'REGULAR')),
  ADD COLUMN IF NOT EXISTS source_channel TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT,
  ADD COLUMN IF NOT EXISTS district       TEXT,
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- Ensure phone is unique (non-null phones)
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique
  ON customers (phone)
  WHERE phone IS NOT NULL AND phone != '';

-- auto-update updated_at
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
