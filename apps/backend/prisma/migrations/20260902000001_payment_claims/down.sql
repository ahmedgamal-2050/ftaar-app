DROP INDEX IF EXISTS idx_payment_claims_member_id;
DROP INDEX IF EXISTS idx_payment_claims_lobby_id;
DROP INDEX IF EXISTS uq_payment_claims_one_pending;
DROP INDEX IF EXISTS uq_payment_claims_idempotency_key;
DROP TABLE IF EXISTS payment_claims;
DROP TYPE IF EXISTS claim_status;
