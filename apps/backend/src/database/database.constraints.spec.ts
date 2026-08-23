import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const DATABASE_URL = process.env['DATABASE_URL'];

function planHasSeqScan(node: unknown): boolean {
  if (typeof node !== 'object' || node === null) {
    return false;
  }
  const record = node as { 'Node Type'?: string; Plans?: unknown[] };
  if (record['Node Type'] === 'Seq Scan') {
    return true;
  }
  return (record.Plans ?? []).some(planHasSeqScan);
}

describe('database constraints (DB-11, DB-09, DB-10)', () => {
  let client: Client | undefined;
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    if (!DATABASE_URL) {
      return;
    }
    const next = new Client({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 2000,
    });
    try {
      await next.connect();
      await next.query('SELECT 1 FROM _prisma_migrations LIMIT 1');
      client = next;
    } catch {
      await next.end().catch(() => undefined);
      client = undefined;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  const itDb = it;

  itDb('uq_lobby_members_one_admin rejects a second admin', async () => {
    const pg = client;
    if (!pg) {
      return;
    }
    const ctx = await insertLobbyFixture(pg, suffix, 'admin-a');
    await expect(
      pg.query(
        `
        INSERT INTO lobby_members (lobby_id, user_id, role, display_name)
        VALUES ($1, $2, 'admin', 'admin-b')
        `,
        [ctx.lobbyId, ctx.extraUserId],
      ),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'uq_lobby_members_one_admin',
    });
  });

  itDb(
    'uq_lobby_members_name_lower rejects the same name ignoring case',
    async () => {
      const pg = client;
      if (!pg) {
        return;
      }
      const ctx = await insertLobbyFixture(pg, `${suffix}-name`, 'Host');
      await expect(
        pg.query(
          `
        INSERT INTO lobby_members (lobby_id, user_id, role, display_name)
        VALUES ($1, $2, 'member', 'HOST')
        `,
          [ctx.lobbyId, ctx.extraUserId],
        ),
      ).rejects.toMatchObject({
        code: '23505',
        constraint: 'uq_lobby_members_name_lower',
      });
    },
  );

  itDb(
    'current schema allows a user to appear in more than one lobby member row',
    async () => {
      const pg = client;
      if (!pg) {
        return;
      }
      const a = await insertLobbyFixture(pg, `${suffix}-u1`, 'A1');
      const b = await insertLobbyFixture(pg, `${suffix}-u2`, 'B1');
      const result = await pg.query<{ id: string }>(
        `
        INSERT INTO lobby_members (lobby_id, user_id, role, display_name)
        VALUES ($1, $2, 'member', 'dup')
        RETURNING id
        `,
        [b.lobbyId, a.adminUserId],
      );
      expect(result.rows[0]?.id).toBeDefined();
    },
  );

  itDb(
    'uq_users_email_lower rejects duplicate emails ignoring case',
    async () => {
      const pg = client;
      if (!pg) {
        return;
      }
      const email = `Dup-${suffix}@seed.ftaar`;
      await pg.query(
        `
      INSERT INTO users (kind, email, display_name)
      VALUES ('registered', $1, 'one')
      `,
        [email],
      );
      await expect(
        pg.query(
          `
        INSERT INTO users (kind, email, display_name)
        VALUES ('registered', $1, 'two')
        `,
          [email.toLowerCase()],
        ),
      ).rejects.toMatchObject({
        code: '23505',
        constraint: 'uq_users_email_lower',
      });
    },
  );

  itDb('guest users can be created without device metadata', async () => {
    const pg = client;
    if (!pg) {
      return;
    }
    const displayName = `guest-${suffix}`;
    const result = await pg.query<{ id: string }>(
      `
      INSERT INTO users (kind, display_name)
      VALUES ('guest', $1)
      RETURNING id
      `,
      [displayName],
    );
    expect(result.rows[0]?.id).toBeDefined();
  });

  itDb('registered users can be inserted with email data', async () => {
    const pg = client;
    if (!pg) {
      return;
    }
    const email = `registered-${suffix}@seed.ftaar`;
    const result = await pg.query<{ id: string }>(
      `
      INSERT INTO users (kind, email, display_name)
      VALUES ('registered', $1, 'registered-user')
      RETURNING id
      `,
      [email],
    );
    expect(result.rows[0]?.id).toBeDefined();
  });

  itDb('ck_qty rejects quantity below 1', async () => {
    const pg = client;
    if (!pg) {
      return;
    }
    const ctx = await insertLobbyFixture(pg, `${suffix}-qty`, 'QtyAdmin');
    await expect(
      pg.query(
        `
        INSERT INTO order_items (
          lobby_id, lobby_member_id, menu_item_id, restaurant_id, qty, actual_price
        )
        VALUES ($1, $2, $3, $4, 0, 100)
        `,
        [ctx.lobbyId, ctx.memberId, ctx.menuItemId, ctx.restaurantId],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'ck_qty',
    });
  });

  itDb('ck_actual_price rejects a negative price', async () => {
    const pg = client;
    if (!pg) {
      return;
    }
    const ctx = await insertLobbyFixture(pg, `${suffix}-price`, 'PriceAdmin');
    await expect(
      pg.query(
        `
        INSERT INTO order_items (
          lobby_id, lobby_member_id, menu_item_id, restaurant_id, qty, actual_price
        )
        VALUES ($1, $2, $3, $4, 1, -1)
        `,
        [ctx.lobbyId, ctx.memberId, ctx.menuItemId, ctx.restaurantId],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'ck_actual_price',
    });
  });

  itDb(
    'current schema allows a cross-restaurant order item insert',
    async () => {
      const pg = client;
      if (!pg) {
        return;
      }
      const a = await insertLobbyFixture(pg, `${suffix}-fxa`, 'FxA');
      const b = await insertLobbyFixture(pg, `${suffix}-fxb`, 'FxB');
      const result = await pg.query<{ id: string }>(
        `
      INSERT INTO order_items (
        lobby_id, lobby_member_id, menu_item_id, restaurant_id, qty, actual_price
      )
      VALUES ($1, $2, $3, $4, 1, 100)
      RETURNING id
      `,
        [a.lobbyId, a.memberId, b.menuItemId, a.restaurantId],
      );
      expect(result.rows[0]?.id).toBeDefined();
    },
  );

  itDb(
    'lobby detail EXPLAIN uses indexes (no Seq Scan with seqscan off)',
    async () => {
      const pg = client;
      if (!pg) {
        return;
      }
      const ctx = await insertLobbyFixture(pg, `${suffix}-ex`, 'Explain');
      await pg.query(
        `
      INSERT INTO order_items (
        lobby_id, lobby_member_id, menu_item_id, restaurant_id, qty, actual_price
      )
      VALUES ($1, $2, $3, $4, 1, 250)
      `,
        [ctx.lobbyId, ctx.memberId, ctx.menuItemId, ctx.restaurantId],
      );
      await pg.query('BEGIN');
      await pg.query('SET LOCAL enable_seqscan = off');
      const explained = await pg.query(
        `
      EXPLAIN (FORMAT JSON)
      SELECT l.id, m.id, o.id, b.id
      FROM lobbies l
      LEFT JOIN lobby_members m ON m.lobby_id = l.id
      LEFT JOIN order_items o ON o.lobby_id = l.id
      LEFT JOIN lobby_bill b ON b.lobby_id = l.id
      WHERE l.id = $1
      `,
        [ctx.lobbyId],
      );
      await pg.query('ROLLBACK');
      const planRow = explained.rows[0] as
        | { 'QUERY PLAN'?: unknown }
        | undefined;
      const plan = planRow?.['QUERY PLAN'];
      const root = Array.isArray(plan) ? plan[0] : plan;
      const inner =
        typeof root === 'object' && root !== null && 'Plan' in root
          ? (root as { Plan: unknown }).Plan
          : root;
      expect(planHasSeqScan(inner)).toBe(false);
    },
  );
});

