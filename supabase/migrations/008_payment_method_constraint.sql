ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN (
    'CASH', 'TRANSFER', 'CARD', 'COD', 'MIXED',
    'SHOPEE_PAY', 'SHOPEE_COD',
    'TIKTOK_PAY', 'TIKTOK_COD',
    'LAZADA_PAY', 'LAZADA_COD'
  ));
