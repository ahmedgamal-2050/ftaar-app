CREATE INDEX idx_menu_items_restaurant_id ON menu_items (restaurant_id);
CREATE INDEX idx_lobbies_restaurant_id ON lobbies (restaurant_id);
CREATE INDEX idx_lobbies_status ON lobbies (status);
CREATE INDEX idx_lobby_members_lobby_id ON lobby_members (lobby_id);
CREATE INDEX idx_order_items_lobby_id ON order_items (lobby_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items (menu_item_id);
CREATE INDEX idx_lobby_bill_lobby_id ON lobby_bill (lobby_id);
