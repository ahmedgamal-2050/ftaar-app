import { Money } from '../../money/money';
import { PaymentClaim } from './payment-claim.entity';

describe('PaymentClaim entity', () => {
  it('maps piastres to Money', () => {
    const claim = PaymentClaim.fromPersistence({
      id: '11111111-1111-4111-8111-111111111111',
      lobbyId: '22222222-2222-4222-8222-222222222222',
      lobbyMemberId: '33333333-3333-4333-8333-333333333333',
      amount: 800n,
      status: 'pending',
      note: null,
      claimedAt: new Date('2026-09-02T00:00:00.000Z'),
      resolvedAt: null,
      resolvedById: null,
      idempotencyKey: null,
      createdAt: new Date('2026-09-02T00:00:00.000Z'),
      updatedAt: new Date('2026-09-02T00:00:00.000Z'),
    });
    expect(claim.amount).toEqual(Money.fromEgpString('8.00'));
    expect(claim.toResponse().status).toBe('pending');
  });
});
