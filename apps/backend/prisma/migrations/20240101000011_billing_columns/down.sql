ALTER TABLE lobby_bill DROP CONSTRAINT IF EXISTS ck_lobby_bill_service_fee;
ALTER TABLE lobby_bill DROP CONSTRAINT IF EXISTS ck_lobby_bill_delivery_fee;
ALTER TABLE lobby_bill DROP CONSTRAINT IF EXISTS ck_lobby_bill_discount;
ALTER TABLE lobby_bill DROP CONSTRAINT IF EXISTS uq_lobby_bill_idempotency_key;
ALTER TABLE lobby_bill DROP COLUMN IF EXISTS idempotency_key;
ALTER TABLE lobby_bill DROP COLUMN IF EXISTS receipt_total;
ALTER TABLE lobby_bill DROP COLUMN IF EXISTS discount;
ALTER TABLE lobby_bill DROP COLUMN IF EXISTS service_fee;
ALTER TABLE lobby_bill DROP COLUMN IF EXISTS delivery_fee;

ALTER TABLE lobby_members DROP COLUMN IF EXISTS payment_status;

ALTER TABLE order_items DROP COLUMN IF EXISTS delivered;
UPDATE order_items SET actual_price = 0 WHERE actual_price IS NULL;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS ck_actual_price;
ALTER TABLE order_items ALTER COLUMN actual_price SET NOT NULL;
ALTER TABLE order_items ADD CONSTRAINT ck_actual_price CHECK (actual_price >= 0);
