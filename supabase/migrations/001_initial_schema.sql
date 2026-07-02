-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Roles ───────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('ADMIN'), ('WAREHOUSE_STAFF'), ('SALES_STAFF');

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  role_id    UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  master_sku  TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Inventory ────────────────────────────────────────────────────────────────
CREATE TABLE inventory (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity   INT NOT NULL DEFAULT 0,
  reorder_point    INT NOT NULL DEFAULT 10,
  safety_stock     INT NOT NULL DEFAULT 20,
  inventory_status TEXT NOT NULL DEFAULT 'IN_STOCK'
    CHECK (inventory_status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- auto-recalculate inventory_status
CREATE OR REPLACE FUNCTION recalculate_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity = 0 THEN
    NEW.inventory_status = 'OUT_OF_STOCK';
  ELSIF NEW.stock_quantity <= NEW.reorder_point THEN
    NEW.inventory_status = 'LOW_STOCK';
  ELSE
    NEW.inventory_status = 'IN_STOCK';
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_status_trigger
  BEFORE INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION recalculate_inventory_status();

-- ─── Channels ─────────────────────────────────────────────────────────────────
CREATE TABLE channels (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name   TEXT NOT NULL UNIQUE,
  icon   TEXT,
  status TEXT NOT NULL DEFAULT 'DISCONNECTED'
    CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'ERROR'))
);

INSERT INTO channels (name, icon, status) VALUES
  ('Shopee',      '/channels/shopee.svg', 'DISCONNECTED'),
  ('TikTok Shop', '/channels/tiktok.svg', 'DISCONNECTED'),
  ('Lazada',      '/channels/lazada.svg', 'DISCONNECTED'),
  ('Facebook',    '/channels/facebook.svg', 'DISCONNECTED'),
  ('Instagram',   '/channels/instagram.svg', 'DISCONNECTED'),
  ('Website',     '🌐', 'DISCONNECTED');

-- ─── Channel SKU Mapping ──────────────────────────────────────────────────────
CREATE TABLE channel_sku_mapping (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  channel_sku TEXT NOT NULL,
  UNIQUE(channel_id, channel_sku)
);

-- ─── Customers ────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name    TEXT NOT NULL,
  phone   TEXT,
  email   TEXT,
  address TEXT
);

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id   UUID NOT NULL REFERENCES channels(id),
  customer_id  UUID NOT NULL REFERENCES customers(id),
  order_number TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','CONFIRMED','PACKING','READY_TO_SHIP','SHIPPED','DELIVERED','CANCELLED','RETURNED','REFUNDED')),
  order_date   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Order Items ──────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity   INT NOT NULL DEFAULT 1,
  price      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal   NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- ─── Suppliers ────────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_name TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Purchase Orders ──────────────────────────────────────────────────────────
CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  expected_date DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING','APPROVED','RECEIVED','CANCELLED')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Purchase Order Items ─────────────────────────────────────────────────────
CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity          INT NOT NULL DEFAULT 1,
  cost              NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- ─── Inventory Movements ──────────────────────────────────────────────────────
CREATE TABLE inventory_movements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id),
  qty_change    INT NOT NULL,
  movement_type TEXT NOT NULL
    CHECK (movement_type IN ('SALE','PURCHASE','RETURN','ADJUSTMENT','CANCELLATION')),
  reference_id  UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Returns ──────────────────────────────────────────────────────────────────
CREATE TABLE returns (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id),
  reason     TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Integrations ─────────────────────────────────────────────────────────────
CREATE TABLE integrations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id  UUID NOT NULL UNIQUE REFERENCES channels(id),
  api_key     TEXT,
  secret_key  TEXT,
  webhook_url TEXT,
  status      TEXT NOT NULL DEFAULT 'DISCONNECTED'
    CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'ERROR'))
);

-- seed integrations rows for all channels
INSERT INTO integrations (channel_id, status)
SELECT id, 'DISCONNECTED' FROM channels;

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_products_status       ON products(status);
CREATE INDEX idx_products_category     ON products(category);
CREATE INDEX idx_inventory_product     ON inventory(product_id);
CREATE INDEX idx_inventory_status      ON inventory(inventory_status);
CREATE INDEX idx_orders_status         ON orders(status);
CREATE INDEX idx_orders_channel        ON orders(channel_id);
CREATE INDEX idx_orders_customer       ON orders(customer_id);
CREATE INDEX idx_orders_date           ON orders(order_date);
CREATE INDEX idx_order_items_order     ON order_items(order_id);
CREATE INDEX idx_order_items_product   ON order_items(product_id);
CREATE INDEX idx_inv_mov_product       ON inventory_movements(product_id);
CREATE INDEX idx_inv_mov_type          ON inventory_movements(movement_type);
CREATE INDEX idx_audit_entity          ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user            ON audit_logs(user_id);
CREATE INDEX idx_po_status             ON purchase_orders(status);
CREATE INDEX idx_po_supplier           ON purchase_orders(supplier_id);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels     ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all (UI handles role visibility)
CREATE POLICY "Authenticated read all" ON products     FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON inventory    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON orders       FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON order_items  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON customers    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON suppliers    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON channels     FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON integrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON purchase_orders      FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON inventory_movements  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON audit_logs           FOR SELECT TO authenticated USING (true);

-- Write policies (admin / service role)
CREATE POLICY "Service write" ON products     FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON inventory    FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON orders       FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON order_items  FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON customers    FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON suppliers    FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON channels     FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON integrations FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON purchase_orders      FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON purchase_order_items FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON inventory_movements  FOR ALL TO service_role USING (true);
CREATE POLICY "Service write" ON audit_logs           FOR ALL TO service_role USING (true);
