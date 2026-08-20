CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  lobby_member_id UUID NOT NULL REFERENCES lobby_members(id),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  restaurant_id UUID NOT NULL,
  qty INTEGER NOT NULL,
  actual_price BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lobby_bill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL UNIQUE REFERENCES lobbies(id) ON DELETE CASCADE,
  subtotal BIGINT NOT NULL,
  tax BIGINT NOT NULL,
  total BIGINT NOT NULL,
  payment_status payment_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
