-- Add product attributes for woodenware / physical goods
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS material    TEXT,
  ADD COLUMN IF NOT EXISTS weight_g    INTEGER,
  ADD COLUMN IF NOT EXISTS length_cm   NUMERIC(8, 1),
  ADD COLUMN IF NOT EXISTS width_cm    NUMERIC(8, 1),
  ADD COLUMN IF NOT EXISTS height_cm   NUMERIC(8, 1),
  ADD COLUMN IF NOT EXISTS unit        TEXT NOT NULL DEFAULT 'piece' CHECK (unit IN ('piece', 'set', 'pair', 'pack')),
  ADD COLUMN IF NOT EXISTS barcode     TEXT,
  ADD COLUMN IF NOT EXISTS default_safety_stock INTEGER NOT NULL DEFAULT 5;
