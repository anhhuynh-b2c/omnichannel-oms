-- ─── Product Sync Log ────────────────────────────────────────────────────────
-- Tracks every dedup decision made during platform sync or CSV import.
-- Provides an audit trail so admins can review and correct automated matches.

CREATE TABLE product_sync_log (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id         UUID        NOT NULL REFERENCES channels(id),
  channel_sku        TEXT        NOT NULL,
  -- Name/category from the incoming platform data — needed to re-run fuzzy match
  incoming_name      TEXT        NOT NULL DEFAULT '',
  incoming_category  TEXT,
  matched_product_id UUID        REFERENCES products(id) ON DELETE SET NULL,
  outcome            TEXT        NOT NULL CHECK (outcome IN ('MATCH_EXACT', 'MATCH_FUZZY', 'NO_MATCH')),
  -- Which strategy produced the match (NULL for NO_MATCH and unresolved MATCH_FUZZY rows)
  strategy           TEXT        CHECK (strategy IN ('CHANNEL_SKU_MAPPING', 'BARCODE', 'NORMALIZED_SKU', 'NAME_CATEGORY')),
  -- NULL = automated / pending, non-NULL = staff member who confirmed/chose
  resolved_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Pending fuzzy matches queue (the review page queries this)
CREATE INDEX product_sync_log_pending_idx
  ON product_sync_log (outcome, resolved_at, created_at DESC)
  WHERE outcome = 'MATCH_FUZZY';

CREATE INDEX product_sync_log_channel_idx ON product_sync_log (channel_id, created_at DESC);

-- ─── Unique constraint on channel_sku_mapping ─────────────────────────────────
-- Guard against the upsert target already existing without the constraint.
-- (Migration 001 may have created this without the constraint name; add it safely.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'channel_sku_mapping_channel_id_channel_sku_key'
  ) THEN
    ALTER TABLE channel_sku_mapping
      ADD CONSTRAINT channel_sku_mapping_channel_id_channel_sku_key
      UNIQUE (channel_id, channel_sku);
  END IF;
END;
$$;