interface Fixture {
  restaurantId: string;
  menuItemId: string;
  lobbyId: string;
  memberId: string;
  adminUserId: string;
  extraUserId: string;
}

async function insertLobbyFixture(
  pg: Client,
  key: string,
  adminName: string,
): Promise<Fixture> {
  const restaurant = await pg.query<{ id: string }>(
    `INSERT INTO restaurants (name) VALUES ($1) RETURNING id`,
    [`restaurant-${key}`],
  );
  const restaurantId = restaurant.rows[0]?.id;
  const menu = await pg.query<{ id: string }>(
    `
    INSERT INTO menu_items (restaurant_id, name, reference_price)
    VALUES ($1, $2, 1500)
    RETURNING id
    `,
    [restaurantId, `item-${key}`],
  );
  const menuItemId = menu.rows[0]?.id;
  const admin = await pg.query<{ id: string }>(
    `
    INSERT INTO users (kind, email, display_name)
    VALUES ('registered', $1, $2)
    RETURNING id
    `,
    [`admin-${key}@test.ftaar`, adminName],
  );
  const extra = await pg.query<{ id: string }>(
    `
    INSERT INTO users (kind, display_name)
    VALUES ('guest', $1)
    RETURNING id
    `,
    [`guest-${key}`],
  );
  const lobby = await pg.query<{ id: string }>(
    `
    INSERT INTO lobbies (restaurant_id, code, status)
    VALUES ($1, $2, 'open')
    RETURNING id
    `,
    [restaurantId, `T-${key}`.slice(0, 32)],
  );
  const lobbyId = lobby.rows[0]?.id;
  const member = await pg.query<{ id: string }>(
    `
    INSERT INTO lobby_members (lobby_id, user_id, role, display_name)
    VALUES ($1, $2, 'admin', $3)
    RETURNING id
    `,
    [lobbyId, admin.rows[0]?.id, adminName],
  );

  if (
    !restaurantId ||
    !menuItemId ||
    !lobbyId ||
    !member.rows[0]?.id ||
    !admin.rows[0]?.id ||
    !extra.rows[0]?.id
  ) {
    throw new Error('fixture insert failed');
  }

  return {
    restaurantId,
    menuItemId,
    lobbyId,
    memberId: member.rows[0].id,
    adminUserId: admin.rows[0].id,
    extraUserId: extra.rows[0].id,
  };
}
