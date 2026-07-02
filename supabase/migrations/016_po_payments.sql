-- ─── PO Payment records ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  amount              NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  method              TEXT NOT NULL DEFAULT 'bank_transfer'
                        CHECK (method IN ('cash', 'bank_transfer', 'check', 'other')),
  reference_number    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_payments_po ON po_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_date ON po_payments(payment_date);

ALTER TABLE po_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read all" ON po_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write"          ON po_payments FOR ALL    TO service_role  USING (true);
CREATE POLICY "Authenticated insert"   ON po_payments FOR INSERT TO authenticated WITH CHECK (true);
