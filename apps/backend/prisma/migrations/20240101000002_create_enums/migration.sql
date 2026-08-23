CREATE TYPE lobby_status AS ENUM ('open', 'locked', 'billed', 'settled', 'cancelled');
CREATE TYPE member_role AS ENUM ('admin', 'member');
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'failed');
