-- Re-add device_id column
ALTER TABLE "users" ADD COLUMN "device_id" VARCHAR(255);

-- Re-create the partial unique index
CREATE UNIQUE INDEX "uq_users_guest_device"
ON "users" ("device_id")
WHERE kind = 'guest';
