-- Drop the partial unique index on device_id created in migration 7
DROP INDEX IF EXISTS "uq_users_guest_device";

-- Remove device_id column — no longer part of the guest identity model
ALTER TABLE "users" DROP COLUMN IF EXISTS "device_id";
