import {
  LOBBY_ID,
  RESTAURANT_ID,
  USER_ID,
  buildService,
  lobbyRow,
  uniqueError,
  useFrozenClock,
} from '../testing/lobby-fixtures';

describe('LobbiesService create and lookup', () => {
  useFrozenClock();

  describe('create', () => {
    it('creates an open lobby and snapshots the creator as admin', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'أحمد',
        instaPayHandle: 'profile.handle',
      });
      prisma.lobby.create.mockResolvedValue({ id: LOBBY_ID });
      prisma.lobby.findUnique.mockResolvedValue(lobbyRow());

      const created = await service.create(USER_ID, {
        restaurantId: RESTAURANT_ID,
        maxMembers: 8,
        expiryMinutes: 30,
      });

      expect(created.code).toBe('B12F7K');
      expect(created.members[0]?.role).toBe('admin');
      expect(prisma.lobby.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            restaurantId: RESTAURANT_ID,
            status: 'open',
            maxMembers: 8,
            expiresAt: new Date('2026-08-30T12:30:00.000Z'),
            instaPayHandle: 'profile.handle',
            members: {
              create: {
                userId: USER_ID,
                role: 'admin',
                displayName: 'أحمد',
              },
            },
          }),
        }),
      );
    });

    it('uses the provided instaPayHandle instead of the profile fallback', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'أحمد',
        instaPayHandle: 'profile.handle',
      });
      prisma.lobby.create.mockResolvedValue({ id: LOBBY_ID });
      prisma.lobby.findUnique.mockResolvedValue(
        lobbyRow({ instaPayHandle: 'custom.handle' }),
      );

      await service.create(USER_ID, {
        restaurantId: RESTAURANT_ID,
        instaPayHandle: 'custom.handle',
      });

      expect(prisma.lobby.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ instaPayHandle: 'custom.handle' }),
        }),
      );
    });

    it('throws NOT_FOUND when the restaurant is missing or inactive', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'أحمد',
        instaPayHandle: null,
      });

      await expect(
        service.create(USER_ID, { restaurantId: RESTAURANT_ID }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('retries when the generated code collides', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'أحمد',
        instaPayHandle: null,
      });
      prisma.lobby.create
        .mockRejectedValueOnce(uniqueError(['code']))
        .mockResolvedValueOnce({ id: LOBBY_ID });
      prisma.lobby.findUnique.mockResolvedValue(lobbyRow());

      const created = await service.create(USER_ID, {
        restaurantId: RESTAURANT_ID,
      });

      expect(created.id).toBe(LOBBY_ID);
      expect(prisma.lobby.create).toHaveBeenCalledTimes(2);
      expect(prisma.runInTransaction).not.toHaveBeenCalled();
    });

    it('returns CONFLICT after exhausting code collision retries', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'أحمد',
        instaPayHandle: null,
      });
      prisma.lobby.create.mockRejectedValue(uniqueError(['code']));

      await expect(
        service.create(USER_ID, { restaurantId: RESTAURANT_ID }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(prisma.lobby.create).toHaveBeenCalledTimes(8);
    });
  });

  describe('findByCode', () => {
    it('normalizes the code to uppercase', async () => {
      const { prisma, service } = buildService();
      prisma.lobby.findUnique.mockResolvedValue(lobbyRow());

      const lobby = await service.findByCode('b12f7k');
      expect(lobby.restaurant?.name).toBe('مطعم الفحام');
      expect(prisma.lobby.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'B12F7K' } }),
      );
    });

    it('throws NOT_FOUND when the code does not exist', async () => {
      const { prisma, service } = buildService();
      prisma.lobby.findUnique.mockResolvedValue(null);
      await expect(service.findByCode('ZZZZZZ')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
