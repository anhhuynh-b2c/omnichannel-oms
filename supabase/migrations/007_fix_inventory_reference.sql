-- Fix deduct_stock / restore_stock: cast text reference to uuid before insert
CREATE OR REPLACE FUNCTION deduct_stock(
  p_product_id UUID,
  p_quantity   INT,
  p_reference  TEXT,
  p_movement   TEXT DEFAULT 'SALE'
) RETURNS INT AS $$
DECLARE
  v_new_stock INT;
BEGIN
  UPDATE inventory
     SET stock_quantity = stock_quantity - p_quantity,
         updated_at     = NOW()
   WHERE product_id = p_product_id
     AND stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK';
  END IF;

  SELECT stock_quantity INTO v_new_stock FROM inventory WHERE product_id = p_product_id;

  INSERT INTO inventory_movements (product_id, qty_change, movement_type, reference_id)
  VALUES (p_product_id, -p_quantity, p_movement, p_reference::uuid);

  RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restore_stock(
  p_product_id UUID,
  p_quantity   INT,
  p_reference  TEXT,
  p_movement   TEXT DEFAULT 'CANCELLATION'
) RETURNS INT AS $$
DECLARE
  v_new_stock INT;
BEGIN
  UPDATE inventory
     SET stock_quantity = stock_quantity + p_quantity,
         updated_at     = NOW()
   WHERE product_id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_NOT_FOUND';
  END IF;

  SELECT stock_quantity INTO v_new_stock FROM inventory WHERE product_id = p_product_id;

  INSERT INTO inventory_movements (product_id, qty_change, movement_type, reference_id)
  VALUES (p_product_id, p_quantity, p_movement, p_reference::uuid);

  RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql;
