import { Money } from '../../money/money';
import {
  ADMIN_USER_ID,
  LOBBY_ID,
  MEMBER_MEMBER_ID,
  MEMBER_USER_ID,
  adminMember,
  billPayload,
  buildPaymentsService,
  owingMember,
} from '../testing/payment-fixtures';

describe('PaymentsService', () => {
  it('builds a board with host treated as paid and member unpaid', async () => {
    const { prisma, access, service } = buildPaymentsService();
    access.requireMember.mockResolvedValue(owingMember());
    prisma.lobby.findUnique.mockResolvedValue({
      id: LOBBY_ID,
      status: 'billed',
      instaPayHandle: 'omar.instapay',
    });
    prisma.lobbyMember.findMany.mockResolvedValue([
      adminMember(),
      owingMember(),
    ]);
    prisma.paymentClaim.findMany.mockResolvedValue([]);

    const board = await service.getBoard(LOBBY_ID, MEMBER_USER_ID);
    expect(board.instaPayHandle).toBe('omar.instapay');
    expect(board.waitingOn).toEqual(['لينا']);
    expect(board.you.amountOwed).toEqual(Money.fromEgpString('8.00'));
    expect(
      board.members.find((row) => row.role === 'admin')?.paymentStatus,
    ).toBe('paid');
  });

  it('forbids the host from claiming', async () => {
    const { access, service } = buildPaymentsService();
    access.requireMember.mockResolvedValue(adminMember());

    await expect(
      service.claim(LOBBY_ID, ADMIN_USER_ID, {}),
    ).rejects.toMatchObject({ code: 'CANNOT_CLAIM_AS_HOST' });
  });

  it('moves an owing member to pending on claim', async () => {
    const { prisma, access, billing, service } = buildPaymentsService();
    access.requireMember.mockResolvedValue(owingMember());
    prisma.lobby.findUnique.mockResolvedValue({
      id: LOBBY_ID,
      status: 'billed',
      instaPayHandle: 'omar.instapay',
    });
    prisma.paymentClaim.findFirst.mockResolvedValue(null);
    prisma.lobbyMember.findFirst.mockResolvedValue(owingMember());
    prisma.lobbyMember.findMany.mockResolvedValue([
      adminMember(),
      owingMember({ paymentStatus: 'pending' }),
    ]);
    prisma.paymentClaim.findMany.mockResolvedValue([
      {
        id: 'claim-1',
        lobbyId: LOBBY_ID,
        lobbyMemberId: MEMBER_MEMBER_ID,
        amount: 800n,
        status: 'pending',
        note: null,
        claimedAt: new Date(),
        resolvedAt: null,
        resolvedById: null,
        idempotencyKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    billing.readFinalisedBill.mockResolvedValue({
      ...billPayload(),
      members: billPayload().members.map((member) =>
        member.id === MEMBER_MEMBER_ID
          ? { ...member, paymentStatus: 'pending' as const }
          : member,
      ),
    });

    const board = await service.claim(LOBBY_ID, MEMBER_USER_ID, {});
    expect(billing.readFinalisedBill).toHaveBeenCalledWith(LOBBY_ID, prisma);
    expect(prisma.lobbyMember.findFirst).toHaveBeenCalledWith({
      where: { id: MEMBER_MEMBER_ID, lobbyId: LOBBY_ID },
    });
    expect(prisma.paymentClaim.create).toHaveBeenCalled();
    expect(prisma.lobbyMember.update).toHaveBeenCalledWith({
      where: { id: MEMBER_MEMBER_ID },
      data: { paymentStatus: 'pending' },
    });
    expect(board.waitingOn).toEqual(['لينا']);
  });

  it('settles only when nobody is waiting', async () => {
    const { prisma, access, billing, service } = buildPaymentsService();
    access.requireAdmin.mockResolvedValue(adminMember());
    prisma.lobby.findUnique.mockResolvedValue({
      id: LOBBY_ID,
      status: 'billed',
      instaPayHandle: 'omar.instapay',
    });
    prisma.lobbyMember.findMany.mockResolvedValue([
      adminMember(),
      owingMember({ paymentStatus: 'unpaid' }),
    ]);
    prisma.paymentClaim.findMany.mockResolvedValue([]);

    await expect(service.settle(LOBBY_ID, ADMIN_USER_ID)).rejects.toMatchObject(
      {
        code: 'SETTLEMENT_INCOMPLETE',
      },
    );

    prisma.lobby.findUnique.mockResolvedValue({
      id: LOBBY_ID,
      status: 'billed',
      instaPayHandle: 'omar.instapay',
    });
    prisma.lobbyMember.findMany.mockResolvedValue([
      adminMember(),
      owingMember({ paymentStatus: 'paid' }),
    ]);
    billing.readFinalisedBill.mockResolvedValue({
      ...billPayload(),
      members: billPayload().members.map((member) =>
        member.id === MEMBER_MEMBER_ID
          ? { ...member, paymentStatus: 'paid' as const }
          : member,
      ),
    });

    const settled = await service.settle(LOBBY_ID, ADMIN_USER_ID);
    expect(prisma.lobby.update).toHaveBeenCalledWith({
      where: { id: LOBBY_ID },
      data: { status: 'settled' },
    });
    expect(settled.waitingOn).toEqual([]);
  });

  it('refuses a claim when the member is already paid inside the transaction', async () => {
    const { prisma, access, billing, service } = buildPaymentsService();
    access.requireMember.mockResolvedValue(owingMember());
    prisma.lobby.findUnique.mockResolvedValue({
      id: LOBBY_ID,
      status: 'billed',
      instaPayHandle: 'omar.instapay',
    });
    prisma.lobbyMember.findFirst.mockResolvedValue(
      owingMember({ paymentStatus: 'paid' }),
    );

    await expect(
      service.claim(LOBBY_ID, MEMBER_USER_ID, {}),
    ).rejects.toMatchObject({ code: 'ALREADY_PAID' });
    expect(prisma.paymentClaim.create).not.toHaveBeenCalled();
    expect(billing.readFinalisedBill).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key longer than 128 characters', async () => {
    const { access, service } = buildPaymentsService();
    access.requireMember.mockResolvedValue(owingMember());

    await expect(
      service.claim(LOBBY_ID, MEMBER_USER_ID, {
        idempotencyKey: 'k'.repeat(129),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
