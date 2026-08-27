DROP INDEX IF EXISTS idx_menu_items_category_name;
DROP INDEX IF EXISTS uq_menu_items_name_lower;

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS ck_menu_items_reference_price;
ALTER TABLE menu_items DROP COLUMN IF EXISTS category;
