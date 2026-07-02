CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- seed from existing hardcoded list
INSERT INTO categories (name, sort_order) VALUES
  ('Cutting Board', 1),
  ('Salad Bowl', 2),
  ('Tray', 3),
  ('Kitchen Utensils', 4),
  ('Furniture', 5),
  ('Home & Garden', 6),
  ('Electronics', 7),
  ('Clothing', 8),
  ('Food & Beverage', 9),
  ('Health & Beauty', 10),
  ('Sports & Outdoors', 11),
  ('Books & Stationery', 12),
  ('Toys & Games', 13),
  ('Automotive', 14),
  ('Other', 15);
