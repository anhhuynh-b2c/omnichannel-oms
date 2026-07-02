CREATE TABLE role_permissions (
  role_name TEXT NOT NULL,
  route     TEXT NOT NULL,
  PRIMARY KEY (role_name, route)
);

-- Seed from current permission matrix
INSERT INTO role_permissions (role_name, route) VALUES
  ('ADMIN',           '/'),
  ('ADMIN',           '/products'),
  ('ADMIN',           '/categories'),
  ('ADMIN',           '/inventory'),
  ('ADMIN',           '/customers'),
  ('ADMIN',           '/orders'),
  ('ADMIN',           '/sale'),
  ('ADMIN',           '/purchase-orders'),
  ('ADMIN',           '/suppliers'),
  ('ADMIN',           '/reports'),
  ('ADMIN',           '/accountant'),
  ('ADMIN',           '/integrations'),
  ('ADMIN',           '/audit-logs'),
  ('ADMIN',           '/settings'),

  ('WAREHOUSE_STAFF', '/'),
  ('WAREHOUSE_STAFF', '/products'),
  ('WAREHOUSE_STAFF', '/inventory'),
  ('WAREHOUSE_STAFF', '/orders'),
  ('WAREHOUSE_STAFF', '/purchase-orders'),
  ('WAREHOUSE_STAFF', '/suppliers'),

  ('SALES_STAFF',     '/'),
  ('SALES_STAFF',     '/products'),
  ('SALES_STAFF',     '/customers'),
  ('SALES_STAFF',     '/orders'),
  ('SALES_STAFF',     '/sale'),
  ('SALES_STAFF',     '/reports'),

  ('ACCOUNTANT',      '/'),
  ('ACCOUNTANT',      '/orders'),
  ('ACCOUNTANT',      '/purchase-orders'),
  ('ACCOUNTANT',      '/reports'),
  ('ACCOUNTANT',      '/accountant');

-- Authenticated users can read permissions (needed by middleware via anon key)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write" ON role_permissions FOR ALL TO service_role USING (true);
