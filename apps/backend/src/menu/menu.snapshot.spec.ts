import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const DATABASE_URL = process.env['DATABASE_URL'];

describe('menu snapshot integrity (MENU-07)', () => {
  let client: Client | undefined;
  const key = randomUUID().slice(0, 8);

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

  it('keeps ordered name and price after the menu item is deactivated', async () => {
    const pg = client;
    if (!pg) {
      return;
    }

    const restaurant = await pg.query<{ id: string }>(
      `INSERT INTO restaurants (name) VALUES ($1) RETURNING id`,
      [`snap-rest-${key}`],
    );
    const restaurantId = restaurant.rows[0]?.id;
    const menu = await pg.query<{ id: string }>(
      `
      INSERT INTO menu_items (restaurant_id, name, category, reference_price)
      VALUES ($1, 'كبسة', 'أطباق', 2500)
      RETURNING id
      `,
      [restaurantId],
    );
    const menuItemId = menu.rows[0]?.id;
    const user = await pg.query<{ id: string }>(
      `
      INSERT INTO users (kind, email, display_name)
      VALUES ('registered', $1, 'Host')
      RETURNING id
      `,
      [`snap-${key}@test.ftaar`],
    );
    const lobby = await pg.query<{ id: string }>(
      `
      INSERT INTO lobbies (restaurant_id, code, status)
      VALUES ($1, $2, 'open')
      RETURNING id
      `,
      [restaurantId, `S-${key}`.slice(0, 32)],
    );
    const member = await pg.query<{ id: string }>(
      `
      INSERT INTO lobby_members (lobby_id, user_id, role, display_name)
      VALUES ($1, $2, 'admin', 'Host')
      RETURNING id
      `,
      [lobby.rows[0]?.id, user.rows[0]?.id],
    );
    const order = await pg.query<{ id: string }>(
      `
      INSERT INTO order_items (
        lobby_id, lobby_member_id, menu_item_id, restaurant_id, qty, actual_price
      )
      VALUES ($1, $2, $3, $4, 1, 2500)
      RETURNING id
      `,
      [lobby.rows[0]?.id, member.rows[0]?.id, menuItemId, restaurantId],
    );

    await pg.query(
      `UPDATE menu_items SET is_active = false, reference_price = 9999 WHERE id = $1`,
      [menuItemId],
    );

    const historical = await pg.query<{
      name: string;
      actual_price: string;
      catalog_price: string;
      is_active: boolean;
    }>(
      `
      SELECT oi.actual_price::text,
             mi.reference_price::text AS catalog_price,
             mi.name,
             mi.is_active
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.id = $1
      `,
      [order.rows[0]?.id],
    );

    const row = historical.rows[0];
    expect(row?.name).toBe('كبسة');
    expect(row?.actual_price).toBe('2500');
    expect(row?.catalog_price).toBe('9999');
    expect(row?.is_active).toBe(false);
  });

  it('rejects a negative reference_price', async () => {
    const pg = client;
    if (!pg) {
      return;
    }
    const restaurant = await pg.query<{ id: string }>(
      `INSERT INTO restaurants (name) VALUES ($1) RETURNING id`,
      [`neg-rest-${key}`],
    );
    await expect(
      pg.query(
        `
        INSERT INTO menu_items (restaurant_id, name, reference_price)
        VALUES ($1, 'bad', -1)
        `,
        [restaurant.rows[0]?.id],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'ck_menu_items_reference_price',
    });
  });
});
