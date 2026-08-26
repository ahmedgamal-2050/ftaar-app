-- Create otp_purpose enum
CREATE TYPE "otp_purpose" AS ENUM ('email_verification', 'password_reset');

-- Add emailVerifiedAt to users
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);

-- Mark all existing registered users as verified for migration compatibility
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "kind" = 'registered';

-- Create otp_verifications table
CREATE TABLE "otp_verifications" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID         NOT NULL,
    "purpose"     "otp_purpose" NOT NULL,
    "otp_hash"    VARCHAR(64)  NOT NULL,
    "expires_at"  TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "attempts"    INTEGER      NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "otp_verifications"
    ADD CONSTRAINT "otp_verifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_otp_verifications_user_purpose"
    ON "otp_verifications"("user_id", "purpose");

-- Create password_reset_tokens table
CREATE TABLE "password_reset_tokens" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID         NOT NULL,
    "token_hash"  VARCHAR(255) NOT NULL,
    "expires_at"  TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_password_reset_tokens_user_id"
    ON "password_reset_tokens"("user_id");
