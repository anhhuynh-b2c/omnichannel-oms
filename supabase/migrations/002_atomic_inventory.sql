-- Atomic stock deduction: trừ tồn kho an toàn, không race condition
-- Trả về stock mới sau khi trừ, hoặc raise exception nếu không đủ hàng
CREATE OR REPLACE FUNCTION deduct_stock(
  p_product_id UUID,
  p_quantity    INT,
  p_reference   TEXT,
  p_movement    TEXT DEFAULT 'SALE'
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock INT;
BEGIN
  UPDATE inventory
  SET stock_quantity = stock_quantity - p_quantity
  WHERE product_id = p_product_id
    AND stock_quantity >= p_quantity
  RETURNING stock_quantity INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:% quantity=%', p_product_id, p_quantity;
  END IF;

  INSERT INTO inventory_movements (product_id, qty_change, movement_type, reference_id)
  VALUES (p_product_id, -p_quantity, p_movement, p_reference);

  RETURN v_new_stock;
END;
$$;

-- Atomic stock restore: cộng tồn kho (không cần điều kiện)
CREATE OR REPLACE FUNCTION restore_stock(
  p_product_id UUID,
  p_quantity    INT,
  p_reference   TEXT,
  p_movement    TEXT DEFAULT 'CANCELLATION'
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock INT;
BEGIN
  UPDATE inventory
  SET stock_quantity = stock_quantity + p_quantity
  WHERE product_id = p_product_id
  RETURNING stock_quantity INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_NOT_FOUND:%', p_product_id;
  END IF;

  INSERT INTO inventory_movements (product_id, qty_change, movement_type, reference_id)
  VALUES (p_product_id, p_quantity, p_movement, p_reference);

  RETURN v_new_stock;
END;
$$;

-- Atomic stock receive: nhận hàng từ PO
CREATE OR REPLACE FUNCTION receive_stock(
  p_product_id UUID,
  p_quantity    INT,
  p_po_id       TEXT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock INT;
BEGIN
  UPDATE inventory
  SET stock_quantity = stock_quantity + p_quantity
  WHERE product_id = p_product_id
  RETURNING stock_quantity INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_NOT_FOUND:%', p_product_id;
  END IF;

  INSERT INTO inventory_movements (product_id, qty_change, movement_type, reference_id)
  VALUES (p_product_id, p_quantity, 'PURCHASE', p_po_id);

  RETURN v_new_stock;
END;
$$;
