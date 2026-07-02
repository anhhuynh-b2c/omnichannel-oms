-- ─── Packaging Materials ─────────────────────────────────────────────────────
CREATE TABLE packaging_materials (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  sku              TEXT NOT NULL UNIQUE,
  unit             TEXT NOT NULL DEFAULT 'cái',
  stock_quantity   INT NOT NULL DEFAULT 0,
  reorder_point    INT NOT NULL DEFAULT 20,
  safety_stock     INT NOT NULL DEFAULT 50,
  stock_status     TEXT NOT NULL DEFAULT 'IN_STOCK'
    CHECK (stock_status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER packaging_materials_updated_at
  BEFORE UPDATE ON packaging_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION recalculate_material_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity <= 0 THEN
    NEW.stock_status = 'OUT_OF_STOCK';
  ELSIF NEW.stock_quantity <= NEW.reorder_point THEN
    NEW.stock_status = 'LOW_STOCK';
  ELSE
    NEW.stock_status = 'IN_STOCK';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER material_status_trigger
  BEFORE INSERT OR UPDATE ON packaging_materials
  FOR EACH ROW EXECUTE FUNCTION recalculate_material_status();

-- ─── Material Movements ───────────────────────────────────────────────────────
CREATE TABLE packaging_material_movements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES packaging_materials(id) ON DELETE CASCADE,
  qty_change  INT NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('ADJUSTMENT', 'FULFILLMENT', 'PURCHASE', 'RETURN')),
  reference   TEXT,
  note        TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Product Packaging BOM ────────────────────────────────────────────────────
-- Each product can have multiple packaging rules per quantity range
CREATE TABLE product_packaging_bom (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES packaging_materials(id) ON DELETE CASCADE,
  qty_per_unit    INT NOT NULL DEFAULT 1,
  min_order_qty   INT NOT NULL DEFAULT 1,
  max_order_qty   INT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, material_id, min_order_qty)
);

CREATE TRIGGER product_packaging_bom_updated_at
  BEFORE UPDATE ON product_packaging_bom
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE packaging_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_packaging_bom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_packaging_materials" ON packaging_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_material_movements" ON packaging_material_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_product_packaging_bom" ON product_packaging_bom
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
