ALTER TABLE lobbies
  ADD COLUMN max_members INTEGER,
  ADD COLUMN expires_at TIMESTAMPTZ,
  ADD COLUMN insta_pay_handle VARCHAR(100);

ALTER TABLE lobbies
  ADD CONSTRAINT ck_lobbies_max_members
  CHECK (max_members IS NULL OR max_members > 1);

CREATE UNIQUE INDEX uq_lobby_members_lobby_user
  ON lobby_members (lobby_id, user_id);
