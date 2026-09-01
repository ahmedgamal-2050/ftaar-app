import { Money } from '../money/money';
import { LobbyBillEntity } from './lobby-bill.entity';

describe('LobbyBillEntity (BILL-01)', () => {
  it('maps BIGINT money through the transformer', () => {
    const entity = LobbyBillEntity.fromRow({
      id: '11111111-1111-4111-8111-111111111111',
      lobbyId: '22222222-2222-4222-8222-222222222222',
      subtotal: 1000n,
      tax: 50n,
      deliveryFee: 100n,
      serviceFee: 50n,
      discount: 25n,
      total: 1125n,
      receiptTotal: 1100n,
      paymentStatus: 'pending',
      idempotencyKey: 'k1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(entity.subtotal).toBeInstanceOf(Money);
    expect(entity.subtotal.toPiastres()).toBe(1000n);
    expect(entity.receiptTotal?.toPiastres()).toBe(1100n);
    expect(entity.lobbyId).toBe('22222222-2222-4222-8222-222222222222');
  });
});
