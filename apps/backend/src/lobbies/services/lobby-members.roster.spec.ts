import {
  LOBBY_ID,
  MEMBER_ID,
  USER_ID,
  buildMembersService,
  guestMemberRow,
  lobbyRow,
  memberRow,
  useFrozenClock,
} from '../testing/lobby-fixtures';

describe('LobbyMembersService removeMember and leave', () => {
  useFrozenClock();

  const extraMember = guestMemberRow();

  it('lets the admin remove a regular member', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow());
    prisma.lobbyMember.findFirst
      .mockResolvedValueOnce(memberRow())
      .mockResolvedValueOnce(extraMember);
    prisma.lobbyMember.delete.mockResolvedValue(extraMember);

    const removed = await service.removeMember(
      LOBBY_ID,
      extraMember.id as string,
      USER_ID,
    );
    expect(removed.role).toBe('member');
  });

  it('does not allow removing the admin', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow());
    prisma.lobbyMember.findFirst
      .mockResolvedValueOnce(memberRow())
      .mockResolvedValueOnce(memberRow());

    await expect(
      service.removeMember(LOBBY_ID, MEMBER_ID, USER_ID),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets a regular member leave an open lobby', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow());
    prisma.lobbyMember.findFirst.mockResolvedValue(extraMember);
    prisma.lobbyMember.delete.mockResolvedValue(extraMember);

    const left = await service.leave(LOBBY_ID, extraMember.userId as string);
    expect(left.id).toBe(extraMember.id);
  });

  it('forbids the admin from leaving', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow());
    prisma.lobbyMember.findFirst.mockResolvedValue(memberRow());

    await expect(service.leave(LOBBY_ID, USER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
