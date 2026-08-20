ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_menu_restaurant
FOREIGN KEY (menu_item_id, restaurant_id)
REFERENCES menu_items (id, restaurant_id);

ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_lobby_restaurant
FOREIGN KEY (lobby_id, restaurant_id)
REFERENCES lobbies (id, restaurant_id);
