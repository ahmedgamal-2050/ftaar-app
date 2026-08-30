import { AppError } from '../../core/errors/app-error';
import {
  GUEST_ID,
  MEMBER_ID,
  USER_ID,
  buildMembersService,
  guestMemberRow,
  lobbyRow,
  memberRow,
  useFrozenClock,
} from '../testing/lobby-fixtures';

describe('LobbiesService join', () => {
  useFrozenClock();

  it('adds a member when the lobby is open', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique
      .mockResolvedValueOnce(lobbyRow())
      .mockResolvedValueOnce(
        lobbyRow({ members: [memberRow(), guestMemberRow()] }),
      );
    prisma.user.findUnique.mockResolvedValue({
      displayName: 'ضيف',
      instaPayHandle: null,
    });
    prisma.lobbyMember.findFirst.mockResolvedValue(null);
    prisma.lobbyMember.create.mockResolvedValue(guestMemberRow());

    const result = await service.join(GUEST_ID, { code: 'B12F7K' });
    expect(result.alreadyMember).toBe(false);
    expect(result.membership.role).toBe('member');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns the existing membership without re-inserting', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow());

    const result = await service.join(USER_ID, { code: 'B12F7K' });
    expect(result.alreadyMember).toBe(true);
    expect(prisma.lobbyMember.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate display name case-insensitively', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow());
    prisma.user.findUnique.mockResolvedValue({
      displayName: 'Other',
      instaPayHandle: null,
    });
    prisma.lobbyMember.findFirst.mockResolvedValue({ id: MEMBER_ID });

    await expect(
      service.join(GUEST_ID, { code: 'B12F7K', displayName: 'أحمد' }),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      service.join(GUEST_ID, { code: 'B12F7K', displayName: 'أحمد' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects joins when the lobby is locked', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(lobbyRow({ status: 'locked' }));

    await expect(
      service.join(GUEST_ID, { code: 'B12F7K' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects joins when the lobby has expired', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(
      lobbyRow({ expiresAt: new Date('2026-08-30T11:00:00.000Z') }),
    );

    await expect(
      service.join(GUEST_ID, { code: 'B12F7K' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects joins when the lobby is at capacity', async () => {
    const { prisma, service } = buildMembersService();
    prisma.lobby.findUnique.mockResolvedValue(
      lobbyRow({ maxMembers: 1, members: [memberRow()] }),
    );

    await expect(
      service.join(GUEST_ID, { code: 'B12F7K' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
