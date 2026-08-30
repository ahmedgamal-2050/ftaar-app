import {
  LOBBY_ID,
  USER_ID,
  buildService,
  lobbyRow,
  memberRow,
  useFrozenClock,
} from '../testing/lobby-fixtures';

describe('LobbiesService lock and reopen', () => {
  useFrozenClock();

  it('locks an open lobby as admin', async () => {
    const { prisma, service } = buildService();
    prisma.lobby.findUnique
      .mockResolvedValueOnce(lobbyRow())
      .mockResolvedValueOnce(lobbyRow({ status: 'locked' }));
    prisma.lobbyMember.findFirst.mockResolvedValue(memberRow());
    prisma.lobby.update.mockResolvedValue(lobbyRow({ status: 'locked' }));

    const locked = await service.lock(LOBBY_ID, USER_ID);
    expect(locked.status).toBe('locked');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.lobby.update).toHaveBeenCalledWith({
      where: { id: LOBBY_ID },
      data: { status: 'locked' },
    });
  });

  it('forbids a regular member from locking', async () => {
    const { prisma, service } = buildService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow());
    prisma.lobbyMember.findFirst.mockResolvedValue(
      memberRow({ role: 'member' }),
    );

    await expect(service.lock(LOBBY_ID, USER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('reopens only from locked', async () => {
    const { prisma, service } = buildService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow({ status: 'open' }));
    prisma.lobbyMember.findFirst.mockResolvedValue(memberRow());

    await expect(service.reopen(LOBBY_ID, USER_ID)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
});
