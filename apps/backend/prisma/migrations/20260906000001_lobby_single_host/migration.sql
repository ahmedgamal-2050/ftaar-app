-- A lobby is created atomically with one admin membership. This partial
-- unique index prevents any later write from assigning a second host.
CREATE UNIQUE INDEX uq_lobby_members_single_admin
ON lobby_members (lobby_id)
WHERE role = 'admin';
