DROP INDEX IF EXISTS uq_lobby_members_lobby_user;

ALTER TABLE lobbies
  DROP CONSTRAINT IF EXISTS ck_lobbies_max_members;

ALTER TABLE lobbies
  DROP COLUMN IF EXISTS insta_pay_handle,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS max_members;
