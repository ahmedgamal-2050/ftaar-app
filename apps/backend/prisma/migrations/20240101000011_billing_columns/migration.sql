ALTER TABLE order_items ALTER COLUMN actual_price DROP NOT NULL;
ALTER TABLE order_items DROP CONSTRAINT ck_actual_price;
ALTER TABLE order_items ADD CONSTRAINT ck_actual_price CHECK (
  actual_price IS NULL OR actual_price >= 0
);
ALTER TABLE order_items ADD COLUMN delivered BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE lobby_members ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'unpaid';

ALTER TABLE lobby_bill ADD COLUMN delivery_fee BIGINT NOT NULL DEFAULT 0;
ALTER TABLE lobby_bill ADD COLUMN service_fee BIGINT NOT NULL DEFAULT 0;
ALTER TABLE lobby_bill ADD COLUMN discount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE lobby_bill ADD COLUMN receipt_total BIGINT;
ALTER TABLE lobby_bill ADD COLUMN idempotency_key VARCHAR(128);
ALTER TABLE lobby_bill ADD CONSTRAINT uq_lobby_bill_idempotency_key UNIQUE (idempotency_key);
ALTER TABLE lobby_bill ADD CONSTRAINT ck_lobby_bill_discount CHECK (discount >= 0);
ALTER TABLE lobby_bill ADD CONSTRAINT ck_lobby_bill_delivery_fee CHECK (delivery_fee >= 0);
ALTER TABLE lobby_bill ADD CONSTRAINT ck_lobby_bill_service_fee CHECK (service_fee >= 0);
