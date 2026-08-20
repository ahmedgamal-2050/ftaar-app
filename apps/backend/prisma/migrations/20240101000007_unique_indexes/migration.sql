CREATE UNIQUE INDEX uq_lobby_members_one_admin
ON lobby_members (lobby_id)
WHERE role = 'admin';

CREATE UNIQUE INDEX uq_lobby_members_name_lower
ON lobby_members (lobby_id, lower(display_name));

CREATE UNIQUE INDEX uq_lobby_members_user
ON lobby_members (user_id);

CREATE UNIQUE INDEX uq_users_email_lower
ON users (lower(email))
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX uq_users_guest_device
ON users (device_id)
WHERE kind = 'guest';
