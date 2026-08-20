import type { DataSource } from 'typeorm';
import { ARABIC_MENU_ITEMS } from './arabic-menu';
import { LOBBY_STATUSES, type LobbyStatus } from './enums';

const RESTAURANTS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'مطعم الفحام',
    itemCount: 18,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'ديوان الشام',
    itemCount: 28,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'بيت الكبسة',
    itemCount: 36,
  },
] as const;

const USERS = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    kind: 'registered',
    email: 'ahmad@seed.ftaar',
    deviceId: null,
    displayName: 'أحمد',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    kind: 'registered',
    email: 'lina@seed.ftaar',
    deviceId: null,
    displayName: 'لينا',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    kind: 'registered',
    email: 'omar@seed.ftaar',
    deviceId: null,
    displayName: 'عمر',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    kind: 'guest',
    email: null,
    deviceId: 'seed-device-guest-1',
    displayName: 'ضيف ١',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    kind: 'guest',
    email: null,
    deviceId: 'seed-device-guest-2',
    displayName: 'ضيف ٢',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    kind: 'guest',
    email: null,
    deviceId: 'seed-device-guest-3',
    displayName: 'ضيف ٣',
  },
] as const;

function lobbyId(status: LobbyStatus): string {
  const n = LOBBY_STATUSES.indexOf(status) + 1;
  return `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${n}`;
}

function memberId(status: LobbyStatus): string {
  const n = LOBBY_STATUSES.indexOf(status) + 1;
  return `cccccccc-cccc-4ccc-8ccc-ccccccccccc${n}`;
}

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  if (ARABIC_MENU_ITEMS.length < 40) {
    throw new Error('ARABIC_MENU_ITEMS must contain at least 40 dishes');
  }

  await dataSource.transaction(async (manager) => {
    for (const restaurant of RESTAURANTS) {
      await manager.query(
        `
        INSERT INTO restaurants (id, name, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true
        `,
        [restaurant.id, restaurant.name],
      );

      const count = restaurant.itemCount;
      if (count < 15 || count > 40) {
        throw new Error(`Menu size ${count} is outside 15–40`);
      }

      for (let i = 0; i < count; i += 1) {
        const name = ARABIC_MENU_ITEMS[i];
        if (!name) {
          throw new Error(`Missing Arabic dish at index ${i}`);
        }
        const itemId = `dddddddd-dddd-4ddd-8ddd-${restaurant.id.slice(0, 8)}${String(i).padStart(4, '0')}`;
        const price = BigInt(800 + i * 125);
        await manager.query(
          `
          INSERT INTO menu_items (id, restaurant_id, name, reference_price, is_active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            reference_price = EXCLUDED.reference_price,
            is_active = true
          `,
          [itemId, restaurant.id, name, price.toString()],
        );
      }
    }

    for (const user of USERS) {
      await manager.query(
        `
        INSERT INTO users (id, kind, email, device_id, display_name)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          kind = EXCLUDED.kind,
          email = EXCLUDED.email,
          device_id = EXCLUDED.device_id,
          display_name = EXCLUDED.display_name
        `,
        [user.id, user.kind, user.email, user.deviceId, user.displayName],
      );
    }

    const extraMemberId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc0';

    for (let i = 0; i < LOBBY_STATUSES.length; i += 1) {
      const status = LOBBY_STATUSES[i];
      if (!status) {
        continue;
      }
      const restaurant = RESTAURANTS[i % RESTAURANTS.length];
      const user = USERS[i];
      if (!restaurant || !user) {
        throw new Error('Seed restaurant/user missing');
      }

      await manager.query(
        `
        INSERT INTO lobbies (id, restaurant_id, code, status)
        VALUES ($1, $2, $3, $4::lobby_status)
        ON CONFLICT (id) DO UPDATE SET
          restaurant_id = EXCLUDED.restaurant_id,
          code = EXCLUDED.code,
          status = EXCLUDED.status
        `,
        [
          lobbyId(status),
          restaurant.id,
          `SEED-${status.toUpperCase()}`,
          status,
        ],
      );

      await manager.query(
        `
        INSERT INTO lobby_members (id, lobby_id, user_id, role, display_name)
        VALUES ($1, $2, $3, 'admin', $4)
        ON CONFLICT (id) DO UPDATE SET
          lobby_id = EXCLUDED.lobby_id,
          user_id = EXCLUDED.user_id,
          role = EXCLUDED.role,
          display_name = EXCLUDED.display_name
        `,
        [memberId(status), lobbyId(status), user.id, user.displayName],
      );
    }

    const extraUser = USERS[5];
    const firstStatus = LOBBY_STATUSES[0];
    if (extraUser && firstStatus) {
      await manager.query(
        `
        INSERT INTO lobby_members (id, lobby_id, user_id, role, display_name)
        VALUES ($1, $2, $3, 'member', $4)
        ON CONFLICT (id) DO UPDATE SET
          lobby_id = EXCLUDED.lobby_id,
          user_id = EXCLUDED.user_id,
          role = EXCLUDED.role,
          display_name = EXCLUDED.display_name
        `,
        [
          extraMemberId,
          lobbyId(firstStatus),
          extraUser.id,
          extraUser.displayName,
        ],
      );
    }

    const billed = LOBBY_STATUSES.find((s) => s === 'billed');
    if (billed) {
      const billedIndex = LOBBY_STATUSES.indexOf(billed);
      const restaurant = RESTAURANTS[billedIndex % RESTAURANTS.length];
      if (!restaurant) {
        throw new Error('Seed restaurant missing for billed lobby');
      }
      const firstItemId = `dddddddd-dddd-4ddd-8ddd-${restaurant.id.slice(0, 8)}0000`;
      await manager.query(
        `
        INSERT INTO order_items (
          id, lobby_id, lobby_member_id, menu_item_id, restaurant_id, qty, actual_price
        )
        VALUES ($1, $2, $3, $4, $5, 2, 1600)
        ON CONFLICT (id) DO UPDATE SET qty = EXCLUDED.qty, actual_price = EXCLUDED.actual_price
        `,
        [
          'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
          lobbyId(billed),
          memberId(billed),
          firstItemId,
          restaurant.id,
        ],
      );

      await manager.query(
        `
        INSERT INTO lobby_bill (
          id, lobby_id, subtotal, tax, total, payment_status
        )
        VALUES ($1, $2, 1600, 240, 1840, 'pending'::payment_status)
        ON CONFLICT (lobby_id) DO UPDATE SET
          subtotal = EXCLUDED.subtotal,
          tax = EXCLUDED.tax,
          total = EXCLUDED.total,
          payment_status = EXCLUDED.payment_status
        `,
        ['ffffffff-ffff-4fff-8fff-fffffffffff1', lobbyId(billed)],
      );
    }
  });
}
