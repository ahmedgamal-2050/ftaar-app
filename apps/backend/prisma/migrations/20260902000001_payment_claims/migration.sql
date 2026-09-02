CREATE TYPE claim_status AS ENUM ('pending', 'confirmed', 'rejected');

CREATE TABLE payment_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  lobby_member_id UUID NOT NULL REFERENCES lobby_members(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  status claim_status NOT NULL,
  note VARCHAR(500),
  claimed_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ(6),
  resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_payment_claims_amount CHECK (amount >= 0)
);

CREATE UNIQUE INDEX uq_payment_claims_idempotency_key
  ON payment_claims (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX uq_payment_claims_one_pending
  ON payment_claims (lobby_member_id)
  WHERE status = 'pending';

CREATE INDEX idx_payment_claims_lobby_id ON payment_claims (lobby_id);
CREATE INDEX idx_payment_claims_member_id ON payment_claims (lobby_member_id);
