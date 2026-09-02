import type { LobbyStatus, PrismaClient } from '@prisma/client';
import { ARABIC_MENU_ITEMS } from './arabic-menu';
import { LOBBY_STATUSES, type LobbyStatus as AppLobbyStatus } from './enums';

const RESTAURANTS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'مطعم الفحام',
    phone: '+201001111111',
    image: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
    note: 'مشويات على الفحم',
    itemCount: 18,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'ديوان الشام',
    phone: '+201002222222',
    image: 'https://cdn.ftaar.example/restaurants/diwan.jpg',
    note: null,
    itemCount: 28,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'بيت الكبسة',
    phone: '+201003333333',
    image: 'https://cdn.ftaar.example/restaurants/kabsa.jpg',
    note: 'أفضل وقت للطلب بعد المغرب',
    itemCount: 36,
  },
] as const;

const USERS = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    kind: 'registered',
    email: 'ahmad@seed.ftaar',
    displayName: 'أحمد',
    emailVerifiedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    kind: 'registered',
    email: 'lina@seed.ftaar',
    displayName: 'لينا',
    emailVerifiedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    kind: 'registered',
    email: 'omar@seed.ftaar',
    displayName: 'عمر',
    emailVerifiedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    kind: 'guest',
    email: null as string | null,
    displayName: 'ضيف ١',
    emailVerifiedAt: null as Date | null,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    kind: 'guest',
    email: null as string | null,
    displayName: 'ضيف ٢',
    emailVerifiedAt: null as Date | null,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    kind: 'guest',
    email: null as string | null,
    displayName: 'ضيف ٣',
    emailVerifiedAt: null as Date | null,
  },
] as const;

function lobbyId(status: AppLobbyStatus): string {
  const n = LOBBY_STATUSES.indexOf(status) + 1;
  return `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${n}`;
}

function memberId(status: AppLobbyStatus): string {
  const n = LOBBY_STATUSES.indexOf(status) + 1;
  return `cccccccc-cccc-4ccc-8ccc-ccccccccccc${n}`;
}

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  if (ARABIC_MENU_ITEMS.length < 40) {
    throw new Error('ARABIC_MENU_ITEMS must contain at least 40 dishes');
  }

  await prisma.$transaction(async (tx) => {
    for (const restaurant of RESTAURANTS) {
      await tx.restaurant.upsert({
        where: { id: restaurant.id },
        create: {
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
          image: restaurant.image,
          note: restaurant.note,
          isActive: true,
        },
        update: {
          name: restaurant.name,
          phone: restaurant.phone,
          image: restaurant.image,
          note: restaurant.note,
          isActive: true,
        },
      });

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
        const category = i < 16 ? 'أطباق' : i < 32 ? 'مقبلات' : 'حلويات';
        await tx.menuItem.upsert({
          where: { id: itemId },
          create: {
            id: itemId,
            restaurantId: restaurant.id,
            name,
            category,
            referencePrice: price,
            isActive: true,
          },
          update: { name, category, referencePrice: price, isActive: true },
        });
      }
    }

    for (const user of USERS) {
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          kind: user.kind,
          email: user.email,
          displayName: user.displayName,
          emailVerifiedAt: user.emailVerifiedAt,
        },
        update: {
          kind: user.kind,
          email: user.email,
          displayName: user.displayName,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      });
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

      await tx.lobby.upsert({
        where: { id: lobbyId(status) },
        create: {
          id: lobbyId(status),
          restaurantId: restaurant.id,
          code: `SEED-${status.toUpperCase()}`,
          status: status as LobbyStatus,
          instaPayHandle: status === 'billed' ? 'omar.instapay' : null,
        },
        update: {
          restaurantId: restaurant.id,
          code: `SEED-${status.toUpperCase()}`,
          status: status as LobbyStatus,
          instaPayHandle: status === 'billed' ? 'omar.instapay' : null,
        },
      });

      await tx.lobbyMember.upsert({
        where: { id: memberId(status) },
        create: {
          id: memberId(status),
          lobbyId: lobbyId(status),
          userId: user.id,
          role: 'admin',
          displayName: user.displayName,
        },
        update: {
          lobbyId: lobbyId(status),
          userId: user.id,
          role: 'admin',
          displayName: user.displayName,
        },
      });
    }

    const extraUser = USERS[5];
    const firstStatus = LOBBY_STATUSES[0];
    if (extraUser && firstStatus) {
      await tx.lobbyMember.upsert({
        where: { id: extraMemberId },
        create: {
          id: extraMemberId,
          lobbyId: lobbyId(firstStatus),
          userId: extraUser.id,
          role: 'member',
          displayName: extraUser.displayName,
        },
        update: {
          lobbyId: lobbyId(firstStatus),
          userId: extraUser.id,
          role: 'member',
          displayName: extraUser.displayName,
        },
      });
    }

    const billed = LOBBY_STATUSES.find((s) => s === 'billed');
    if (billed) {
      const billedIndex = LOBBY_STATUSES.indexOf(billed);
      const restaurant = RESTAURANTS[billedIndex % RESTAURANTS.length];
      const billedPayer = USERS[1];
      if (!restaurant || !billedPayer) {
        throw new Error('Seed restaurant missing for billed lobby');
      }
      // Kept in sync with MEMBER_MEMBER_ID in payment-fixtures.ts.
      const billedPayerMemberId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8';
      await tx.lobbyMember.upsert({
        where: { id: billedPayerMemberId },
        create: {
          id: billedPayerMemberId,
          lobbyId: lobbyId(billed),
          userId: billedPayer.id,
          role: 'member',
          displayName: billedPayer.displayName,
          paymentStatus: 'unpaid',
        },
        update: {
          lobbyId: lobbyId(billed),
          userId: billedPayer.id,
          role: 'member',
          displayName: billedPayer.displayName,
          paymentStatus: 'unpaid',
        },
      });
      const firstItemId = `dddddddd-dddd-4ddd-8ddd-${restaurant.id.slice(0, 8)}0000`;
      await tx.orderItem.upsert({
        where: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1' },
        create: {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
          lobbyId: lobbyId(billed),
          lobbyMemberId: memberId(billed),
          menuItemId: firstItemId,
          restaurantId: restaurant.id,
          qty: 2,
          actualPrice: 1600n,
        },
        update: { qty: 2, actualPrice: 1600n },
      });
      await tx.orderItem.upsert({
        where: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2' },
        create: {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
          lobbyId: lobbyId(billed),
          lobbyMemberId: billedPayerMemberId,
          menuItemId: firstItemId,
          restaurantId: restaurant.id,
          qty: 1,
          actualPrice: 800n,
        },
        update: { qty: 1, actualPrice: 800n },
      });

      await tx.lobbyBill.upsert({
        where: { lobbyId: lobbyId(billed) },
        create: {
          id: 'ffffffff-ffff-4fff-8fff-fffffffffff1',
          lobbyId: lobbyId(billed),
          subtotal: 2400n,
          tax: 240n,
          total: 2640n,
          paymentStatus: 'pending',
        },
        update: {
          subtotal: 2400n,
          tax: 240n,
          total: 2640n,
          paymentStatus: 'pending',
        },
      });
    }
  });
}
