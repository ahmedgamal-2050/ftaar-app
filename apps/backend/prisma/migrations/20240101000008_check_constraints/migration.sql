ALTER TABLE users ADD CONSTRAINT ck_user_kind CHECK (
  (kind = 'registered' AND email IS NOT NULL)
  OR (kind = 'guest' AND device_id IS NOT NULL)
);

ALTER TABLE order_items ADD CONSTRAINT ck_qty CHECK (qty >= 1);
ALTER TABLE order_items ADD CONSTRAINT ck_actual_price CHECK (actual_price >= 0);
