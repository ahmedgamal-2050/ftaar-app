CREATE TABLE lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  code VARCHAR(32) NOT NULL,
  status lobby_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_lobbies_code ON lobbies (code);
CREATE UNIQUE INDEX uq_lobbies_id_restaurant ON lobbies (id, restaurant_id);

CREATE TABLE lobby_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role member_role NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
