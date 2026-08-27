ALTER TABLE menu_items
  ADD COLUMN category VARCHAR(120) NOT NULL DEFAULT '';

UPDATE menu_items SET reference_price = 0 WHERE reference_price < 0;

ALTER TABLE menu_items
  ADD CONSTRAINT ck_menu_items_reference_price CHECK (reference_price >= 0);

CREATE UNIQUE INDEX uq_menu_items_name_lower
  ON menu_items (restaurant_id, lower(name));

CREATE INDEX idx_menu_items_category_name
  ON menu_items (restaurant_id, category, name);
