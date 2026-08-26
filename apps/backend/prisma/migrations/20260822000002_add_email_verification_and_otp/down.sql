DROP TABLE IF EXISTS "password_reset_tokens";
DROP TABLE IF EXISTS "otp_verifications";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified_at";
DROP TYPE IF EXISTS "otp_purpose";
